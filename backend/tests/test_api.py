import asyncio
import logging
import os
import shutil
import tempfile
import unittest
from pathlib import Path

# app.db builds its engine at import time. The API dependency is overridden
# below, but CI still needs a syntactically valid URL when no .env exists.
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite://")

import httpx
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import hash_password, session_store
from app.db import get_db
from app.main import app, get_assignment_orchestrator
from app.models import AuditLog, Auditor, Base, Case
from app.orchestrate import AssignmentDecision
from app.rate_limit import status_lookup_limiter
from app.request_logging import CaseIdRedactionFilter, redact_case_ids


AUDITOR_PASSWORD = "correct horse battery staple"
INTERNAL_API_KEY = "test-only-internal-key"


class AsgiClient:
    """Synchronous test facade over HTTPX's in-process ASGI transport."""

    def request(self, method: str, path: str, **kwargs) -> httpx.Response:
        async def send() -> httpx.Response:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(
                transport=transport,
                base_url="http://testserver",
            ) as client:
                return await client.request(method, path, **kwargs)

        return asyncio.run(send())

    def get(self, path: str, **kwargs) -> httpx.Response:
        return self.request("GET", path, **kwargs)

    def post(self, path: str, **kwargs) -> httpx.Response:
        return self.request("POST", path, **kwargs)


def valid_video_bytes(extension: str) -> bytes:
    if extension in {"mp4", "mov"}:
        return b"\x00\x00\x00\x10ftypisom\x00\x00\x00\x00"
    if extension == "webm":
        return bytes.fromhex("1A45DFA3") + b"webm-data"
    if extension == "avi":
        return b"RIFF" + (8).to_bytes(4, "little") + b"AVI " + b"data"
    raise AssertionError(f"No fixture for {extension}")


class ApiContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(
            "sqlite+pysqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.Session = sessionmaker(
            bind=cls.engine,
            autoflush=False,
            expire_on_commit=False,
        )
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
        self.upload_root = Path(tempfile.mkdtemp(prefix="ibm-rcs-api-tests-"))
        os.environ["VIDEO_STORAGE_DIRECTORY"] = str(self.upload_root)

        with self.Session.begin() as db:
            db.add_all(
                [
                    Auditor(
                        auditor_id="auditor-1",
                        login_hash=self.password_hash,
                        role="auditor",
                    ),
                    Auditor(
                        auditor_id="auditor-2",
                        login_hash=self.password_hash,
                        role="auditor",
                    ),
                    Auditor(
                        auditor_id="manager-1",
                        login_hash=self.password_hash,
                        role="manager",
                    ),
                ]
            )

    def tearDown(self) -> None:
        shutil.rmtree(self.upload_root)

    def login(self, staff_id: str = "auditor-1") -> str:
        response = self.client.post(
            "/api/staff/login",
            json={"staff_id": staff_id, "password": AUDITOR_PASSWORD},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["token"]

    def auth_headers(self, staff_id: str = "auditor-1") -> dict[str, str]:
        return {"Authorization": f"Bearer {self.login(staff_id)}"}

    def add_case(
        self,
        case_id: str,
        *,
        auditor_id: str | None = "auditor-1",
        status: str = "READY_FOR_REVIEW",
    ) -> None:
        with self.Session.begin() as db:
            db.add(
                Case(
                    case_id=case_id,
                    assigned_auditor_id=auditor_id,
                    status=status,
                )
            )

    def test_upload_accepts_each_supported_container_and_stores_after_validation(self) -> None:
        for extension in ("mp4", "mov", "webm", "avi"):
            with self.subTest(extension=extension):
                response = self.client.post(
                    "/api/reports",
                    files={
                        "video": (
                            f"evidence.{extension}",
                            valid_video_bytes(extension),
                            "application/octet-stream",
                        )
                    },
                )
                self.assertEqual(response.status_code, 201, response.text)
                self.assertEqual(response.json()["status"], "Received")
                self.assertNotIn("assigned_auditor", response.json())

                with self.Session() as db:
                    stored = db.get(Case, response.json()["case_id"])
                    self.assertIsNotNone(stored)
                    self.assertTrue(Path(stored.video_storage_path).is_file())
                    self.assertEqual(stored.status, "AI_PROCESSING")
                    self.assertIn(stored.assigned_auditor_id, {"auditor-1", "auditor-2"})
                    actions = db.scalars(
                        select(AuditLog.action)
                        .where(AuditLog.case_id == stored.case_id)
                        .order_by(AuditLog.audit_log_id)
                    ).all()
                    self.assertEqual(actions, ["CASE_CREATED", "CASE_ASSIGNED"])

    def test_report_assignment_comes_from_orchestrator_and_not_auditor_action(self) -> None:
        class RecordingOrchestrator:
            def __init__(self) -> None:
                self.case_ids: list[str] = []

            async def assign_case(self, case_id: str) -> AssignmentDecision:
                self.case_ids.append(case_id)
                return AssignmentDecision(
                    auditor_id="auditor-2",
                    audit_actor="watsonx-orchestrate",
                )

        recording_orchestrator = RecordingOrchestrator()

        async def override_orchestrator() -> RecordingOrchestrator:
            return recording_orchestrator

        app.dependency_overrides[get_assignment_orchestrator] = override_orchestrator
        try:
            response = self.client.post(
                "/api/reports",
                files={
                    "video": (
                        "evidence.mp4",
                        valid_video_bytes("mp4"),
                        "video/mp4",
                    )
                },
            )
        finally:
            app.dependency_overrides.pop(get_assignment_orchestrator, None)

        self.assertEqual(response.status_code, 201, response.text)
        case_id = response.json()["case_id"]
        self.assertEqual(recording_orchestrator.case_ids, [case_id])
        self.assertNotIn("assigned_auditor", response.json())

        with self.Session() as db:
            stored = db.get(Case, case_id)
            self.assertEqual(stored.assigned_auditor_id, "auditor-2")
            self.assertEqual(stored.status, "AI_PROCESSING")
            assignment_event = db.scalar(
                select(AuditLog).where(
                    AuditLog.case_id == case_id,
                    AuditLog.action == "CASE_ASSIGNED",
                )
            )
            self.assertEqual(assignment_event.actor, "watsonx-orchestrate")
            self.assertEqual(
                assignment_event.after_value["assigned_auditor_id"],
                "auditor-2",
            )
            self.assertEqual(assignment_event.after_value["status"], "AI_PROCESSING")

        assigned_list = self.client.get(
            "/api/auditor/cases",
            headers=self.auth_headers("auditor-2"),
        )
        other_list = self.client.get(
            "/api/auditor/cases",
            headers=self.auth_headers("auditor-1"),
        )
        self.assertEqual(
            [item["case_id"] for item in assigned_list.json()],
            [case_id],
        )
        self.assertEqual(other_list.json(), [])

    def test_invalid_orchestrate_decision_rolls_back_case_and_video(self) -> None:
        class InvalidOrchestrator:
            async def assign_case(self, case_id: str) -> AssignmentDecision:
                del case_id
                return AssignmentDecision(
                    auditor_id="manager-1",
                    audit_actor="watsonx-orchestrate",
                )

        async def override_orchestrator() -> InvalidOrchestrator:
            return InvalidOrchestrator()

        app.dependency_overrides[get_assignment_orchestrator] = override_orchestrator
        try:
            response = self.client.post(
                "/api/reports",
                files={
                    "video": (
                        "evidence.webm",
                        valid_video_bytes("webm"),
                        "video/webm",
                    )
                },
            )
        finally:
            app.dependency_overrides.pop(get_assignment_orchestrator, None)

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"detail": "Report could not be created"})
        with self.Session() as db:
            self.assertEqual(db.scalars(select(Case)).all(), [])
            self.assertEqual(db.scalars(select(AuditLog)).all(), [])
        self.assertEqual(list(self.upload_root.iterdir()), [])

    def test_protected_selector_uses_active_case_count_weighting(self) -> None:
        unauthenticated = self.client.post(
            "/api/internal/assignments/select-auditor"
        )
        self.assertEqual(unauthenticated.status_code, 401)

        self.add_case(
            "AUDITOR1ACTIVE01",
            auditor_id="auditor-1",
            status="SUBMITTED",
        )
        selected = self.client.post(
            "/api/internal/assignments/select-auditor",
            headers={"X-Internal-API-Key": INTERNAL_API_KEY},
        )
        self.assertEqual(selected.status_code, 200, selected.text)
        self.assertEqual(selected.json()["auditor_id"], "auditor-2")
        self.assertEqual(selected.json()["active_case_count"], 0)
        self.assertEqual(selected.json()["exposure_minutes"], 0)

    def test_upload_rejects_bad_extension_and_bad_signature_without_storage(self) -> None:
        unsupported = self.client.post(
            "/api/reports",
            files={"video": ("evidence.txt", b"not a video", "text/plain")},
        )
        corrupt = self.client.post(
            "/api/reports",
            files={"video": ("evidence.mp4", b"not-an-mp4-container", "video/mp4")},
        )

        self.assertEqual(unsupported.status_code, 400)
        self.assertEqual(corrupt.status_code, 400)
        self.assertIn("Accepted formats", unsupported.json()["detail"])
        with self.Session() as db:
            self.assertEqual(len(db.scalars(select(Case)).all()), 0)
        self.assertEqual(list(self.upload_root.iterdir()), [])

    def test_login_is_generic_role_scoped_and_logout_invalidates_session(self) -> None:
        missing = self.client.post(
            "/api/staff/login",
            json={"staff_id": "does-not-exist", "password": "wrong"},
        )
        wrong_password = self.client.post(
            "/api/staff/login",
            json={"staff_id": "auditor-1", "password": "wrong"},
        )
        self.assertEqual(missing.status_code, 401)
        self.assertEqual(wrong_password.status_code, 401)
        self.assertEqual(missing.json(), wrong_password.json())

        manager_headers = self.auth_headers("manager-1")
        self.assertEqual(
            self.client.get("/api/auditor/cases", headers=manager_headers).status_code,
            403,
        )
        self.assertEqual(
            self.client.get("/api/manager/dashboard", headers=manager_headers).status_code,
            200,
        )

        auditor_headers = self.auth_headers()
        self.assertEqual(
            self.client.get("/api/auditor/cases", headers=auditor_headers).status_code,
            200,
        )
        self.assertEqual(
            self.client.get("/api/manager/dashboard", headers=auditor_headers).status_code,
            403,
        )
        logout = self.client.post("/api/staff/logout", headers=auditor_headers)
        self.assertEqual(logout.status_code, 204)
        self.assertEqual(
            self.client.get("/api/auditor/cases", headers=auditor_headers).status_code,
            401,
        )

    def test_auditor_list_and_detail_never_return_another_auditors_case(self) -> None:
        own_id = "OWNCASE000000001"
        other_id = "OTHERCASE0000001"
        self.add_case(own_id, auditor_id="auditor-1")
        self.add_case(other_id, auditor_id="auditor-2")
        headers = self.auth_headers("auditor-1")

        listed = self.client.get("/api/auditor/cases", headers=headers)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual([item["case_id"] for item in listed.json()], [own_id])

        own = self.client.get(f"/api/auditor/cases/{own_id}", headers=headers)
        other = self.client.get(f"/api/auditor/cases/{other_id}", headers=headers)
        self.assertEqual(own.status_code, 200)
        self.assertEqual(other.status_code, 404)
        self.assertEqual(other.json(), {"detail": "Case not found"})

    def test_status_lookup_is_public_safe_generic_and_rate_limited(self) -> None:
        case_id = "STATUSCASE000001"
        self.add_case(case_id, status="AI_PROCESSING")

        valid = self.client.get(f"/api/status/{case_id.lower()}")
        self.assertEqual(valid.status_code, 200)
        self.assertEqual(valid.json()["status"], "Being Reviewed")
        self.assertIsNone(valid.json()["final_outcome"])

        invalid_responses = [
            self.client.get(f"/api/status/{candidate}")
            for candidate in ("bad", "MISSINGCASE00001", "nope", "NOTREAL000000001")
        ]
        self.assertTrue(all(response.status_code == 404 for response in invalid_responses))
        self.assertTrue(
            all(response.json() == {"detail": "Case not found"} for response in invalid_responses)
        )

        fifth = self.client.get("/api/status/FIFTHINVALID0001")
        self.assertEqual(fifth.status_code, 429)
        self.assertEqual(self.client.get(f"/api/status/{case_id}").status_code, 429)

    def test_case_ids_are_redacted_from_application_request_logs(self) -> None:
        case_id = "SECRETCASE000001"
        self.add_case(case_id, status="SUBMITTED")

        with self.assertLogs("ibm_rcs.api", level=logging.INFO) as captured:
            response = self.client.get(f"/api/status/{case_id}")

        self.assertEqual(response.status_code, 200)
        combined = "\n".join(captured.output)
        self.assertNotIn(case_id, combined)
        self.assertIn("/api/status/[REDACTED]", combined)
        self.assertEqual(
            redact_case_ids(f"/api/auditor/cases/{case_id}/resolve"),
            "/api/auditor/cases/[REDACTED]/resolve",
        )

        access_record = logging.LogRecord(
            name="uvicorn.access",
            level=logging.INFO,
            pathname=__file__,
            lineno=0,
            msg='%s - "%s %s HTTP/%s" %d',
            args=(
                "127.0.0.1:1234",
                "GET",
                f"/api/status/{case_id}",
                "1.1",
                200,
            ),
            exc_info=None,
        )
        CaseIdRedactionFilter().filter(access_record)
        self.assertNotIn(case_id, access_record.getMessage())
        self.assertIn("/api/status/[REDACTED]", access_record.getMessage())

    def test_mock_ai_detail_resolution_and_public_completion_flow(self) -> None:
        case_id = "RESOLVECASE00001"
        self.add_case(case_id, status="AI_PROCESSING")

        unauthorized_mock = self.client.post(
            f"/api/internal/cases/{case_id}/mock-ai-result",
            json={},
        )
        self.assertEqual(unauthorized_mock.status_code, 401)

        inserted = self.client.post(
            f"/api/internal/cases/{case_id}/mock-ai-result",
            headers={"X-Internal-API-Key": INTERNAL_API_KEY},
            json={},
        )
        self.assertEqual(inserted.status_code, 200, inserted.text)
        self.assertEqual(inserted.json()["status"], "READY_FOR_REVIEW")

        headers = self.auth_headers()
        detail = self.client.get(f"/api/auditor/cases/{case_id}", headers=headers)
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["severity_tier"], "S3")
        self.assertEqual(detail.json()["effective_severity_score"], 72)
        self.assertEqual(detail.json()["incident_timeline"][0]["start"], 12.0)

        missing_comment = self.client.post(
            f"/api/auditor/cases/{case_id}/resolve",
            headers=headers,
            json={
                "final_outcome": "POLICY_VIOLATION_FOUND",
                "auditor_severity_score": 80,
            },
        )
        self.assertEqual(missing_comment.status_code, 400)

        resolved = self.client.post(
            f"/api/auditor/cases/{case_id}/resolve",
            headers=headers,
            json={
                "final_outcome": "POLICY_VIOLATION_FOUND",
                "auditor_severity_score": 80,
                "auditor_comment": "The sustained incident warrants a higher score.",
            },
        )
        self.assertEqual(resolved.status_code, 200, resolved.text)
        self.assertEqual(resolved.json()["status"], "Complete")

        public = self.client.get(f"/api/status/{case_id}")
        self.assertEqual(public.status_code, 200)
        self.assertEqual(public.json()["status"], "Complete")
        self.assertEqual(public.json()["final_outcome"], "POLICY_VIOLATION_FOUND")

        with self.Session() as db:
            stored = db.get(Case, case_id)
            self.assertEqual(stored.status, "COMPLETE")
            self.assertIsNotNone(stored.completed_at)
            actions = db.scalars(
                select(AuditLog.action)
                .where(AuditLog.case_id == case_id)
                .order_by(AuditLog.audit_log_id)
            ).all()
            self.assertEqual(
                actions,
                ["MOCK_AI_RESULT_INSERTED", "CASE_RESOLVED"],
            )

    def test_another_auditor_cannot_resolve_the_case(self) -> None:
        case_id = "LOCKEDCASE000001"
        self.add_case(case_id, auditor_id="auditor-1", status="READY_FOR_REVIEW")
        response = self.client.post(
            f"/api/auditor/cases/{case_id}/resolve",
            headers=self.auth_headers("auditor-2"),
            json={"final_outcome": "NO_VIOLATION_FOUND"},
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Case not found"})


if __name__ == "__main__":
    unittest.main()
