import asyncio
import os
import shutil
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite://")

import httpx
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.assignment import list_assignment_candidates
from app.fallback_queue import release_waiting_cases
from app.auth import hash_password, session_store
from app.db import get_db
from app.main import app
from app.models import AuditLog, Auditor, Base, Case

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


WEBM = bytes.fromhex("1A45DFA3") + b"webm-data"


class FallbackQueueTests(unittest.TestCase):
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
        os.environ["VIDEO_STORAGE_BACKEND"] = "local"
        os.environ["ORCHESTRATE_MODE"] = "mock"
        self.upload_root = Path(tempfile.mkdtemp(prefix="ibm-rcs-fallback-tests-"))
        os.environ["VIDEO_STORAGE_DIRECTORY"] = str(self.upload_root)
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
        shutil.rmtree(self.upload_root)

    def headers(self, staff_id: str) -> dict[str, str]:
        response = self.client.post("/api/staff/login", json={"staff_id": staff_id, "password": PASSWORD})
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": f"Bearer {response.json()['token']}"}

    def add_case(self, case_id: str, *, owner=None, visibility="ASSIGNED_ONLY", status="READY_FOR_REVIEW", tier="S2", flag=None):
        with self.Session.begin() as db:
            db.add(
                Case(case_id=case_id, assigned_auditor_id=owner, case_visibility=visibility, status=status, severity_tier=tier, manager_flag=flag)
            )

    def put_in_cooldown(self, auditor_id: str) -> None:
        with self.Session.begin() as db:
            db.get(Auditor, auditor_id).cooldown_ends_at = datetime.now(timezone.utc) + timedelta(minutes=30)

    def put_at_limit(self, auditor_id: str) -> None:
        with self.Session.begin() as db:
            a = db.get(Auditor, auditor_id)
            a.exposure_minutes = 120
            a.exposure_last_reset_at = datetime.now(timezone.utc)

    def case(self, case_id: str) -> Case:
        with self.Session() as db:
            return db.get(Case, case_id)

    def upload(self):
        return self.client.post("/api/reports", files={"video": ("evidence.webm", WEBM, "video/webm")})

    # --- login flag and the weighted pool -----------------------------------

    def test_login_says_who_is_the_super_admin(self) -> None:
        sa = self.client.post("/api/staff/login", json={"staff_id": "superauditor-1", "password": PASSWORD}).json()
        std = self.client.post("/api/staff/login", json={"staff_id": "auditor-1", "password": PASSWORD}).json()
        mgr = self.client.post("/api/staff/login", json={"staff_id": "manager-1", "password": PASSWORD}).json()
        self.assertEqual((sa["role"], sa["is_super_admin"]), ("auditor", True))
        self.assertFalse(std["is_super_admin"])
        self.assertFalse(mgr["is_super_admin"])

    def test_super_admin_is_never_in_the_weighted_pool(self) -> None:
        with self.Session() as db:
            ids = {c.auditor_id for c in list_assignment_candidates(db)}
        self.assertEqual(ids, {"auditor-1", "auditor-2"})

    # --- no eligible Auditor: the report is kept ------------------------------

    def test_normal_report_is_assigned_to_a_standard_auditor_and_stays_assigned_only(self) -> None:
        response = self.upload()
        self.assertEqual(response.status_code, 201, response.text)
        case = self.case(response.json()["case_id"])
        self.assertIn(case.assigned_auditor_id, {"auditor-1", "auditor-2"})
        self.assertEqual(case.case_visibility, "ASSIGNED_ONLY")

    def test_report_is_kept_for_the_super_admin_when_no_standard_auditor_is_eligible(self) -> None:
        self.put_in_cooldown("auditor-1")
        self.put_at_limit("auditor-2")
        response = self.upload()
        self.assertEqual(response.status_code, 201, response.text)
        case = self.case(response.json()["case_id"])
        self.assertIsNone(case.assigned_auditor_id)
        self.assertEqual(case.case_visibility, "SUPER_ADMIN_ONLY")
        with self.Session() as db:
            actions = [a.action for a in db.scalars(select(AuditLog).where(AuditLog.case_id == case.case_id))]
        self.assertIn("CASE_FALLBACK_QUEUED", actions)
        # ...and the upload itself was kept, not deleted
        self.assertTrue(any(self.upload_root.iterdir()))

    def test_super_admin_sees_the_fallback_case_but_standard_auditors_do_not(self) -> None:
        self.put_in_cooldown("auditor-1")
        self.put_at_limit("auditor-2")
        case_id = self.upload().json()["case_id"]
        seen = self.client.get("/api/auditor/all-cases", headers=self.headers("superauditor-1")).json()
        self.assertIn(case_id, [c["case_id"] for c in seen])
        available = self.client.get("/api/auditor/available-cases", headers=self.headers("auditor-1")).json()
        self.assertEqual(available["cases"], [])

    # --- who may see all cases -------------------------------------------------

    def test_super_admin_sees_every_open_case_with_its_owner_and_visibility(self) -> None:
        self.add_case("OWNED1", owner="auditor-1")
        self.add_case("FREE1", visibility="SUPER_ADMIN_ONLY")
        self.add_case("DONE1", owner="auditor-2", status="COMPLETE")
        rows = {c["case_id"]: c for c in self.client.get("/api/auditor/all-cases", headers=self.headers("superauditor-1")).json()}
        self.assertEqual(set(rows), {"OWNED1", "FREE1"})
        self.assertEqual(rows["OWNED1"]["assigned_auditor_id"], "auditor-1")
        self.assertEqual(rows["FREE1"]["case_visibility"], "SUPER_ADMIN_ONLY")

    def test_only_the_super_admin_can_list_all_cases(self) -> None:
        self.assertEqual(self.client.get("/api/auditor/all-cases", headers=self.headers("auditor-1")).status_code, 403)
        self.assertEqual(self.client.get("/api/auditor/all-cases", headers=self.headers("manager-1")).status_code, 403)
        self.assertEqual(self.client.get("/api/auditor/all-cases").status_code, 401)

    def test_seeing_a_case_does_not_let_the_super_admin_open_it(self) -> None:
        self.add_case("OWNED1", owner="auditor-1")
        r = self.client.get("/api/auditor/cases/OWNED1", headers=self.headers("superauditor-1"))
        self.assertEqual(r.status_code, 404)

    # --- take ------------------------------------------------------------------

    def test_super_admin_takes_an_unowned_case(self) -> None:
        self.add_case("FREE1", visibility="SUPER_ADMIN_ONLY")
        r = self.client.post("/api/auditor/cases/FREE1/take", headers=self.headers("superauditor-1"))
        self.assertEqual(r.status_code, 200, r.text)
        case = self.case("FREE1")
        self.assertEqual((case.assigned_auditor_id, case.case_visibility), ("superauditor-1", "ASSIGNED_ONLY"))
        mine = self.client.get("/api/auditor/cases", headers=self.headers("superauditor-1")).json()
        self.assertEqual([c["case_id"] for c in mine], ["FREE1"])

    def test_take_does_not_steal_a_case_a_standard_auditor_owns(self) -> None:
        self.add_case("OWNED1", owner="auditor-1")
        r = self.client.post("/api/auditor/cases/OWNED1/take", headers=self.headers("superauditor-1"))
        self.assertEqual(r.status_code, 409)
        self.assertEqual(self.case("OWNED1").assigned_auditor_id, "auditor-1")

    def test_super_admin_is_protected_too(self) -> None:
        self.add_case("FREE1", visibility="SUPER_ADMIN_ONLY")
        self.put_in_cooldown("superauditor-1")
        r = self.client.post("/api/auditor/cases/FREE1/take", headers=self.headers("superauditor-1"))
        self.assertEqual(r.status_code, 409)
        self.assertIn("cooldown", r.json()["detail"])
        self.assertIsNone(self.case("FREE1").assigned_auditor_id)

    def test_standard_auditors_cannot_take(self) -> None:
        self.add_case("FREE1", visibility="SUPER_ADMIN_ONLY")
        r = self.client.post("/api/auditor/cases/FREE1/take", headers=self.headers("auditor-1"))
        self.assertEqual(r.status_code, 403)

    # --- make available and claim ---------------------------------------------

    def test_super_admin_and_manager_can_make_a_case_available(self) -> None:
        self.add_case("FREE1", visibility="SUPER_ADMIN_ONLY")
        self.add_case("FREE2", visibility="SUPER_ADMIN_ONLY")
        self.assertEqual(self.client.post("/api/cases/FREE1/make-available", headers=self.headers("superauditor-1")).status_code, 200)
        self.assertEqual(self.client.post("/api/cases/FREE2/make-available", headers=self.headers("manager-1")).status_code, 200)
        self.assertEqual(self.case("FREE1").case_visibility, "AVAILABLE_TO_AUDITORS")
        self.assertEqual(self.case("FREE2").case_visibility, "AVAILABLE_TO_AUDITORS")
        with self.Session() as db:
            actors = {a.actor for a in db.scalars(select(AuditLog).where(AuditLog.action == "CASE_MADE_AVAILABLE"))}
        self.assertEqual(actors, {"superauditor-1", "manager-1"})

    def test_a_standard_auditor_cannot_make_a_case_available(self) -> None:
        self.add_case("FREE1", visibility="SUPER_ADMIN_ONLY")
        r = self.client.post("/api/cases/FREE1/make-available", headers=self.headers("auditor-1"))
        self.assertEqual(r.status_code, 403)

    def test_an_owned_case_cannot_be_made_available(self) -> None:
        self.add_case("OWNED1", owner="auditor-1")
        r = self.client.post("/api/cases/OWNED1/make-available", headers=self.headers("manager-1"))
        self.assertEqual(r.status_code, 409)

    # --- take a released case back --------------------------------------------

    def test_a_released_case_is_left_alone_until_someone_takes_it_back(self) -> None:
        """Released cases wait for a claim and are never placed by the system, so there has to be a way back."""
        self.add_case("POOL1", visibility="AVAILABLE_TO_AUDITORS")
        with self.Session.begin() as db:
            self.assertEqual(release_waiting_cases(db), [])
        r = self.client.post("/api/cases/POOL1/withdraw-release", headers=self.headers("manager-1"))
        self.assertEqual(r.status_code, 200, r.text)
        case = self.case("POOL1")
        # An Auditor was free, so it was placed straight away by the usual weighted rule, and both steps are logged.
        self.assertEqual(case.case_visibility, "ASSIGNED_ONLY")
        self.assertIn(case.assigned_auditor_id, {"auditor-1", "auditor-2"})
        with self.Session() as db:
            actions = [a.action for a in db.scalars(select(AuditLog).where(AuditLog.case_id == "POOL1").order_by(AuditLog.audit_log_id))]
        self.assertIn("CASE_RELEASE_WITHDRAWN", actions)
        self.assertIn("CASE_ASSIGNED", actions)

    def test_with_nobody_free_a_case_taken_back_waits_to_be_placed_not_to_be_claimed(self) -> None:
        self.put_in_cooldown("auditor-1")
        self.put_in_cooldown("auditor-2")
        self.add_case("POOL1", visibility="AVAILABLE_TO_AUDITORS")
        r = self.client.post("/api/cases/POOL1/withdraw-release", headers=self.headers("superauditor-1"))
        self.assertEqual(r.status_code, 200, r.text)
        case = self.case("POOL1")
        self.assertEqual(case.case_visibility, "SUPER_ADMIN_ONLY")
        self.assertIsNone(case.assigned_auditor_id)
        self.assertIsNotNone(case.fallback_queued_at)
        rows = {row["case_id"]: row for row in self.client.get("/api/auditor/all-cases", headers=self.headers("superauditor-1")).json()}
        self.assertIsNotNone(rows["POOL1"]["auto_release_at"])
        # It is no longer offered to Auditors to claim.
        available = self.client.get("/api/auditor/available-cases", headers=self.headers("auditor-1")).json()
        self.assertNotIn("POOL1", [c["case_id"] for c in available["cases"]])

    def test_only_a_manager_or_the_super_auditor_can_take_a_case_back(self) -> None:
        self.add_case("POOL1", visibility="AVAILABLE_TO_AUDITORS")
        self.assertEqual(self.client.post("/api/cases/POOL1/withdraw-release", headers=self.headers("auditor-1")).status_code, 403)
        self.assertEqual(self.case("POOL1").case_visibility, "AVAILABLE_TO_AUDITORS")

    def test_a_case_that_was_claimed_or_is_with_the_manager_cannot_be_taken_back(self) -> None:
        self.add_case("OWNED1", owner="auditor-1")
        self.add_case("DECL1", visibility="AVAILABLE_TO_AUDITORS", flag="DECLINED")
        manager = self.headers("manager-1")
        self.assertEqual(self.client.post("/api/cases/OWNED1/withdraw-release", headers=manager).status_code, 409)
        self.assertEqual(self.client.post("/api/cases/DECL1/withdraw-release", headers=manager).status_code, 409)

    def test_taking_back_a_case_that_was_never_released_changes_nothing(self) -> None:
        self.add_case("FREE1", visibility="SUPER_ADMIN_ONLY")
        r = self.client.post("/api/cases/FREE1/withdraw-release", headers=self.headers("manager-1"))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.case("FREE1").case_visibility, "SUPER_ADMIN_ONLY")

    def test_available_cases_are_metadata_only(self) -> None:
        self.add_case("FREE1", visibility="AVAILABLE_TO_AUDITORS", tier="S3")
        body = self.client.get("/api/auditor/available-cases", headers=self.headers("auditor-1")).json()
        self.assertTrue(body["can_claim"])
        self.assertEqual(set(body["cases"][0]), {"case_id", "severity_tier", "status", "ready"})

    def test_a_case_not_released_is_not_listed_or_claimable(self) -> None:
        self.add_case("FREE1", visibility="SUPER_ADMIN_ONLY")
        body = self.client.get("/api/auditor/available-cases", headers=self.headers("auditor-1")).json()
        self.assertEqual(body["cases"], [])
        self.assertEqual(self.client.post("/api/auditor/cases/FREE1/claim", headers=self.headers("auditor-1")).status_code, 404)

    def test_an_eligible_auditor_claims_and_the_second_claim_fails(self) -> None:
        self.add_case("FREE1", visibility="AVAILABLE_TO_AUDITORS")
        first = self.client.post("/api/auditor/cases/FREE1/claim", headers=self.headers("auditor-1"))
        second = self.client.post("/api/auditor/cases/FREE1/claim", headers=self.headers("auditor-2"))
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(second.status_code, 404)
        case = self.case("FREE1")
        self.assertEqual((case.assigned_auditor_id, case.case_visibility), ("auditor-1", "ASSIGNED_ONLY"))
        # the weighted selector reads CASE_ASSIGNED events, so a claim is recorded as one
        with self.Session() as db:
            via = [a.after_value.get("via") for a in db.scalars(select(AuditLog).where(AuditLog.action == "CASE_ASSIGNED"))]
        self.assertEqual(via, ["CASE_CLAIMED"])

    def test_wellbeing_blocks_a_claim(self) -> None:
        self.add_case("FREE1", visibility="AVAILABLE_TO_AUDITORS")
        self.put_in_cooldown("auditor-1")
        self.put_at_limit("auditor-2")
        listing = self.client.get("/api/auditor/available-cases", headers=self.headers("auditor-1")).json()
        self.assertFalse(listing["can_claim"])
        self.assertIn("cooldown", listing["reason"])
        self.assertEqual(self.client.post("/api/auditor/cases/FREE1/claim", headers=self.headers("auditor-1")).status_code, 409)
        self.assertEqual(self.client.post("/api/auditor/cases/FREE1/claim", headers=self.headers("auditor-2")).status_code, 409)
        self.assertIsNone(self.case("FREE1").assigned_auditor_id)

    def test_an_open_sos_blocks_a_claim(self) -> None:
        self.add_case("FREE1", visibility="AVAILABLE_TO_AUDITORS")
        self.add_case("SOS1", owner="auditor-1", flag="SOS", status="AUDITOR_REVIEW")
        r = self.client.post("/api/auditor/cases/FREE1/claim", headers=self.headers("auditor-1"))
        self.assertEqual(r.status_code, 409)
        self.assertIn("SOS", r.json()["detail"])

    def test_a_case_with_the_manager_cannot_be_taken_claimed_or_released_and_never_names_who_declined(self) -> None:
        # A declined case keeps its owner in the database, but the Super Auditor never sees it (MR-CR-04).
        self.add_case("DECL1", owner="auditor-1", flag="DECLINED", visibility="AVAILABLE_TO_AUDITORS")
        self.add_case("DECL2", owner=None, flag="DECLINED", visibility="SUPER_ADMIN_ONLY")
        rows = {c["case_id"]: c for c in self.client.get("/api/auditor/all-cases", headers=self.headers("superauditor-1")).json()}
        self.assertIsNone(rows["DECL1"]["assigned_auditor_id"])
        self.assertEqual(rows["DECL1"]["manager_flag"], "DECLINED")
        sa = self.headers("superauditor-1")
        self.assertEqual(self.client.post("/api/auditor/cases/DECL2/take", headers=sa).status_code, 409)
        self.assertEqual(self.client.post("/api/cases/DECL2/make-available", headers=self.headers("manager-1")).status_code, 409)
        self.assertEqual(self.client.post("/api/auditor/cases/DECL1/claim", headers=self.headers("auditor-2")).status_code, 404)
        listing = self.client.get("/api/auditor/available-cases", headers=self.headers("auditor-2")).json()
        self.assertEqual(listing["cases"], [])
        self.assertIsNone(self.case("DECL2").assigned_auditor_id)

    def test_manager_reassignment_clears_the_fallback_visibility(self) -> None:
        self.add_case("FREE1", visibility="AVAILABLE_TO_AUDITORS")
        r = self.client.post("/api/manager/cases/FREE1/reassign", json={"auditor_id": "auditor-2"}, headers=self.headers("manager-1"))
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(self.case("FREE1").case_visibility, "ASSIGNED_ONLY")


if __name__ == "__main__":
    unittest.main()
