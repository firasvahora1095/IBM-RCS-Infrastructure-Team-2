"""Versioned PostgreSQL migrations. Never seed or delete application data."""
from pathlib import Path
from sqlalchemy import inspect, text
from sqlalchemy.schema import CreateColumn
from app.models import Base

VERSION = 2


def migrate(engine):
    if engine.dialect.name != "postgresql":
        raise RuntimeError("Production migrations require PostgreSQL")
    with engine.begin() as connection:
        connection.execute(text("SELECT pg_advisory_xact_lock(72100831)"))
        connection.execute(text("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"))
        if connection.scalar(text("SELECT 1 FROM schema_migrations WHERE version=:version"), {"version": VERSION}):
            return
        # Preserve the historical bootstrap and its non-destructive core upgrades.
        sql = (Path(__file__).resolve().parents[1] / "schemas/db_schema.sql").read_text()
        connection.exec_driver_sql(sql)
        tables = inspect(connection).get_table_names()
        legacy = False
        if "governance_log" in tables:
            columns = {c["name"] for c in inspect(connection).get_columns("governance_log")}
            legacy = "schema_version" not in columns
            for original in ("prompt_leakage", "source_attribution", "accumulated_score"):
                if legacy and original in columns:
                    connection.execute(text(f"ALTER TABLE governance_log RENAME COLUMN {original} TO legacy_{original}"))
            connection.execute(text("ALTER TABLE governance_log ALTER COLUMN entry_id TYPE VARCHAR(36)"))
            connection.execute(text("ALTER TABLE governance_log ALTER COLUMN model_version TYPE VARCHAR(100)"))
            for name in ("model_version", "tokens_in", "tokens_out", "success", "case_id"):
                connection.execute(text(f"ALTER TABLE governance_log ALTER COLUMN {name} DROP NOT NULL"))
            for name in ("legacy_prompt_leakage", "legacy_source_attribution", "legacy_accumulated_score"):
                if name in {c["name"] for c in inspect(connection).get_columns("governance_log")}:
                    connection.execute(text(f"ALTER TABLE governance_log ALTER COLUMN {name} DROP NOT NULL"))
        # Existing tables need explicit ALTER; create_all only creates missing tables.
        Base.metadata.create_all(connection)
        for table in Base.metadata.sorted_tables:
            present = {c["name"] for c in inspect(connection).get_columns(table.name)}
            for column in table.columns:
                if column.name not in present:
                    declaration = str(CreateColumn(column).compile(dialect=connection.dialect))
                    connection.execute(text(f"ALTER TABLE {table.name} ADD COLUMN {declaration}"))
        # Retrofitting a preexisting table needs explicit constraints, not create_all.
        existing_constraints = {c["name"] for c in inspect(connection).get_check_constraints("governance_log")}
        for constraint in Base.metadata.tables["governance_log"].constraints:
            if getattr(constraint, "sqltext", None) is not None and constraint.name not in existing_constraints:
                connection.execute(text(f"ALTER TABLE governance_log ADD CONSTRAINT {constraint.name} CHECK ({constraint.sqltext}) NOT VALID"))
        if not any(fk["constrained_columns"] == ["run_id"] for fk in inspect(connection).get_foreign_keys("governance_log")):
            connection.execute(text("ALTER TABLE governance_log ADD CONSTRAINT fk_governance_run FOREIGN KEY(run_id) REFERENCES analysis_runs(run_id) ON DELETE RESTRICT"))
        if legacy:
            connection.execute(text("UPDATE governance_log SET schema_version=1, context='demo', outcome='LEGACY_DEMO', prompt_leakage_status='NOT_CHECKED', accumulated_score=NULL"))
        for name in ("ck_governance_context", "ck_governance_outcome", "ck_governance_leakage"):
            connection.execute(text(f"ALTER TABLE governance_log VALIDATE CONSTRAINT {name}"))
        for name, columns in (("idx_governance_run", "run_id"), ("idx_governance_case_time", "case_id, at")):
            connection.execute(text(f"CREATE INDEX IF NOT EXISTS {name} ON governance_log ({columns})"))
        connection.execute(text("INSERT INTO schema_migrations(version) VALUES (:version)"), {"version": VERSION})


if __name__ == "__main__":
    from app.db import engine
    migrate(engine)
