"""
Cross-validation tests covering:
  1. Backend bug-fix regression (E2E/backend bug-fix buffer)
       - Case.submitted_at → Case.created_at fix (was 500 on /api/manager/auditors/:id)
       - get_auditor_detail returns active_cases, sos_history, override_history

  2. Cross-test of Aiden's final backend behaviour
       - Override flow: AI score → auditor overrides → audit log records is_override=True
       - Completion flow: resolve → status=COMPLETE → public status readable
       - Severity-tier cooldown: S3→15min, S4→30min, S1→no cooldown
"""
import asyncio
import os
import shutil
import tempfile
import unittest
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite://")

import httpx
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import hash_password, session_store
from app.db import get_db
from app.main import app, get_assignment_orchestrator
from app.models import AuditLog, Auditor, Base, Case
from app.rate_limit import status_lookup_limiter


AUDITOR_PASSWORD = "correct horse battery staple"
INTERNAL_API_KEY = "test-only-internal-key"


class AsgiClient:
    def request(self, method: str, path: str, **kwargs) -> httpx.Response:
        async def send() -> httpx.Response:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as c:
                return await c.request(method, path, **kwargs)
        return asyncio.run(send())

    def get(self, path: str, **kwargs) -> httpx.Response:
        return self.request("GET", path, **kwargs)

    def post(self, path: str, **kwargs) -> httpx.Response:
        return self.request("POST", path, **kwargs)


class CrossValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(
            "sqlite+pysqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.Session = sessionmaker(bind=cls.engine, autoflush=False, expire_on_commit=False)
        cls.password_hash = hash_password(AUDITOR_PASSWORD, iterations=10_000)

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
        status_lookup_limiter.clear()
        os.environ["INTERNAL_API_KEY"] = INTERNAL_API_KEY
        os.environ["VIDEO_STORAGE_BACKEND"] = "local"
        os.environ["ORCHESTRATE_MODE"] = "mock"
        self.upload_root = Path(tempfile.mkdtemp(prefix="ibm-rcs-cross-tests-"))
        os.environ["VIDEO_STORAGE_DIRECTORY"] = str(self.upload_root)

        with self.Session.begin() as db:
            db.add_all([
                Auditor(auditor_id="auditor-1", login_hash=self.password_hash, role="auditor"),
                Auditor(auditor_id="auditor-2", login_hash=self.password_hash, role="auditor"),
                Auditor(auditor_id="manager-1", login_hash=self.password_hash, role="manager"),
            ])

    def tearDown(self) -> None:
        shutil.rmtree(self.upload_root)

    def login(self, staff_id: str = "auditor-1") -> str:
        r = self.client.post("/api/staff/login", json={"staff_id": staff_id, "password": AUDITOR_PASSWORD})
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()["token"]

    def auth_headers(self, staff_id: str = "auditor-1") -> dict[str, str]:
        return {"Authorization": f"Bearer {self.login(staff_id)}"}

    def add_case(self, case_id: str, *, auditor_id: str | None = "auditor-1", status: str = "READY_FOR_REVIEW",
                 watson_severity_score: int | None = None, effective_severity_score: int | None = None) -> None:
        with self.Session.begin() as db:
            db.add(Case(
                case_id=case_id,
                assigned_auditor_id=auditor_id,
                status=status,
                watson_severity_score=watson_severity_score,
                effective_severity_score=effective_severity_score,
            ))

    def mock_ai_result(self, case_id: str, watson_score: int = 68, effective_score: int = 72) -> None:
        r = self.client.post(
            f"/api/internal/cases/{case_id}/mock-ai-result",
            headers={"X-Internal-API-Key": INTERNAL_API_KEY},
            json={"watson_severity_score": watson_score, "effective_severity_score": effective_score},
        )
        self.assertEqual(r.status_code, 200, r.text)

    # -------------------------------------------------------------------------
    # Bug-fix regression: Case.submitted_at → Case.created_at (was 500 error)
    # -------------------------------------------------------------------------

    def test_manager_auditor_detail_returns_200_not_500(self) -> None:
        """Regression: get_auditor_detail used Case.submitted_at which doesn't exist → 500."""
        self.add_case("BUGFIX500CASE0001", auditor_id="auditor-1", status="READY_FOR_REVIEW")
        manager_headers = self.auth_headers("manager-1")

        r = self.client.get("/api/manager/auditors/auditor-1", headers=manager_headers)
        self.assertEqual(r.status_code, 200, f"Expected 200 but got 500 — submitted_at bug still present: {r.text}")

    def test_manager_auditor_detail_includes_recent_cases(self) -> None:
        """get_auditor_detail should return recent_cases with exposure and cooldown data."""
        self.add_case("DETAILCASE000001", auditor_id="auditor-1", status="READY_FOR_REVIEW")
        manager_headers = self.auth_headers("manager-1")

        r = self.client.get("/api/manager/auditors/auditor-1", headers=manager_headers)
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertIn("recent_cases", body)
        self.assertIn("exposure_minutes_today", body)
        self.assertIn("exposure_limit_minutes", body)
        self.assertIn("cooldown", body)

    def test_manager_auditor_detail_completed_case_appears_in_recent(self) -> None:
        """A completed case should appear in recent_cases on the auditor detail."""
        case_id = "OVERRIDEDETAIL001"
        self.add_case(case_id, auditor_id="auditor-1", status="AI_PROCESSING")
        self.mock_ai_result(case_id, watson_score=40, effective_score=40)

        auditor_headers = self.auth_headers("auditor-1")
        self.client.post(
            f"/api/auditor/cases/{case_id}/resolve",
            headers=auditor_headers,
            json={
                "final_outcome": "POLICY_VIOLATION_FOUND",
                "auditor_severity_score": 85,
                "auditor_comment": "Far more serious than AI assessed.",
            },
        )

        manager_headers = self.auth_headers("manager-1")
        r = self.client.get("/api/manager/auditors/auditor-1", headers=manager_headers)
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        recent_ids = [c["case_id"] for c in body["recent_cases"]]
        self.assertIn(case_id, recent_ids)

    # -------------------------------------------------------------------------
    # Aiden's backend: override flow
    # -------------------------------------------------------------------------

    def test_aiden_override_flow_records_is_override_true_in_audit_log(self) -> None:
        """Auditor submits a score different from AI → audit log must record is_override=True."""
        case_id = "AIDENOVR0000001"
        self.add_case(case_id, auditor_id="auditor-1", status="AI_PROCESSING")
        self.mock_ai_result(case_id, watson_score=40, effective_score=40)

        auditor_headers = self.auth_headers("auditor-1")
        r = self.client.post(
            f"/api/auditor/cases/{case_id}/resolve",
            headers=auditor_headers,
            json={
                "final_outcome": "POLICY_VIOLATION_FOUND",
                "auditor_severity_score": 85,
                "auditor_comment": "Auditor sees it as far more serious.",
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["status"], "Complete")

        with self.Session() as db:
            log = db.scalars(
                select(AuditLog).where(
                    AuditLog.case_id == case_id,
                    AuditLog.action == "CASE_RESOLVED",
                )
            ).one()
            self.assertTrue(log.after_value["is_override"])
            self.assertEqual(log.after_value["auditor_severity_score"], 85)
            self.assertEqual(log.before_value["effective_severity_score"], 40)

    def test_aiden_confirm_ai_score_records_is_override_false(self) -> None:
        """Confirming the AI score (no auditor_severity_score) → is_override=False."""
        case_id = "AIDENCONFIRM0001"
        self.add_case(case_id, auditor_id="auditor-1", status="AI_PROCESSING")
        self.mock_ai_result(case_id, watson_score=68, effective_score=72)

        auditor_headers = self.auth_headers("auditor-1")
        r = self.client.post(
            f"/api/auditor/cases/{case_id}/resolve",
            headers=auditor_headers,
            json={"final_outcome": "POLICY_VIOLATION_FOUND"},
        )
        self.assertEqual(r.status_code, 200, r.text)

        with self.Session() as db:
            log = db.scalars(
                select(AuditLog).where(
                    AuditLog.case_id == case_id,
                    AuditLog.action == "CASE_RESOLVED",
                )
            ).one()
            self.assertFalse(log.after_value["is_override"])

    # -------------------------------------------------------------------------
    # Aiden's backend: completion flow
    # -------------------------------------------------------------------------

    def test_aiden_complete_flow_sets_status_complete_and_public_readable(self) -> None:
        """Full resolve → COMPLETE → public /api/status/:id returns Complete."""
        case_id = "AIDENCOMPL000001"
        self.add_case(case_id, auditor_id="auditor-1", status="AI_PROCESSING")
        self.mock_ai_result(case_id)

        auditor_headers = self.auth_headers("auditor-1")
        r = self.client.post(
            f"/api/auditor/cases/{case_id}/resolve",
            headers=auditor_headers,
            json={"final_outcome": "NO_VIOLATION_FOUND", "auditor_comment": "Reviewed — no violation."},
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["status"], "Complete")

        public = self.client.get(f"/api/status/{case_id}")
        self.assertEqual(public.status_code, 200)
        self.assertEqual(public.json()["status"], "Complete")
        self.assertEqual(public.json()["final_outcome"], "NO_VIOLATION_FOUND")

        with self.Session() as db:
            case = db.get(Case, case_id)
            self.assertEqual(case.status, "COMPLETE")
            self.assertIsNotNone(case.completed_at)

    # -------------------------------------------------------------------------
    # Aiden's backend: severity-tier cooldown
    # -------------------------------------------------------------------------

    def _resolve_with_tier(self, case_id: str, tier: str, score: int) -> httpx.Response:
        with self.Session.begin() as db:
            case = db.get(Case, case_id)
            case.severity_tier = tier
            case.effective_severity_score = score
        return self.client.post(
            f"/api/auditor/cases/{case_id}/resolve",
            headers=self.auth_headers("auditor-1"),
            json={"final_outcome": "NO_VIOLATION_FOUND"},
        )

    def test_aiden_s3_resolution_triggers_15_min_cooldown(self) -> None:
        """S3 case completion must set a 15-minute cooldown on the auditor."""
        from datetime import datetime, timezone
        case_id = "AIDENCOOLDOWNS3X"
        self.add_case(case_id, auditor_id="auditor-1", status="AUDITOR_REVIEW")
        before = datetime.now(timezone.utc)
        r = self._resolve_with_tier(case_id, "S3", 70)
        self.assertEqual(r.status_code, 200, r.text)

        with self.Session() as db:
            auditor = db.get(Auditor, "auditor-1")
            self.assertIsNotNone(auditor.cooldown_ends_at)
            self.assertEqual(auditor.cooldown_trigger, "S3")
            ends_at = auditor.cooldown_ends_at
            if ends_at.tzinfo is None:
                ends_at = ends_at.replace(tzinfo=timezone.utc)
            delta = (ends_at - before).total_seconds() / 60
            self.assertAlmostEqual(delta, 15, delta=0.2)

    def test_aiden_s4_resolution_triggers_30_min_cooldown(self) -> None:
        """S4 case completion must set a 30-minute cooldown on the auditor."""
        from datetime import datetime, timezone
        case_id = "AIDENCOOLDOWNS4X"
        self.add_case(case_id, auditor_id="auditor-1", status="AUDITOR_REVIEW")
        before = datetime.now(timezone.utc)
        r = self._resolve_with_tier(case_id, "S4", 90)
        self.assertEqual(r.status_code, 200, r.text)

        with self.Session() as db:
            auditor = db.get(Auditor, "auditor-1")
            self.assertIsNotNone(auditor.cooldown_ends_at)
            self.assertEqual(auditor.cooldown_trigger, "S4")
            ends_at = auditor.cooldown_ends_at
            if ends_at.tzinfo is None:
                ends_at = ends_at.replace(tzinfo=timezone.utc)
            delta = (ends_at - before).total_seconds() / 60
            self.assertAlmostEqual(delta, 30, delta=0.2)

    def test_aiden_s1_resolution_does_not_set_cooldown(self) -> None:
        """S1 (low severity) case completion must NOT set a cooldown."""
        case_id = "AIDENCOOLDOWNS1X"
        self.add_case(case_id, auditor_id="auditor-1", status="AUDITOR_REVIEW")
        r = self._resolve_with_tier(case_id, "S1", 20)
        self.assertEqual(r.status_code, 200, r.text)

        with self.Session() as db:
            auditor = db.get(Auditor, "auditor-1")
            self.assertIsNone(auditor.cooldown_ends_at)


if __name__ == "__main__":
    unittest.main()
