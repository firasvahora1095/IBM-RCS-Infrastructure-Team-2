"""The whole CommunityHub client flow, end to end, on the real demo data (not hand-built fixtures)."""

import asyncio
import os
import unittest
from datetime import datetime, timezone

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite://")

import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import hash_password, session_store
from app.b2b import client_login_limiter, client_session_store
from app.b2b_seed import seed_b2b
from app.db import get_db
from app.main import app
from app.models import Auditor, Base
from app.rate_limit import status_lookup_limiter

PASSWORD = "correct horse battery staple"


class Api:
    def request(self, method: str, path: str, **kwargs) -> httpx.Response:
        async def send() -> httpx.Response:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                return await client.request(method, path, **kwargs)

        return asyncio.run(send())

    def get(self, path, **kw):
        return self.request("GET", path, **kw)

    def post(self, path, **kw):
        return self.request("POST", path, **kw)


class ClientFlowOnDemoData(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(
            "sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        cls.Session = sessionmaker(bind=cls.engine, autoflush=False, expire_on_commit=False)

        async def override_get_db():
            session = cls.Session()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.api = Api()

    @classmethod
    def tearDownClass(cls) -> None:
        app.dependency_overrides.clear()
        cls.engine.dispose()

    def setUp(self) -> None:
        Base.metadata.drop_all(self.engine)
        Base.metadata.create_all(self.engine)
        session_store.clear()
        client_session_store.clear()
        client_login_limiter.clear()
        status_lookup_limiter.clear()
        with self.Session.begin() as db:
            db.add(Auditor(auditor_id="manager-1", login_hash=hash_password(PASSWORD, iterations=10_000), role="manager"))
            db.flush()
            seed_b2b(db, datetime.now(timezone.utc), [], PASSWORD)

    def client_headers(self, user_id: str) -> dict[str, str]:
        r = self.api.post("/api/client/login", json={"user_id": user_id, "password": PASSWORD})
        self.assertEqual(r.status_code, 200, r.text)
        return {"Authorization": f"Bearer {r.json()['token']}"}

    def manager_headers(self) -> dict[str, str]:
        r = self.api.post("/api/staff/login", json={"staff_id": "manager-1", "password": PASSWORD})
        self.assertEqual(r.status_code, 200, r.text)
        return {"Authorization": f"Bearer {r.json()['token']}"}

    # ---- Case results: the moderator's flow ----

    def test_moderator_sees_every_kind_waiting_and_clears_them(self) -> None:
        mod = self.client_headers("ch-mod-04")
        results = self.api.get("/api/client/case-results", headers=mod).json()
        summary = self.api.get("/api/client/case-results/summary", headers=mod).json()

        delivered = [r for r in results if r["status"] == "DELIVERED"]
        waiting = [r for r in delivered if not r["platform_action"]]
        # The summary agrees with the list it summarises.
        self.assertEqual(summary["delivered"], len(delivered))
        self.assertEqual(summary["needs_action"], len(waiting))
        self.assertEqual(summary["actioned"], len(delivered) - len(waiting))
        # The demo leaves a violation, a clear post and a not-reviewed result waiting.
        for outcome in ("POLICY_VIOLATION_FOUND", "NO_VIOLATION_FOUND", "CLOSED_NO_REASSIGNMENT"):
            self.assertGreater(summary["needs_action_by_outcome"][outcome], 0, outcome)
        self.assertEqual(sum(summary["needs_action_by_outcome"].values()), summary["needs_action"])
        self.assertTrue(all(0 <= summary[k] <= 1 for k in ("violation_rate", "removal_rate", "actioned_rate")))

        # "Apply RCS decisions": a violation is removed, a clear post is kept, a not-reviewed one is left.
        for r in waiting:
            if r["outcome"] == "CLOSED_NO_REASSIGNMENT":
                continue
            action = "REMOVED" if r["outcome"] == "POLICY_VIOLATION_FOUND" else "KEPT"
            done = self.api.post(f"/api/client/case-results/{r['delivery_id']}/action", json={"action": action}, headers=mod)
            self.assertEqual(done.status_code, 200, done.text)
        after = self.api.get("/api/client/case-results/summary", headers=mod).json()
        self.assertEqual(after["needs_action"], summary["needs_action_by_outcome"]["CLOSED_NO_REASSIGNMENT"])
        self.assertEqual(after["actioned"], summary["actioned"] + len(waiting) - after["needs_action"])
        self.assertEqual(after["needs_action_by_outcome"]["CLOSED_NO_REASSIGNMENT"], after["needs_action"])

    def test_a_client_cannot_see_or_action_another_clients_results(self) -> None:
        from sqlalchemy import select

        from app.models import Delivery

        mod = self.client_headers("ch-mod-04")
        mine = {r["delivery_id"] for r in self.api.get("/api/client/case-results", headers=mod).json()}
        with self.Session() as db:
            others = [d.delivery_id for d in db.scalars(select(Delivery)).all() if d.organisation_id != "COMMUNITYHUB"]
        self.assertTrue(others, "the demo has other clients with results")
        self.assertFalse(mine & set(others))
        refused = self.api.post(f"/api/client/case-results/{others[0]}/action", json={"action": "REMOVED"}, headers=mod)
        self.assertEqual(refused.status_code, 404)

    # ---- Roles ----

    def test_each_role_reaches_only_its_own_sections(self) -> None:
        reports_user = self.client_headers("ch-user-17")
        mod = self.client_headers("ch-mod-04")
        admin = self.client_headers("ch-admin-01")
        for path, who, expected in [
            ("/api/client/reports", reports_user, 200),
            ("/api/client/case-results", reports_user, 403),
            ("/api/client/case-results/summary", reports_user, 403),
            ("/api/client/reports", mod, 403),
            ("/api/client/case-results/summary", mod, 200),
            ("/api/client/reports", admin, 200),
            ("/api/client/case-results/summary", admin, 200),
            ("/api/client/messages", reports_user, 200),
            ("/api/client/messages", mod, 200),
        ]:
            self.assertEqual(self.api.get(path, headers=who).status_code, expected, path)
        self.assertEqual(self.api.get("/api/client/case-results/summary").status_code in (401, 403), True)

    # ---- Reports ----

    def test_reports_list_open_and_download_are_recorded(self) -> None:
        user = self.client_headers("ch-user-17")
        reports = self.api.get("/api/client/reports", headers=user).json()
        self.assertGreater(len(reports), 0)
        self.assertTrue(all(r["status"] == "RELEASED" for r in reports))  # drafts are never shown to a client
        rid = reports[0]["report_id"]
        one = self.api.get(f"/api/client/reports/{rid}", headers=user)
        self.assertEqual(one.status_code, 200)
        self.assertIn("metrics", one.json())
        self.assertEqual(self.api.post(f"/api/client/reports/{rid}/download", headers=user).status_code, 200)

    # ---- Messages: send, Manager replies, client sees the answer ----

    def test_message_goes_to_the_manager_and_the_answer_comes_back(self) -> None:
        user = self.client_headers("ch-user-17")
        sent = self.api.post(
            "/api/client/messages",
            json={"topic": "REPORT_QUESTION", "subject": "Question about March", "body": "Why did violations rise?"},
            headers=user,
        )
        self.assertEqual(sent.status_code, 200, sent.text)
        message_id = sent.json()["message_id"]
        self.assertEqual(sent.json()["status"], "SENT")

        manager = self.manager_headers()
        inbox = self.api.get("/api/manager/messages", headers=manager).json()
        self.assertIn(message_id, {m["message_id"] for m in inbox})
        opened = self.api.get(f"/api/manager/messages/{message_id}", headers=manager)  # opening marks it seen
        self.assertEqual(opened.status_code, 200)
        self.assertEqual(self.api.get(f"/api/client/messages/{message_id}", headers=user).json()["status"], "SEEN")

        reply = self.api.post(f"/api/manager/messages/{message_id}/reply", json={"body": "Volume rose in March."}, headers=manager)
        self.assertEqual(reply.status_code, 200, reply.text)
        answered = self.api.get(f"/api/client/messages/{message_id}", headers=user).json()
        self.assertEqual(answered["status"], "ANSWERED")
        statuses = {m["message_id"]: m["status"] for m in self.api.get("/api/client/messages", headers=user).json()}
        self.assertEqual(statuses[message_id], "ANSWERED")


if __name__ == "__main__":
    unittest.main()
