"""Contract tests for the B2B flow: result handoff, reports and client access."""

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

from app.auth import hash_password, session_store
from app.b2b import COMMUNITYHUB_ID, client_login_limiter, client_session_store
from app.b2b_seed import month_period, seed_b2b
from app.db import get_db
from app.main import app
from app.models import (
    AuditLog,
    Auditor,
    Base,
    Case,
    CaseSource,
    ClientUser,
    Delivery,
    Organisation,
    ReportAccess,
    ServiceReport,
)
from app.rate_limit import status_lookup_limiter


PASSWORD = "correct horse battery staple"


class AsgiClient:
    def request(self, method: str, path: str, **kwargs) -> httpx.Response:
        async def send() -> httpx.Response:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                return await client.request(method, path, **kwargs)

        return asyncio.run(send())

    def get(self, path: str, **kwargs) -> httpx.Response:
        return self.request("GET", path, **kwargs)

    def post(self, path: str, **kwargs) -> httpx.Response:
        return self.request("POST", path, **kwargs)

    def put(self, path: str, **kwargs) -> httpx.Response:
        return self.request("PUT", path, **kwargs)


class B2bContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(
            "sqlite+pysqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
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
        client_session_store.clear()
        client_login_limiter.clear()
        status_lookup_limiter.clear()
        os.environ["VIDEO_STORAGE_BACKEND"] = "local"
        os.environ["ORCHESTRATE_MODE"] = "mock"
        self.upload_root = Path(tempfile.mkdtemp(prefix="ibm-rcs-b2b-tests-"))
        os.environ["VIDEO_STORAGE_DIRECTORY"] = str(self.upload_root)
        with self.Session.begin() as db:
            db.add_all([
                Auditor(auditor_id="auditor-1", login_hash=self.password_hash, role="auditor"),
                Auditor(auditor_id="manager-1", login_hash=self.password_hash, role="manager"),
                Organisation(
                    organisation_id=COMMUNITYHUB_ID,
                    name="CommunityHub",
                    description="Social platform",
                    status="READY",
                    destination_masked="https://api.communityhub.example/••••/rcs-results",
                ),
                Organisation(
                    organisation_id="OTHERORG",
                    name="Other Org",
                    description="Another customer",
                    status="READY",
                    destination_masked="https://other.example/••••",
                ),
                ClientUser(
                    user_id="ch-user-17",
                    login_hash=self.password_hash,
                    display_name="Taylor Brooks",
                    organisation_id=COMMUNITYHUB_ID,
                ),
            ])

    def tearDown(self) -> None:
        shutil.rmtree(self.upload_root)

    # ---- helpers ----

    def staff_headers(self, staff_id: str) -> dict[str, str]:
        response = self.client.post("/api/staff/login", json={"staff_id": staff_id, "password": PASSWORD})
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": f"Bearer {response.json()['token']}"}

    def client_headers(self) -> dict[str, str]:
        response = self.client.post("/api/client/login", json={"user_id": "ch-user-17", "password": PASSWORD})
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": f"Bearer {response.json()['token']}"}

    def add_case(self, case_id: str, **fields) -> None:
        values = {
            "assigned_auditor_id": "auditor-1",
            "status": "READY_FOR_REVIEW",
            "watson_severity_score": 50,
            "effective_severity_score": 50,
            "severity_tier": "S2",
        }
        values.update(fields)
        with self.Session.begin() as db:
            db.add(Case(case_id=case_id, **values))

    def resolve(self, case_id: str, outcome: str = "POLICY_VIOLATION_FOUND") -> None:
        response = self.client.post(
            f"/api/auditor/cases/{case_id}/resolve",
            json={"final_outcome": outcome},
            headers=self.staff_headers("auditor-1"),
        )
        self.assertEqual(response.status_code, 200, response.text)

    def make_due(self, delivery_id: str, **fields) -> None:
        with self.Session.begin() as db:
            delivery = db.get(Delivery, delivery_id)
            delivery.next_attempt_at = datetime.now(timezone.utc) - timedelta(seconds=1)
            for key, value in fields.items():
                setattr(delivery, key, value)

    def add_report(self, report_id: str, *, status: str, organisation_id: str = COMMUNITYHUB_ID) -> None:
        with self.Session.begin() as db:
            db.add(ServiceReport(
                report_id=report_id,
                organisation_id=organisation_id,
                period_start="2026-08-01",
                period_end="2026-08-31",
                status=status,
                version=1,
                generated_at=datetime.now(timezone.utc),
                released_at=datetime.now(timezone.utc) if status == "RELEASED" else None,
                released_by="manager-1" if status == "RELEASED" else None,
                metrics={"cases_completed": 1},
            ))

    # ---- result handoff ----

    def test_final_decision_queues_one_delivery_that_the_public_sees_only_once_delivered(self) -> None:
        self.add_case("RCS-AAAA-0001")
        self.resolve("RCS-AAAA-0001")

        with self.Session() as db:
            deliveries = db.scalars(select(Delivery)).all()
        self.assertEqual(len(deliveries), 1)
        self.assertEqual(deliveries[0].delivery_id, "DEL-RCS-AAAA-0001")
        self.assertEqual(deliveries[0].delivery_status, "PENDING")
        self.assertEqual(deliveries[0].final_severity, "S2")

        status = self.client.get("/api/status/RCS-AAAA-0001").json()
        self.assertEqual(status["status"], "Complete")
        self.assertFalse(status["public_delivery_confirmed"])

        self.make_due("DEL-RCS-AAAA-0001")
        status = self.client.get("/api/status/RCS-AAAA-0001").json()
        self.assertTrue(status["public_delivery_confirmed"])
        # Delivery details never cross the public boundary.
        self.assertNotIn("delivery_status", status)
        self.assertNotIn("delivery_id", status)

    def test_auditor_override_sets_the_delivered_severity(self) -> None:
        self.add_case("RCS-AAAA-0002")
        response = self.client.post(
            "/api/auditor/cases/RCS-AAAA-0002/resolve",
            json={
                "final_outcome": "POLICY_VIOLATION_FOUND",
                "auditor_severity_score": 90,
                "auditor_comment": "More severe than the AI tier.",
            },
            headers=self.staff_headers("auditor-1"),
        )
        self.assertEqual(response.status_code, 200, response.text)
        with self.Session() as db:
            self.assertEqual(db.get(Delivery, "DEL-RCS-AAAA-0002").final_severity, "S4")

    def test_failed_delivery_retries_automatically_then_waits_for_the_manager(self) -> None:
        self.add_case("RCS-AAAA-0003")
        self.resolve("RCS-AAAA-0003")
        # Make every automatic attempt due at once; the simulated endpoint times out.
        with self.Session.begin() as db:
            delivery = db.get(Delivery, "DEL-RCS-AAAA-0003")
            delivery.simulate_failure = 1
            delivery.next_attempt_at = datetime.now(timezone.utc) - timedelta(minutes=5)

        manager = self.staff_headers("manager-1")
        listed = self.client.get("/api/manager/deliveries", headers=manager).json()
        self.assertEqual(listed[0]["delivery_status"], "NEEDS_ATTENTION")
        self.assertEqual(len(listed[0]["attempts"]), 3)
        self.assertEqual(listed[0]["moderation_status"], "COMPLETE")
        self.assertTrue(listed[0]["case_available"])

        # The failed handoff never reopens the case.
        with self.Session() as db:
            self.assertEqual(db.get(Case, "RCS-AAAA-0003").status, "COMPLETE")

        retried = self.client.post("/api/manager/deliveries/DEL-RCS-AAAA-0003/retry", headers=manager).json()
        self.assertEqual(retried["delivery_id"], "DEL-RCS-AAAA-0003")
        self.assertEqual(retried["delivery_status"], "SUCCESS")
        self.assertTrue(retried["attempts"][-1]["manual"])

        # Retrying a delivered result is idempotent: nothing is sent twice.
        again = self.client.post("/api/manager/deliveries/DEL-RCS-AAAA-0003/retry", headers=manager).json()
        self.assertEqual(len(again["attempts"]), len(retried["attempts"]))

    def test_escalation_needs_a_note(self) -> None:
        self.add_case("RCS-AAAA-0004")
        self.resolve("RCS-AAAA-0004")
        manager = self.staff_headers("manager-1")
        blank = self.client.post(
            "/api/manager/deliveries/DEL-RCS-AAAA-0004/escalate", json={"note": "  "}, headers=manager,
        )
        self.assertEqual(blank.status_code, 400)
        ok = self.client.post(
            "/api/manager/deliveries/DEL-RCS-AAAA-0004/escalate",
            json={"note": "Endpoint timing out since 09:00."},
            headers=manager,
        )
        self.assertEqual(ok.json(), {"escalated": True})
        detail = self.client.get("/api/manager/deliveries/DEL-RCS-AAAA-0004", headers=manager).json()
        self.assertIsNotNone(detail["escalated_at"])

    def test_closed_without_reassignment_is_not_handed_off(self) -> None:
        self.add_case("RCS-AAAA-0005", manager_flag="DECLINED", status="DECLINED")
        response = self.client.post(
            "/api/manager/cases/RCS-AAAA-0005/close",
            json={"note": "Duplicate report."},
            headers=self.staff_headers("manager-1"),
        )
        self.assertEqual(response.status_code, 200, response.text)
        with self.Session() as db:
            self.assertEqual(db.scalars(select(Delivery)).all(), [])

    def test_reporter_source_link_travels_with_the_result(self) -> None:
        response = self.client.post(
            "/api/reports",
            files={"video": ("clip.mp4", b"\x00\x00\x00\x10ftypisom\x00\x00\x00\x00", "application/octet-stream")},
            data={"source_url": "https://communityhub.example/post/4721"},
        )
        self.assertEqual(response.status_code, 201, response.text)
        case_id = response.json()["case_id"]
        with self.Session.begin() as db:
            self.assertEqual(db.get(CaseSource, case_id).source_url, "https://communityhub.example/post/4721")
            case = db.get(Case, case_id)
            case.status = "READY_FOR_REVIEW"
            case.assigned_auditor_id = "auditor-1"
            case.severity_tier = "S1"
        self.resolve(case_id, "NO_VIOLATION_FOUND")
        with self.Session() as db:
            delivery = db.scalars(select(Delivery).where(Delivery.case_id == case_id)).one()
        self.assertEqual(delivery.source_url, "https://communityhub.example/post/4721")

    def test_report_without_a_source_still_works(self) -> None:
        response = self.client.post(
            "/api/reports",
            files={"video": ("clip.mp4", b"\x00\x00\x00\x10ftypisom\x00\x00\x00\x00", "application/octet-stream")},
        )
        self.assertEqual(response.status_code, 201, response.text)
        with self.Session() as db:
            self.assertEqual(db.scalars(select(CaseSource)).all(), [])

    def test_release_at_limit_returns_the_case_to_the_manager(self) -> None:
        self.add_case("RCS-AAAA-0006")
        response = self.client.post(
            "/api/auditor/cases/RCS-AAAA-0006/release-at-limit", headers=self.staff_headers("auditor-1"),
        )
        self.assertEqual(response.json(), {"returned": True})
        with self.Session() as db:
            self.assertEqual(db.get(Case, "RCS-AAAA-0006").manager_flag, "DECLINED")
            log = db.scalars(select(AuditLog).where(AuditLog.case_id == "RCS-AAAA-0006")).one()
        self.assertEqual(log.after_value["reason"], "NEAR_EXPOSURE_LIMIT")

    # ---- customer integration ----

    def test_customer_integration_and_test_connection(self) -> None:
        manager = self.staff_headers("manager-1")
        integration = self.client.get("/api/manager/customers/communityhub", headers=manager).json()
        self.assertEqual(integration["organisation_id"], COMMUNITYHUB_ID)
        self.assertEqual(integration["status"], "READY")
        self.assertIn("••••", integration["destination_masked"])
        result = self.client.post("/api/manager/customers/COMMUNITYHUB/test", headers=manager).json()
        self.assertTrue(result["ok"])
        missing = self.client.get("/api/manager/customers/NOPE", headers=manager)
        self.assertEqual(missing.status_code, 404)

    # ---- reports ----

    def test_manager_generates_notes_and_releases_a_report(self) -> None:
        self.add_case("RCS-AAAA-0007")
        self.resolve("RCS-AAAA-0007")
        today = datetime.now(timezone.utc).date().isoformat()
        manager = self.staff_headers("manager-1")

        draft = self.client.post(
            "/api/manager/reports",
            json={"organisation_id": "COMMUNITYHUB", "period_start": today, "period_end": today},
            headers=manager,
        ).json()
        self.assertEqual(draft["status"], "DRAFT")
        self.assertEqual(draft["metrics"]["cases_completed"], 1)
        self.assertEqual(draft["metrics"]["violation_count"], 1)
        self.assertEqual(draft["metrics"]["severity_breakdown"]["S2"], 1)

        report_id = draft["report_id"]
        noted = self.client.put(
            f"/api/manager/reports/{report_id}/note", json={"note": "Quiet day."}, headers=manager,
        ).json()
        self.assertEqual(noted["manager_note"], "Quiet day.")

        # Regenerating a draft refreshes the figures and keeps the note.
        again = self.client.post(
            "/api/manager/reports",
            json={"organisation_id": "COMMUNITYHUB", "period_start": today, "period_end": today},
            headers=manager,
        ).json()
        self.assertEqual(again["report_id"], report_id)
        self.assertEqual(again["manager_note"], "Quiet day.")

        released = self.client.post(f"/api/manager/reports/{report_id}/release", headers=manager).json()
        self.assertEqual(released["status"], "RELEASED")
        self.assertEqual(released["released_by"], "manager-1")
        locked = self.client.put(
            f"/api/manager/reports/{report_id}/note", json={"note": "Edit"}, headers=manager,
        )
        self.assertEqual(locked.status_code, 409)

        # A new run for a released period becomes version 2.
        v2 = self.client.post(
            "/api/manager/reports",
            json={"organisation_id": "COMMUNITYHUB", "period_start": today, "period_end": today},
            headers=manager,
        ).json()
        self.assertEqual(v2["version"], 2)
        self.assertTrue(v2["report_id"].endswith("-v2"))

    def test_invalid_period_is_rejected(self) -> None:
        manager = self.staff_headers("manager-1")
        for start, end in (("2026-09-30", "2026-09-01"), ("2026-13-01", "2026-13-02"), ("yesterday", "today")):
            with self.subTest(start=start, end=end):
                response = self.client.post(
                    "/api/manager/reports",
                    json={"organisation_id": "COMMUNITYHUB", "period_start": start, "period_end": end},
                    headers=manager,
                )
                self.assertEqual(response.status_code, 400)

    def test_manager_endpoints_refuse_auditors_and_clients(self) -> None:
        auditor = self.staff_headers("auditor-1")
        client = self.client_headers()
        for path in ("/api/manager/deliveries", "/api/manager/reports", "/api/manager/governance"):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path, headers=auditor).status_code, 403)
                self.assertEqual(self.client.get(path, headers=client).status_code, 401)
                self.assertEqual(self.client.get(path).status_code, 401)

    # ---- client access ----

    def test_client_sees_only_released_reports_for_their_organisation(self) -> None:
        self.add_report("RPT-CH-2026-08", status="RELEASED")
        self.add_report("RPT-CH-2026-09", status="DRAFT")
        self.add_report("RPT-OT-2026-08", status="RELEASED", organisation_id="OTHERORG")
        client = self.client_headers()

        listed = self.client.get("/api/client/reports", headers=client).json()
        self.assertEqual([r["report_id"] for r in listed], ["RPT-CH-2026-08"])
        self.assertEqual(listed[0]["released_by"], "RCS")

        viewed = self.client.get("/api/client/reports/RPT-CH-2026-08", headers=client)
        self.assertEqual(viewed.status_code, 200)
        self.assertEqual(viewed.json()["released_by"], "RCS")

        for report_id in ("RPT-CH-2026-09", "RPT-OT-2026-08", "RPT-NOPE"):
            with self.subTest(report_id=report_id):
                denied = self.client.get(f"/api/client/reports/{report_id}", headers=client)
                self.assertEqual(denied.status_code, 404)
                self.assertEqual(denied.json()["detail"], "Report not found")

        download = self.client.post("/api/client/reports/RPT-CH-2026-08/download", headers=client)
        self.assertEqual(download.json(), {"recorded": True})

        with self.Session() as db:
            entries = {(e.report_id, e.action, e.access_result, e.reason) for e in db.scalars(select(ReportAccess))}
        self.assertEqual(entries, {
            ("RPT-CH-2026-08", "VIEW", "SUCCESS", None),
            ("RPT-CH-2026-09", "VIEW", "DENIED", "REPORT_NOT_RELEASED"),
            ("RPT-OT-2026-08", "VIEW", "DENIED", "WRONG_ORGANISATION"),
            ("RPT-NOPE", "VIEW", "DENIED", "REPORT_NOT_FOUND"),
            ("RPT-CH-2026-08", "DOWNLOAD", "SUCCESS", None),
        })

        access = self.client.get(
            "/api/manager/reports/RPT-CH-2026-08/access", headers=self.staff_headers("manager-1"),
        ).json()
        self.assertEqual({a["action"] for a in access}, {"VIEW", "DOWNLOAD"})

    def test_client_sign_in_rejects_staff_and_locks_after_repeated_failures(self) -> None:
        staff = self.client.post("/api/client/login", json={"user_id": "manager-1", "password": PASSWORD})
        self.assertEqual(staff.status_code, 401)
        # A client token is not a staff token.
        client = self.client_headers()
        self.assertEqual(self.client.get("/api/auditor/cases", headers=client).status_code, 401)
        # And a staff token is not a client token.
        self.assertEqual(
            self.client.get("/api/client/reports", headers=self.staff_headers("manager-1")).status_code, 401,
        )

        codes = [
            self.client.post("/api/client/login", json={"user_id": "ch-user-17", "password": "wrong"}).status_code
            for _ in range(5)
        ]
        self.assertEqual(codes, [401, 401, 401, 401, 429])
        locked = self.client.post("/api/client/login", json={"user_id": "ch-user-17", "password": PASSWORD})
        self.assertEqual(locked.status_code, 429)

    # ---- demo seed ----

    def test_demo_seed_tells_the_full_story(self) -> None:
        now = datetime.now(timezone.utc)
        with self.Session() as db:
            db.query(ClientUser).delete()
            db.query(Organisation).delete()
            db.commit()
            completed = Case(
                case_id="RCS-SEED-0001",
                status="COMPLETE",
                assigned_auditor_id="auditor-1",
                severity_tier="S2",
                auditor_severity_score=25,
                final_outcome="NO_VIOLATION_FOUND",
                created_at=now - timedelta(hours=3),
                completed_at=now - timedelta(hours=2),
            )
            db.add(completed)
            db.commit()
            summary = seed_b2b(db, now, [completed], client_password="test123")

        released_start, _ = month_period(now.date(), -2)
        self.assertEqual(summary["released_report"], f"RPT-CH-{released_start[:7]}")
        with self.Session() as db:
            states = {d.delivery_status for d in db.scalars(select(Delivery))}
            self.assertEqual(states, {"SUCCESS", "PENDING", "RETRYING", "NEEDS_ATTENTION"})
            self.assertEqual(db.get(Delivery, "DEL-RCS-SEED-0001").final_severity, "S1")
            released = db.get(ServiceReport, summary["released_report"])
            self.assertGreater(released.metrics["cases_completed"], 0)

        login = self.client.post("/api/client/login", json={"user_id": "ch-user-17", "password": "test123"})
        self.assertEqual(login.status_code, 200)
        reports = self.client.get(
            "/api/client/reports", headers={"Authorization": f"Bearer {login.json()['token']}"},
        ).json()
        self.assertEqual([r["report_id"] for r in reports], [summary["released_report"]])


if __name__ == "__main__":
    unittest.main()
