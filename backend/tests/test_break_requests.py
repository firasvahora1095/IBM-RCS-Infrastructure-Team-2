"""An approved break lasts a fixed time, blocks new cases while it runs, and ends by itself (app/breaks.py)."""

import asyncio
import os
import unittest
from datetime import datetime, timedelta, timezone

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite://")

import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.assignment import list_assignment_candidates
from app.auth import hash_password, session_store
from app.breaks import BREAK_MINUTES, break_ends_at
from app.db import get_db
from app.fallback_queue import unavailable_reason
from app.main import app
from app.models import Auditor, Base, Case, WellbeingRequest

PASSWORD = "correct horse battery staple"


class AsgiClient:
    def request(self, method: str, path: str, **kwargs) -> httpx.Response:
        async def send() -> httpx.Response:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                return await client.request(method, path, **kwargs)

        return asyncio.run(send())

    def get(self, path: str, **kwargs):
        return self.request("GET", path, **kwargs)

    def post(self, path: str, **kwargs):
        return self.request("POST", path, **kwargs)


class BreakRequestTests(unittest.TestCase):
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
        with self.Session.begin() as db:
            db.add_all(
                [
                    Auditor(auditor_id="auditor-1", login_hash=self.password_hash, role="auditor"),
                    Auditor(auditor_id="auditor-2", login_hash=self.password_hash, role="auditor"),
                    Auditor(auditor_id="manager-1", login_hash=self.password_hash, role="manager"),
                ]
            )

    def headers(self, staff_id: str) -> dict[str, str]:
        response = self.client.post("/api/staff/login", json={"staff_id": staff_id, "password": PASSWORD})
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": f"Bearer {response.json()['token']}"}

    def approved_break(self, auditor_id: str, minutes_ago: float = 0, request_id: str = "WB-test0001") -> None:
        """A break the Manager approved `minutes_ago` minutes ago."""
        with self.Session.begin() as db:
            db.add(
                WellbeingRequest(
                    request_id=request_id,
                    auditor_id=auditor_id,
                    kind="BREAK_REQUEST",
                    status="APPROVED",
                    created_at=datetime.now(timezone.utc) - timedelta(minutes=minutes_ago + 2),
                    resolved_at=datetime.now(timezone.utc) - timedelta(minutes=minutes_ago),
                )
            )

    # --- the rule -------------------------------------------------------------

    def test_a_break_lasts_fifteen_minutes_from_approval(self) -> None:
        self.assertEqual(BREAK_MINUTES, 15)
        self.approved_break("auditor-1", minutes_ago=0)
        with self.Session() as db:
            ends = break_ends_at(db, "auditor-1")
        self.assertIsNotNone(ends)
        left = (ends - datetime.now(timezone.utc)).total_seconds() / 60
        self.assertAlmostEqual(left, 15, delta=0.5)

    def test_a_break_ends_by_itself(self) -> None:
        self.approved_break("auditor-1", minutes_ago=BREAK_MINUTES + 1)
        with self.Session() as db:
            self.assertIsNone(break_ends_at(db, "auditor-1"))

    def test_the_demo_seeds_break_is_long_over(self) -> None:
        """The seed approves auditor-2's break 88 minutes before it runs. It used to read as "on a break" until midnight
        while the Auditor kept receiving cases; now it is over, and they are shown and treated as available."""
        self.approved_break("auditor-2", minutes_ago=88, request_id="WB-demo0003")
        with self.Session() as db:
            self.assertIsNone(break_ends_at(db, "auditor-2"))
            self.assertIn("auditor-2", {c.auditor_id for c in list_assignment_candidates(db)})
        rows = self.client.get("/api/manager/auditors", headers=self.headers("manager-1")).json()
        rows = rows if isinstance(rows, list) else rows.get("auditors", rows)
        row = next(r for r in rows if r["auditor_id"] == "auditor-2")
        self.assertFalse(row["open_requests"]["on_break"])

    def test_a_request_that_is_still_waiting_is_not_a_break(self) -> None:
        with self.Session.begin() as db:
            db.add(WellbeingRequest(request_id="WB-open0001", auditor_id="auditor-1", kind="BREAK_REQUEST", status="OPEN",
                                    created_at=datetime.now(timezone.utc)))
        with self.Session() as db:
            self.assertIsNone(break_ends_at(db, "auditor-1"))

    # --- no new cases during a break -------------------------------------------

    def test_an_auditor_on_a_break_is_not_chosen_for_new_cases(self) -> None:
        self.approved_break("auditor-1")
        with self.Session() as db:
            ids = {c.auditor_id for c in list_assignment_candidates(db)}
        self.assertEqual(ids, {"auditor-2"})

    def test_they_are_chosen_again_once_the_break_is_over(self) -> None:
        self.approved_break("auditor-1", minutes_ago=BREAK_MINUTES + 1)
        with self.Session() as db:
            ids = {c.auditor_id for c in list_assignment_candidates(db)}
        self.assertEqual(ids, {"auditor-1", "auditor-2"})

    def test_a_break_blocks_claiming_and_taking_a_case_and_says_how_long_is_left(self) -> None:
        self.approved_break("auditor-1")
        with self.Session() as db:
            reason = unavailable_reason(db, db.get(Auditor, "auditor-1"))
        self.assertIsNotNone(reason)
        self.assertIn("on a break", reason)
        self.assertIn("15 minutes", reason)

    def test_the_manager_cannot_reassign_a_case_to_someone_on_a_break(self) -> None:
        with self.Session.begin() as db:
            db.add(Case(case_id="AR-2026-00900", assigned_auditor_id="auditor-2", status="AUDITOR_REVIEW",
                        severity_tier="S2", manager_flag="DECLINED"))
        self.approved_break("auditor-1")
        manager = self.headers("manager-1")
        context = self.client.get("/api/manager/cases/AR-2026-00900/reassignment", headers=manager)
        if context.status_code == 200:
            row = next(c for c in context.json()["candidates"] if c["auditor_id"] == "auditor-1")
            self.assertFalse(row["available"])
        response = self.client.post("/api/manager/cases/AR-2026-00900/reassign", headers=manager, json={"auditor_id": "auditor-1"})
        self.assertEqual(response.status_code, 409, response.text)
        self.assertIn("break", response.json()["detail"])

    # --- what each person sees ---------------------------------------------------

    def test_the_auditor_is_told_when_the_break_ends(self) -> None:
        self.approved_break("auditor-1")
        body = self.client.get("/api/auditor/wellbeing", headers=self.headers("auditor-1")).json()
        self.assertIsNotNone(body["break_ends_at"])
        none = self.client.get("/api/auditor/wellbeing", headers=self.headers("auditor-2")).json()
        self.assertIsNone(none["break_ends_at"])

    def test_the_manager_sees_who_is_on_a_break_and_until_when(self) -> None:
        self.approved_break("auditor-1")
        rows = self.client.get("/api/manager/auditors", headers=self.headers("manager-1")).json()
        rows = rows if isinstance(rows, list) else rows.get("auditors", rows)
        mine = next(r for r in rows if r["auditor_id"] == "auditor-1")
        self.assertTrue(mine["open_requests"]["on_break"])
        self.assertIsNotNone(mine["open_requests"]["break_ends_at"])
        self.assertFalse(next(r for r in rows if r["auditor_id"] == "auditor-2")["open_requests"]["on_break"])

    def test_once_it_is_over_the_manager_sees_them_as_available_again(self) -> None:
        self.approved_break("auditor-1", minutes_ago=BREAK_MINUTES + 1)
        rows = self.client.get("/api/manager/auditors", headers=self.headers("manager-1")).json()
        rows = rows if isinstance(rows, list) else rows.get("auditors", rows)
        mine = next(r for r in rows if r["auditor_id"] == "auditor-1")
        self.assertFalse(mine["open_requests"]["on_break"])


if __name__ == "__main__":
    unittest.main()
