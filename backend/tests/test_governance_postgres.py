"""Opt-in isolated PostgreSQL acceptance checks; never use a deployment DB.
GOVERNANCE_TEST_POSTGRES_ADMIN_URL must explicitly identify a local test server.
"""
import io
import json
import os
from pathlib import Path
from uuid import uuid4
import pytest
from sqlalchemy import create_engine, text
from app.migrations import migrate
from scripts import database_backup

@pytest.fixture
def postgres():
    url = os.getenv("GOVERNANCE_TEST_POSTGRES_ADMIN_URL")
    if not url:
        pytest.skip("Set GOVERNANCE_TEST_POSTGRES_ADMIN_URL for isolated PostgreSQL checks")
    admin = create_engine(url, isolation_level="AUTOCOMMIT")
    names = []
    def create():
        name = "rcs_gov_test_" + uuid4().hex[:12]
        with admin.connect() as c: c.execute(text(f'CREATE DATABASE "{name}"'))
        names.append(name)
        return admin.url.set(database=name)
    yield create
    with admin.connect() as c:
        for name in names: c.execute(text(f'DROP DATABASE "{name}" WITH (FORCE)'))
    admin.dispose()

class MemoryCOS:
    def __init__(self): self.objects = {}
    def upload_file(self, filename, bucket, key): self.objects[key] = Path(filename).read_bytes()
    def put_object(self, Bucket, Key, Body, **kwargs): self.objects[Key] = Body
    def get_object(self, Bucket, Key): return {"Body": io.BytesIO(self.objects[Key])}
    def download_file(self, bucket, key, filename): Path(filename).write_bytes(self.objects[key])


def test_legacy_migration_and_full_backup_restore(postgres, monkeypatch):
    source, target, corrupt_target = postgres(), postgres(), postgres()
    engine = create_engine(source)
    # A realistic pre-governance schema: existing core and historical demo floats.
    with engine.begin() as c:
        c.exec_driver_sql((Path(__file__).parents[1] / "schemas/db_schema.sql").read_text())
        c.execute(text("ALTER TABLE auditors ALTER COLUMN exposure_minutes TYPE INTEGER"))
        c.execute(text("CREATE TABLE governance_log(entry_id VARCHAR(20) PRIMARY KEY, case_id VARCHAR(20) NOT NULL, at TIMESTAMPTZ NOT NULL, model_id VARCHAR(100) NOT NULL, model_version VARCHAR(30) NOT NULL, prompt_version VARCHAR(50) NOT NULL, success INTEGER NOT NULL, prompt_leakage FLOAT NOT NULL, source_attribution FLOAT NOT NULL, accumulated_score FLOAT NOT NULL, tokens_in INTEGER NOT NULL, tokens_out INTEGER NOT NULL, reasoning TEXT)"))
        c.execute(text("INSERT INTO cases(case_id,status) VALUES ('OLD-CASE','SUBMITTED')"))
        c.execute(text("INSERT INTO audit_logs(case_id,actor,action) VALUES ('OLD-CASE','system','CASE_CREATED')"))
        c.execute(text("INSERT INTO governance_log VALUES ('GOV-OLD','OLD-CASE',now(),'mock','mock','mock',1,.9,.8,.85,10,20,NULL)"))
    migrate(engine); migrate(engine)
    with engine.connect() as c:
        row = c.execute(text("SELECT schema_version,context,legacy_prompt_leakage,legacy_source_attribution,legacy_accumulated_score,accumulated_score,source_attribution FROM governance_log")).one()
        assert tuple(row) == (1,"demo",.9,.8,.85,None,None)
        assert c.scalar(text("SELECT count(*) FROM audit_logs")) == 1
    client = MemoryCOS()
    monkeypatch.setattr(database_backup, "cos_configuration", lambda: (client,"test-bucket","test-backups"))
    monkeypatch.setenv("DATABASE_URL", source.render_as_string(hide_password=False))
    monkeypatch.setenv("BACKUP_RESTORE_DATABASE_URL", target.render_as_string(hide_password=False))
    manifest = database_backup.backup()
    database_backup.restore(manifest, True)
    restored = create_engine(target)
    with restored.connect() as c:
        assert c.scalar(text("SELECT count(*) FROM audit_logs")) == 1
        assert c.scalar(text("SELECT case_id FROM cases")) == "OLD-CASE"
        assert c.scalar(text("SELECT legacy_accumulated_score FROM governance_log")) == .85
    with pytest.raises(ValueError, match="contains tables"):
        database_backup.restore(manifest, True)
    monkeypatch.setenv("BACKUP_RESTORE_DATABASE_URL", corrupt_target.render_as_string(hide_password=False))
    dump_key = json.loads(client.objects[manifest])["dump_key"]
    client.objects[dump_key] = b"corrupt"
    with pytest.raises(ValueError, match="checksum"):
        database_backup.restore(manifest, True)
    clean = create_engine(corrupt_target)
    migrate(clean); migrate(clean)
    clean.dispose(); engine.dispose(); restored.dispose()
