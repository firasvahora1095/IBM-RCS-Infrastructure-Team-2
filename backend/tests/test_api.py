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

    def test_selector_prefers_never_assigned_auditor_on_tie(self) -> None:
        """A never-assigned Auditor wins when weighted scores are equal."""

        history_case_id = "HISTORYCASE00001"

        # COMPLETE cases do not affect active-case weighting.
        self.add_case(
            history_case_id,
            auditor_id="auditor-1",
            status="COMPLETE",
        )

        with self.Session.begin() as db:
            db.add(
                AuditLog(
                    case_id=history_case_id,
                    actor="watsonx-orchestrate",
                    action="CASE_ASSIGNED",
                    after_value={
                        "assigned_auditor_id": "auditor-1",
                    },
                )
            )

        selected = self.client.post(
            "/api/internal/assignments/select-auditor",
            headers={"X-Internal-API-Key": INTERNAL_API_KEY},
        )

        self.assertEqual(selected.status_code, 200, selected.text)

        # Both Auditors have the same weighted score, but auditor-2 has
        # never previously been assigned a case.
        self.assertEqual(selected.json()["auditor_id"], "auditor-2")
        self.assertEqual(selected.json()["active_case_count"], 0)

    def test_selector_uses_least_recently_assigned_auditor_on_tie(self) -> None:
        """Equal-score Auditors rotate to the least recently assigned Auditor."""

        older_case_id = "OLDERASSIGN00001"
        newer_case_id = "NEWERASSIGN00001"

        # Both historical cases are COMPLETE so they do not change the
        # current active-case weighting.
        self.add_case(
            older_case_id,
            auditor_id="auditor-2",
            status="COMPLETE",
        )
        self.add_case(
            newer_case_id,
            auditor_id="auditor-1",
            status="COMPLETE",
        )

        with self.Session.begin() as db:
            # auditor-2 was assigned first, therefore it is the
            # least recently assigned Auditor.
            db.add(
                AuditLog(
                    case_id=older_case_id,
                    actor="watsonx-orchestrate",
                    action="CASE_ASSIGNED",
                    after_value={
                        "assigned_auditor_id": "auditor-2",
                    },
                )
            )

            # Flush guarantees the first event gets the earlier
            # audit_log_id/sequence.
            db.flush()

            db.add(
                AuditLog(
                    case_id=newer_case_id,
                    actor="watsonx-orchestrate",
                    action="CASE_ASSIGNED",
                    after_value={
                        "assigned_auditor_id": "auditor-1",
                    },
                )
            )

        selected = self.client.post(
            "/api/internal/assignments/select-auditor",
            headers={"X-Internal-API-Key": INTERNAL_API_KEY},
        )

        self.assertEqual(selected.status_code, 200, selected.text)

        # Both have equal active counts and scores. auditor-2 wins because
        # it was assigned less recently.
        self.assertEqual(selected.json()["auditor_id"], "auditor-2")
        self.assertEqual(selected.json()["active_case_count"], 0)

    def test_selector_returns_single_available_auditor(self) -> None:
        """The selector works when only one Auditor account is eligible."""

        with self.Session.begin() as db:
            auditor_2 = db.get(Auditor, "auditor-2")
            self.assertIsNotNone(auditor_2)

            # The selector only considers role="auditor".
            auditor_2.role = "manager"

        selected = self.client.post(
            "/api/internal/assignments/select-auditor",
            headers={"X-Internal-API-Key": INTERNAL_API_KEY},
        )

        self.assertEqual(selected.status_code, 200, selected.text)
        self.assertEqual(selected.json()["auditor_id"], "auditor-1")
        self.assertEqual(selected.json()["active_case_count"], 0)

    def test_selector_handles_no_available_auditors(self) -> None:
        """No eligible Auditor returns a handled 409 instead of crashing."""

        with self.Session.begin() as db:
            auditor_1 = db.get(Auditor, "auditor-1")
            auditor_2 = db.get(Auditor, "auditor-2")

            self.assertIsNotNone(auditor_1)
            self.assertIsNotNone(auditor_2)

            # Remove both accounts from the eligible Auditor pool.
            auditor_1.role = "manager"
            auditor_2.role = "manager"

        selected = self.client.post(
            "/api/internal/assignments/select-auditor",
            headers={"X-Internal-API-Key": INTERNAL_API_KEY},
        )

        self.assertEqual(selected.status_code, 409, selected.text)
        self.assertEqual(
            selected.json()["detail"],
            "No eligible Auditors are available",
        )

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

    def test_auditor_detail_exposes_spanned_flagged_entities(self) -> None:
        case_id = "ENTITYCASE000001"
        self.add_case(case_id, status="READY_FOR_REVIEW")
        expected = [
            {"label": "person on the left", "start": 5.0, "end": 10.0},
            {"label": "knife-like object", "start": 10.0, "end": 10.0},
        ]
        with self.Session.begin() as db:
            case = db.get(Case, case_id)
            case.flagged_entities = expected

        detail = self.client.get(
            f"/api/auditor/cases/{case_id}",
            headers=self.auth_headers(),
        )

        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["flagged_entities"], expected)

    def test_auditor_detail_exposes_protected_vision_failure_state(self) -> None:
        case_id = "VISIONFAILURE001"
        self.add_case(case_id, status="READY_FOR_REVIEW")
        with self.Session.begin() as db:
            case = db.get(Case, case_id)
            case.ai_failure = "vision"

        detail = self.client.get(
            f"/api/auditor/cases/{case_id}",
            headers=self.auth_headers(),
        )

        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["ai_failure"], "vision")
        self.assertIsNone(detail.json()["effective_severity_score"])
        self.assertIsNone(detail.json()["severity_tier"])
        self.assertIsNone(detail.json()["flagged_entities"])

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
        self.assertIsNone(detail.json()["ai_failure"])

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

    # ------------------------------------------------------------------
    # Exposure schema — active_seconds + replay_seconds (not just seconds)
    # ------------------------------------------------------------------

    def test_exposure_accepts_active_and_replay_seconds(self) -> None:
        case_id = "EXPOSURECASE0001"
        self.add_case(case_id)
        headers = self.auth_headers()

        # New shape: separate active + replay fields
        r = self.client.post(
            f"/api/auditor/cases/{case_id}/exposure",
            headers=headers,
            json={"active_seconds": 30.0, "replay_seconds": 10.0},
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json(), {"recorded": True})

        with self.Session() as db:
            auditor = db.get(Auditor, "auditor-1")
            # 40 total seconds = 40/60 minutes
            self.assertAlmostEqual(auditor.exposure_minutes, 40 / 60, places=4)

    def test_exposure_accepts_legacy_seconds_field(self) -> None:
        case_id = "EXPOSURELEGACY01"
        self.add_case(case_id)
        headers = self.auth_headers()

        # Old shape: single seconds field
        r = self.client.post(
            f"/api/auditor/cases/{case_id}/exposure",
            headers=headers,
            json={"seconds": 60.0},
        )
        self.assertEqual(r.status_code, 200, r.text)

        with self.Session() as db:
            auditor = db.get(Auditor, "auditor-1")
            self.assertAlmostEqual(auditor.exposure_minutes, 1.0, places=4)

    # ------------------------------------------------------------------
    # Cooldown — SOS saves to DB and wellbeing API returns real state
    # ------------------------------------------------------------------

    def test_sos_saves_cooldown_to_db_and_wellbeing_returns_it(self) -> None:
        case_id = "SOSCASE000000001"
        self.add_case(case_id)
        headers = self.auth_headers()

        r = self.client.post(
            f"/api/auditor/cases/{case_id}/sos",
            headers=headers,
        )
        self.assertEqual(r.status_code, 200, r.text)
        cooldown = r.json()["cooldown"]
        self.assertEqual(cooldown["trigger"], "SOS")
        self.assertTrue(cooldown["requires_check_in"])
        self.assertIsNone(cooldown["check_in_completed_at"])

        with self.Session() as db:
            auditor = db.get(Auditor, "auditor-1")
            self.assertIsNotNone(auditor.cooldown_ends_at)
            self.assertEqual(auditor.cooldown_trigger, "SOS")
            self.assertEqual(auditor.cooldown_check_in_done, 0)

        wellbeing = self.client.get("/api/auditor/wellbeing", headers=headers)
        self.assertEqual(wellbeing.status_code, 200, wellbeing.text)
        wb_cooldown = wellbeing.json()["cooldown"]
        self.assertIsNotNone(wb_cooldown)
        self.assertEqual(wb_cooldown["trigger"], "SOS")
        self.assertTrue(wb_cooldown["requires_check_in"])

    def test_cooldown_clears_after_manager_follow_up(self) -> None:
        case_id = "SOSCASE000000002"
        self.add_case(case_id)
        auditor_headers = self.auth_headers("auditor-1")
        manager_headers = self.auth_headers("manager-1")

        sos = self.client.post(
            f"/api/auditor/cases/{case_id}/sos",
            headers=auditor_headers,
        )
        self.assertEqual(sos.status_code, 200, sos.text)

        # Find the SOS alert that was just created
        alerts = self.client.get("/api/manager/sos-alerts", headers=manager_headers)
        self.assertEqual(alerts.status_code, 200, alerts.text)
        self.assertEqual(len(alerts.json()), 1)
        alert_id = alerts.json()[0]["id"]

        follow_up = self.client.post(
            f"/api/manager/sos-alerts/{alert_id}/follow-up",
            headers=manager_headers,
            json={"notes": "Spoke with auditor, they are okay.", "outcome": "NO_FURTHER_ACTION"},
        )
        self.assertEqual(follow_up.status_code, 200, follow_up.text)

        with self.Session() as db:
            auditor = db.get(Auditor, "auditor-1")
            self.assertEqual(auditor.cooldown_check_in_done, 1)

    # ------------------------------------------------------------------
    # Wellbeing support — case_id=None must not crash (NULL FK bug)
    # ------------------------------------------------------------------

    def test_wellbeing_support_without_case_id_succeeds(self) -> None:
        headers = self.auth_headers()

        # Triggered from CooldownPage where there's no active case
        r = self.client.post(
            "/api/auditor/wellbeing-support",
            headers=headers,
            json={"kind": "TALK_TO_MANAGER"},
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json(), {"received": True})

        # Must not have created an AuditLog row (case_id would be NULL → FK error)
        with self.Session() as db:
            logs = db.scalars(select(AuditLog)).all()
            self.assertEqual(logs, [])

    def test_wellbeing_support_with_case_id_logs_to_audit(self) -> None:
        case_id = "WBSUPPORTCASE001"
        self.add_case(case_id)
        headers = self.auth_headers()

        r = self.client.post(
            "/api/auditor/wellbeing-support",
            headers=headers,
            json={"kind": "REQUEST_BREAK", "case_id": case_id},
        )
        self.assertEqual(r.status_code, 200, r.text)

        with self.Session() as db:
            log = db.scalar(
                select(AuditLog).where(AuditLog.action == "WELLBEING_SUPPORT_REQUESTED")
            )
            self.assertIsNotNone(log)
            self.assertEqual(log.case_id, case_id)
            self.assertEqual(log.after_value["kind"], "REQUEST_BREAK")


    # ------------------------------------------------------------------
    # Decline → declined queue → reassign / close flow
    # ------------------------------------------------------------------

    def test_auditor_can_decline_case_and_it_appears_in_manager_declined_queue(self) -> None:
        case_id = "DECLINECASE00001"
        self.add_case(case_id)
        auditor_headers = self.auth_headers("auditor-1")
        manager_headers = self.auth_headers("manager-1")

        r = self.client.post(
            f"/api/auditor/cases/{case_id}/decline",
            headers=auditor_headers,
            json={"reason": "NEAR_EXPOSURE_LIMIT"},
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json(), {"declined": True})

        queue = self.client.get("/api/manager/declined-cases", headers=manager_headers)
        self.assertEqual(queue.status_code, 200, queue.text)
        case_ids = [c["case_id"] for c in queue.json()]
        self.assertIn(case_id, case_ids)
        row = next(c for c in queue.json() if c["case_id"] == case_id)
        self.assertEqual(row["reason"], "NEAR_EXPOSURE_LIMIT")

    def test_manager_can_reassign_declined_case_to_another_auditor(self) -> None:
        case_id = "REASSIGNCASE0001"
        self.add_case(case_id, auditor_id="auditor-1")
        auditor_headers = self.auth_headers("auditor-1")
        manager_headers = self.auth_headers("manager-1")

        # Auditor 1 declines
        self.client.post(
            f"/api/auditor/cases/{case_id}/decline",
            headers=auditor_headers,
            json={"reason": "CONTENT_MORE_SEVERE"},
        )

        # Manager checks reassignment candidates
        ctx = self.client.get(
            f"/api/manager/cases/{case_id}/reassignment",
            headers=manager_headers,
        )
        self.assertEqual(ctx.status_code, 200, ctx.text)
        candidate_ids = [c["auditor_id"] for c in ctx.json()["candidates"]]
        self.assertIn("auditor-2", candidate_ids)
        self.assertNotIn("auditor-1", candidate_ids)  # declining auditor excluded

        # Manager reassigns to auditor-2
        reassign = self.client.post(
            f"/api/manager/cases/{case_id}/reassign",
            headers=manager_headers,
            json={"auditor_id": "auditor-2"},
        )
        self.assertEqual(reassign.status_code, 200, reassign.text)
        self.assertEqual(reassign.json()["assigned_to_name"], "auditor-2")

        # Case now visible to auditor-2, not auditor-1
        with self.Session() as db:
            case = db.get(Case, case_id)
            self.assertEqual(case.assigned_auditor_id, "auditor-2")
            self.assertEqual(case.status, "READY_FOR_REVIEW")
            self.assertIsNone(case.manager_flag)

        a2_list = self.client.get("/api/auditor/cases", headers=self.auth_headers("auditor-2"))
        self.assertIn(case_id, [c["case_id"] for c in a2_list.json()])

    def test_manager_can_close_case_without_reassignment(self) -> None:
        case_id = "CLOSECASE0000001"
        self.add_case(case_id, auditor_id="auditor-1")
        manager_headers = self.auth_headers("manager-1")

        close = self.client.post(
            f"/api/manager/cases/{case_id}/close",
            headers=manager_headers,
            json={"note": "Case closed after review — no suitable auditor available."},
        )
        self.assertEqual(close.status_code, 200, close.text)

        with self.Session() as db:
            case = db.get(Case, case_id)
            self.assertEqual(case.final_outcome, "CLOSED_NO_REASSIGNMENT")

    def test_auditor_cannot_access_manager_declined_queue(self) -> None:
        headers = self.auth_headers("auditor-1")
        r = self.client.get("/api/manager/declined-cases", headers=headers)
        self.assertEqual(r.status_code, 403)

    # ------------------------------------------------------------------
    # Manager dashboard and case oversight
    # ------------------------------------------------------------------

    def test_manager_dashboard_returns_overview_counts(self) -> None:
        self.add_case("DASHCASE0000001", auditor_id="auditor-1", status="READY_FOR_REVIEW")
        self.add_case("DASHCASE0000002", auditor_id="auditor-1", status="COMPLETE")
        manager_headers = self.auth_headers("manager-1")

        r = self.client.get("/api/manager/dashboard", headers=manager_headers)
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertIn("auditors", data)
        self.assertIn("pending_declined_cases", data)

    def test_manager_case_oversight_lists_all_cases(self) -> None:
        self.add_case("OVERSIGHTCASE001", auditor_id="auditor-1", status="READY_FOR_REVIEW")
        self.add_case("OVERSIGHTCASE002", auditor_id="auditor-2", status="AI_PROCESSING")
        manager_headers = self.auth_headers("manager-1")

        r = self.client.get("/api/manager/cases", headers=manager_headers)
        self.assertEqual(r.status_code, 200, r.text)
        case_ids = [c["case_id"] for c in r.json()]
        self.assertIn("OVERSIGHTCASE001", case_ids)
        self.assertIn("OVERSIGHTCASE002", case_ids)

    def test_manager_case_review_shows_decline_reason(self) -> None:
        case_id = "REVIEWCASE000001"
        self.add_case(case_id, auditor_id="auditor-1")
        auditor_headers = self.auth_headers("auditor-1")
        manager_headers = self.auth_headers("manager-1")

        self.client.post(
            f"/api/auditor/cases/{case_id}/decline",
            headers=auditor_headers,
            json={"reason": "PERSONAL_TRIGGER", "other_text": None},
        )

        r = self.client.get(f"/api/manager/cases/{case_id}/review", headers=manager_headers)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["manager_flag"], "DECLINED")
        self.assertEqual(r.json()["decline"]["reason"], "PERSONAL_TRIGGER")

    def test_exceptional_access_returns_full_ai_fields(self) -> None:
        case_id = "EXCEPTACCESS00001"
        self.add_case(case_id, auditor_id="auditor-1")
        with self.Session.begin() as db:
            case = db.get(Case, case_id)
            case.watson_severity_score = 80
            case.effective_severity_score = 80
            case.severity_tier = "S3"
            case.narrative_summary = "Test summary"
            case.incident_timeline = [{"start": 1.0, "end": 2.0, "severity_tier": "S3", "tag": None}]
            case.flagged_entities = [{"label": "weapon", "start": 1.0, "end": 2.0}]
            case.transcript = [{"time": 0.5, "text": "Stop"}]
            case.audio_intensity = [0.1, 0.5, 0.9]
            case.video_duration_seconds = 30.0

        manager_headers = self.auth_headers("manager-1")
        r = self.client.get(f"/api/manager/cases/{case_id}/exceptional-access", headers=manager_headers)
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["severity_tier"], "S3")
        self.assertEqual(body["flagged_entities"], [{"label": "weapon", "start": 1.0, "end": 2.0}])
        self.assertEqual(body["transcript"], [{"time": 0.5, "text": "Stop"}])
        self.assertEqual(body["audio_intensity"], [0.1, 0.5, 0.9])
        self.assertEqual(body["video_duration_seconds"], 30.0)

    def test_exceptional_access_requires_manager_token(self) -> None:
        case_id = "EXCEPTACCESS00002"
        self.add_case(case_id, auditor_id="auditor-1")
        auditor_headers = self.auth_headers("auditor-1")
        r = self.client.get(f"/api/manager/cases/{case_id}/exceptional-access", headers=auditor_headers)
        self.assertEqual(r.status_code, 403)

    def test_manager_video_endpoint_requires_manager_token(self) -> None:
        case_id = "MANAGERVIDEO00001"
        self.add_case(case_id, auditor_id="auditor-1")
        auditor_headers = self.auth_headers("auditor-1")
        r = self.client.get(f"/api/manager/cases/{case_id}/video", headers=auditor_headers)
        self.assertEqual(r.status_code, 401)

    def test_manager_video_endpoint_returns_404_when_no_video(self) -> None:
        case_id = "MANAGERVIDEO00002"
        self.add_case(case_id, auditor_id="auditor-1")
        manager_headers = self.auth_headers("manager-1")
        r = self.client.get(f"/api/manager/cases/{case_id}/video", headers=manager_headers)
        self.assertEqual(r.status_code, 404)


if __name__ == "__main__":
    unittest.main()