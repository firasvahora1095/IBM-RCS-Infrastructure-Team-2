"""Automatic release of fallback cases: nobody should have to click Make available.

Each test states a rule and proves it. The rules are in docs/ux/super-admin-rights-and-access.md.
"""

import asyncio
import os
import unittest
from datetime import datetime, timedelta, timezone

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite://")

import httpx
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.assignment import calculate_assignment_score
from app.auth import hash_password, session_store
from app.db import get_db
from app.fallback_queue import auto_release_at, fallback_hold_minutes, release_waiting_cases
from app.main import app
from app.models import AuditLog, Auditor, Base, Case

PASSWORD = "correct horse battery staple"
NOW = datetime.now(timezone.utc)


class AsgiClient:
    def get(self, path: str, **kwargs) -> httpx.Response:
        async def send() -> httpx.Response:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                return await client.get(path, **kwargs)

        return asyncio.run(send())

    def post(self, path: str, **kwargs) -> httpx.Response:
        async def send() -> httpx.Response:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                return await client.post(path, **kwargs)

        return asyncio.run(send())


class FallbackReleaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine("sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        cls.Session = sessionmaker(bind=cls.engine, autoflush=False, expire_on_commit=False)
        cls.password_hash = hash_password(PASSWORD, iterations=10_000)

        async def override_get_db():
            session = cls.Session()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = AsgiClient()

    @classmethod
    def tearDownClass(cls) -> None:
        app.dependency_overrides.clear()
        cls.engine.dispose()

    def setUp(self) -> None:
        Base.metadata.drop_all(self.engine)
        Base.metadata.create_all(self.engine)
        session_store.clear()
        os.environ["FALLBACK_HOLD_MINUTES"] = "5"  # most tests exercise a hold; the defaults have their own tests
        with self.Session.begin() as db:
            db.add_all(
                [
                    Auditor(auditor_id="superauditor-1", login_hash=self.password_hash, role="auditor", is_super_admin=True),
                    Auditor(auditor_id="auditor-1", login_hash=self.password_hash, role="auditor"),
                    Auditor(auditor_id="auditor-2", login_hash=self.password_hash, role="auditor"),
                    Auditor(auditor_id="manager-1", login_hash=self.password_hash, role="manager"),
                ]
            )

    def tearDown(self) -> None:
        os.environ.pop("FALLBACK_HOLD_MINUTES", None)

    def headers(self, staff_id: str) -> dict[str, str]:
        r = self.client.post("/api/staff/login", json={"staff_id": staff_id, "password": PASSWORD})
        return {"Authorization": f"Bearer {r.json()['token']}"}

    def park(self, case_id: str, *, minutes_ago: float = 10, flag=None, visibility="SUPER_ADMIN_ONLY", queued=True) -> None:
        with self.Session.begin() as db:
            db.add(
                Case(
                    case_id=case_id,
                    status="READY_FOR_REVIEW",
                    severity_tier="S2",
                    case_visibility=visibility,
                    manager_flag=flag,
                    created_at=NOW - timedelta(minutes=minutes_ago),
                    fallback_queued_at=(NOW - timedelta(minutes=minutes_ago)) if queued else None,
                )
            )

    def release(self) -> list[tuple[str, str]]:
        with self.Session.begin() as db:
            return release_waiting_cases(db)

    def owner(self, case_id: str):
        with self.Session() as db:
            return db.get(Case, case_id).assigned_auditor_id

    def set_auditor(self, auditor_id: str, **fields) -> None:
        with self.Session.begin() as db:
            a = db.get(Auditor, auditor_id)
            for k, v in fields.items():
                setattr(a, k, v)
            a.exposure_last_reset_at = a.exposure_last_reset_at or datetime.now(timezone.utc)

    # --- the hold ---------------------------------------------------------------

    def test_there_is_no_hold_by_default_and_one_can_be_configured(self) -> None:
        os.environ.pop("FALLBACK_HOLD_MINUTES", None)
        self.assertEqual(fallback_hold_minutes(), 0)
        os.environ["FALLBACK_HOLD_MINUTES"] = "5"
        self.assertEqual(fallback_hold_minutes(), 5)
        os.environ["FALLBACK_HOLD_MINUTES"] = "not a number"
        self.assertEqual(fallback_hold_minutes(), 0)

    def test_by_default_a_parked_case_is_placed_the_moment_someone_is_eligible(self) -> None:
        os.environ.pop("FALLBACK_HOLD_MINUTES", None)
        self.set_auditor("auditor-1", cooldown_ends_at=NOW + timedelta(minutes=20))
        self.set_auditor("auditor-2", exposure_minutes=120.0)
        self.park("NOW1", minutes_ago=0)
        self.assertEqual(self.release(), [])  # nobody eligible: it waits, visible to the Super Auditor
        self.set_auditor("auditor-1", cooldown_ends_at=None)
        self.assertEqual(self.release(), [("NOW1", "auditor-1")])  # no delay once someone is free

    def test_a_configured_hold_keeps_a_case_back_so_the_super_admin_gets_first_look(self) -> None:
        os.environ["FALLBACK_HOLD_MINUTES"] = "5"
        self.park("FRESH1", minutes_ago=2)
        self.assertEqual(self.release(), [])
        self.assertIsNone(self.owner("FRESH1"))

    def test_a_case_is_placed_once_the_hold_ends_and_a_standard_auditor_is_eligible(self) -> None:
        self.park("OLD1", minutes_ago=6)
        placed = self.release()
        self.assertEqual([c for c, _ in placed], ["OLD1"])
        self.assertIn(self.owner("OLD1"), {"auditor-1", "auditor-2"})
        with self.Session() as db:
            case = db.get(Case, "OLD1")
            self.assertEqual(case.case_visibility, "ASSIGNED_ONLY")
            entry = db.scalars(select(AuditLog).where(AuditLog.case_id == "OLD1", AuditLog.action == "CASE_ASSIGNED")).one()
        self.assertEqual((entry.actor, entry.after_value["via"]), ("system", "AUTO_RELEASE"))

    def test_the_super_admin_can_still_take_a_case_before_it_is_placed(self) -> None:
        self.park("FRESH1", minutes_ago=2)
        self.assertEqual(self.client.post("/api/auditor/cases/FRESH1/take", headers=self.headers("superauditor-1")).status_code, 200)
        self.assertEqual(self.release(), [])
        self.assertEqual(self.owner("FRESH1"), "superauditor-1")

    # --- same rule as normal assignment -------------------------------------------

    def test_placement_uses_the_weighted_rule_lightest_loaded_first(self) -> None:
        self.set_auditor("auditor-1", exposure_minutes=90.0)
        self.set_auditor("auditor-2", exposure_minutes=10.0)
        self.assertLess(
            calculate_assignment_score(active_case_count=0, exposure_minutes=10),
            calculate_assignment_score(active_case_count=0, exposure_minutes=90),
        )
        self.park("OLD1", minutes_ago=6)
        self.assertEqual(self.release(), [("OLD1", "auditor-2")])

    def test_several_waiting_cases_are_spread_not_piled_on_one_auditor(self) -> None:
        self.set_auditor("auditor-1", exposure_minutes=10.0)
        self.set_auditor("auditor-2", exposure_minutes=10.0)
        for i in range(4):
            self.park(f"OLD{i}", minutes_ago=20 - i)
        placed = self.release()
        owners = [a for _, a in placed]
        self.assertEqual(len(placed), 4)
        self.assertEqual(owners.count("auditor-1"), 2)
        self.assertEqual(owners.count("auditor-2"), 2)

    def test_oldest_waiting_case_is_placed_first(self) -> None:
        self.park("NEWER", minutes_ago=6)
        self.park("OLDER", minutes_ago=30)
        self.assertEqual([c for c, _ in self.release()], ["OLDER", "NEWER"])

    # --- wellbeing always wins --------------------------------------------------------

    def test_nobody_eligible_means_the_case_keeps_waiting(self) -> None:
        self.set_auditor("auditor-1", cooldown_ends_at=NOW + timedelta(minutes=20))
        self.set_auditor("auditor-2", exposure_minutes=120.0)
        self.park("OLD1", minutes_ago=30)
        self.assertEqual(self.release(), [])
        self.assertIsNone(self.owner("OLD1"))

    def test_an_auditor_with_an_open_sos_is_never_given_a_case(self) -> None:
        self.set_auditor("auditor-2", exposure_minutes=120.0)
        with self.Session.begin() as db:
            db.add(Case(case_id="SOS1", status="AUDITOR_REVIEW", assigned_auditor_id="auditor-1", manager_flag="SOS"))
        self.park("OLD1", minutes_ago=30)
        self.assertEqual(self.release(), [])

    def test_a_cooldown_that_has_ended_makes_the_auditor_eligible_again(self) -> None:
        self.set_auditor("auditor-1", cooldown_ends_at=NOW + timedelta(minutes=20))
        self.set_auditor("auditor-2", exposure_minutes=120.0)
        self.park("OLD1", minutes_ago=30)
        self.assertEqual(self.release(), [])
        self.set_auditor("auditor-1", cooldown_ends_at=NOW - timedelta(minutes=1))
        self.assertEqual(self.release(), [("OLD1", "auditor-1")])

    def test_the_super_admin_is_never_chosen_even_when_they_are_the_only_one_free(self) -> None:
        self.set_auditor("auditor-1", exposure_minutes=120.0)
        self.set_auditor("auditor-2", exposure_minutes=120.0)
        self.park("OLD1", minutes_ago=30)
        self.assertEqual(self.release(), [])
        self.assertIsNone(self.owner("OLD1"))

    # --- what it must leave alone --------------------------------------------------------

    def test_it_leaves_alone_cases_with_the_manager_released_for_claiming_or_never_parked(self) -> None:
        self.park("MGR1", minutes_ago=30, flag="DECLINED")
        self.park("POOL1", minutes_ago=30, visibility="AVAILABLE_TO_AUDITORS")
        self.park("DEMO1", minutes_ago=30, queued=False)
        self.assertEqual(self.release(), [])
        for case_id in ("MGR1", "POOL1", "DEMO1"):
            self.assertIsNone(self.owner(case_id), case_id)

    def test_a_case_that_already_has_an_owner_is_not_touched(self) -> None:
        self.park("OLD1", minutes_ago=30)
        self.client.post("/api/auditor/cases/OLD1/take", headers=self.headers("superauditor-1"))
        self.assertEqual(self.release(), [])
        self.assertEqual(self.owner("OLD1"), "superauditor-1")

    def test_running_it_twice_places_a_case_once(self) -> None:
        self.park("OLD1", minutes_ago=30)
        self.assertEqual(len(self.release()), 1)
        self.assertEqual(self.release(), [])

    # --- it happens without anyone asking --------------------------------------------------

    def test_opening_the_fallback_queue_places_due_cases_first(self) -> None:
        self.park("OLD1", minutes_ago=30)
        rows = self.client.get("/api/auditor/all-cases", headers=self.headers("superauditor-1")).json()
        row = next(r for r in rows if r["case_id"] == "OLD1")
        self.assertIn(row["assigned_auditor_id"], {"auditor-1", "auditor-2"})
        self.assertIsNone(row["auto_release_at"])

    def test_a_standard_auditor_opening_their_queue_gets_the_case_without_any_click(self) -> None:
        self.set_auditor("auditor-2", exposure_minutes=120.0)
        self.park("OLD1", minutes_ago=30)
        mine = self.client.get("/api/auditor/cases", headers=self.headers("auditor-1")).json()
        self.assertEqual([c["case_id"] for c in mine], ["OLD1"])

    def test_the_queue_says_when_a_case_will_be_placed_so_nobody_has_to_watch_it(self) -> None:
        self.park("FRESH1", minutes_ago=2)
        rows = self.client.get("/api/auditor/all-cases", headers=self.headers("superauditor-1")).json()
        row = next(r for r in rows if r["case_id"] == "FRESH1")
        due = datetime.fromisoformat(row["auto_release_at"])
        self.assertAlmostEqual((due - (NOW - timedelta(minutes=2))).total_seconds(), 5 * 60, delta=2)
        self.assertIsNotNone(auto_release_at(self.case_obj("FRESH1")))

    def case_obj(self, case_id: str) -> Case:
        with self.Session() as db:
            return db.get(Case, case_id)

    def test_a_report_made_while_nobody_is_free_is_placed_automatically_once_someone_is(self) -> None:
        os.environ["FALLBACK_HOLD_MINUTES"] = "0"
        self.set_auditor("auditor-1", cooldown_ends_at=NOW + timedelta(minutes=1))
        self.set_auditor("auditor-2", exposure_minutes=120.0)
        with self.Session.begin() as db:
            from app.fallback_queue import mark_fallback

            db.add(Case(case_id="NEW1", status="SUBMITTED"))
            db.flush()
            mark_fallback(db, db.get(Case, "NEW1"))
        self.assertEqual(self.release(), [])
        self.set_auditor("auditor-1", cooldown_ends_at=None)
        self.assertEqual(self.release(), [("NEW1", "auditor-1")])


if __name__ == "__main__":
    unittest.main()
