"""The rights and access of each role, one row per endpoint, proven against the real API.

The table in docs/ux/super-admin-rights-and-access.md is generated from the same idea:
if a row there is wrong, this test fails. Rows marked (S) change state, so each one runs
on a freshly seeded database.
"""

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
from app.db import get_db
from app.main import app
from app.models import Auditor, Base, Case

PASSWORD = "correct horse battery staple"
ROLES = ("anonymous", "standard auditor", "super admin", "manager")
LOGIN = {"standard auditor": "auditor-1", "super admin": "superadmin-1", "manager": "manager-1"}

# (label, method, path, json body, expected status for ROLES in order)
MATRIX = [
    # What only the Super Admin gets
    ("see every open case (queue metadata)", "GET", "/api/auditor/all-cases", None, (401, 403, 200, 403)),
    ("take an unowned case (S)", "POST", "/api/auditor/cases/FREE1/take", None, (401, 403, 200, 403)),
    # Shared between the Super Admin and the Manager
    ("make an unowned case available (S)", "POST", "/api/cases/FREE1/make-available", None, (401, 403, 200, 200)),
    # What every Auditor, the Super Admin included, has
    ("own queue", "GET", "/api/auditor/cases", None, (401, 200, 200, 403)),
    ("open a case they own", "GET", "/api/auditor/cases/OWNED1", None, (401, 200, 404, 403)),
    ("open a case someone else owns", "GET", "/api/auditor/cases/OWNED2", None, (401, 404, 404, 403)),
    ("list cases released for claiming", "GET", "/api/auditor/available-cases", None, (401, 200, 200, 403)),
    ("claim a released case (S)", "POST", "/api/auditor/cases/POOL1/claim", None, (401, 200, 200, 403)),
    ("own wellbeing and exposure", "GET", "/api/auditor/wellbeing", None, (401, 200, 200, 403)),
    # What only a Manager has: the Super Admin does not
    ("manager case oversight", "GET", "/api/manager/cases", None, (401, 403, 403, 200)),
    ("manager auditor overview", "GET", "/api/manager/auditors", None, (401, 403, 403, 200)),
    ("manager SOS inbox", "GET", "/api/manager/sos-alerts", None, (401, 403, 403, 200)),
    ("manager deliveries", "GET", "/api/manager/deliveries", None, (401, 403, 403, 200)),
    ("set an Auditor's exposure limit (S)", "PUT", "/api/manager/auditors/auditor-1/exposure-limit", {"minutes": 90}, (401, 403, 403, 200)),
    ("reassign a case (S)", "POST", "/api/manager/cases/OWNED1/reassign", {"auditor_id": "auditor-2"}, (401, 403, 403, 200)),
]


class AsgiClient:
    def request(self, method: str, path: str, **kwargs) -> httpx.Response:
        async def send() -> httpx.Response:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                return await client.request(method, path, **kwargs)

        return asyncio.run(send())


class AccessMatrixTests(unittest.TestCase):
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

    def seed(self) -> None:
        Base.metadata.drop_all(self.engine)
        Base.metadata.create_all(self.engine)
        session_store.clear()
        now = datetime.now(timezone.utc)
        with self.Session.begin() as db:
            for staff_id, role, sa in (
                ("auditor-1", "auditor", False),
                ("auditor-2", "auditor", False),
                ("superadmin-1", "auditor", True),
                ("manager-1", "manager", False),
            ):
                db.add(
                    Auditor(
                        auditor_id=staff_id,
                        login_hash=self.password_hash,
                        role=role,
                        is_super_admin=sa,
                        exposure_last_reset_at=now,
                    )
                )
            db.add_all(
                [
                    Case(case_id="OWNED1", assigned_auditor_id="auditor-1", status="READY_FOR_REVIEW", severity_tier="S2"),
                    Case(case_id="OWNED2", assigned_auditor_id="auditor-2", status="READY_FOR_REVIEW", severity_tier="S2"),
                    Case(case_id="FREE1", status="READY_FOR_REVIEW", severity_tier="S2", case_visibility="SUPER_ADMIN_ONLY"),
                    Case(case_id="POOL1", status="READY_FOR_REVIEW", severity_tier="S1", case_visibility="AVAILABLE_TO_AUDITORS"),
                ]
            )

    def headers(self, role: str) -> dict[str, str]:
        if role == "anonymous":
            return {}
        r = self.client.request("POST", "/api/staff/login", json={"staff_id": LOGIN[role], "password": PASSWORD})
        return {"Authorization": f"Bearer {r.json()['token']}"}

    def test_every_role_gets_exactly_the_access_the_matrix_says(self) -> None:
        for label, method, path, body, expected in MATRIX:
            for role, want in zip(ROLES, expected):
                with self.subTest(right=label, role=role):
                    self.seed()
                    kwargs = {"headers": self.headers(role)}
                    if body is not None:
                        kwargs["json"] = body
                    got = self.client.request(method, path, **kwargs).status_code
                    self.assertEqual(got, want, f"{role} / {label}: expected {want}, got {got}")

    def test_the_super_admin_flag_cannot_be_claimed_by_a_manager_or_another_role(self) -> None:
        self.seed()
        with self.Session.begin() as db:
            db.get(Auditor, "manager-1").is_super_admin = True
        r = self.client.request("POST", "/api/staff/login", json={"staff_id": "manager-1", "password": PASSWORD}).json()
        self.assertFalse(r["is_super_admin"])  # a Manager is never reported as one
        h = {"Authorization": f"Bearer {r['token']}"}
        self.assertEqual(self.client.request("GET", "/api/auditor/all-cases", headers=h).status_code, 403)

    def test_the_super_admin_is_still_bound_by_wellbeing_when_taking_a_case(self) -> None:
        self.seed()
        with self.Session.begin() as db:
            db.get(Auditor, "superadmin-1").exposure_minutes = 120
        r = self.client.request("POST", "/api/auditor/cases/FREE1/take", headers=self.headers("super admin"))
        self.assertEqual(r.status_code, 409)


if __name__ == "__main__":
    unittest.main()
