"""The demo data leaves one result of each kind waiting for the client, so Needs action can be shown end to end."""
import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite://")

from datetime import datetime, timezone

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.b2b_seed import seed_b2b
from app.models import Base, Delivery


def test_needs_action_shows_a_violation_a_clear_post_and_one_not_reviewed():
    engine = create_engine("sqlite+pysqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        seed_b2b(db, datetime.now(timezone.utc), [], "pw")
        db.flush()
        waiting = [
            d for d in db.scalars(select(Delivery)).all() if d.delivery_status == "SUCCESS" and not d.platform_action
        ]
        assert {"POLICY_VIOLATION_FOUND", "NO_VIOLATION_FOUND", "CLOSED_NO_REASSIGNMENT"} <= {d.outcome for d in waiting}
