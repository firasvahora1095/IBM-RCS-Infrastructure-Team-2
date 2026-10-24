import asyncio
import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite://")

import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import chat as chat_module
from app.auth import hash_password, session_store
from app.chat_context import (
    NO_VERIFIED_INFO_AUDITOR,
    build_context,
    find_case_ids,
    lookup_case,
    suggest_links,
)
from app.db import get_db
from app.main import app
from app.models import Auditor, Base, Case, Delivery
from app.severity import get_severity_tier

PASSWORD = "correct horse battery staple"


class AsgiClient:
    def post(self, path: str, **kwargs) -> httpx.Response:
        async def send() -> httpx.Response:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                return await client.post(path, **kwargs)

        return asyncio.run(send())


class AiBuddyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(
            "sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
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
        with self.Session.begin() as db:
            db.add_all(
                [
                    Auditor(auditor_id="auditor-1", login_hash=self.password_hash, role="auditor", exposure_minutes=47.4),
                    Auditor(auditor_id="auditor-2", login_hash=self.password_hash, role="auditor"),
                    Auditor(auditor_id="manager-1", login_hash=self.password_hash, role="manager"),
                    Case(
                        case_id="AR-2026-00417",
                        assigned_auditor_id="auditor-1",
                        status="READY_FOR_REVIEW",
                        severity_tier="S2",
                    ),
                    Case(
                        case_id="AR-2026-00500",
                        assigned_auditor_id="auditor-2",
                        status="COMPLETE",
                        severity_tier="S3",
                        auditor_severity_score=72,
                        final_outcome="POLICY_VIOLATION_FOUND",
                    ),
                    Delivery(
                        delivery_id="d-1",
                        case_id="AR-2026-00500",
                        organisation_id="org-1",
                        outcome="POLICY_VIOLATION_FOUND",
                        completed_at=datetime.now(timezone.utc),
                        delivery_status="NEEDS_ATTENTION",
                    ),
                ]
            )

    def headers(self, staff_id: str) -> dict[str, str]:
        response = self.client.post("/api/staff/login", json={"staff_id": staff_id, "password": PASSWORD})
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": f"Bearer {response.json()['token']}"}

    def ask(self, staff_id: str, message: str, history=None, reply: str = "Model reply."):
        with patch("app.chat.chat", return_value=reply) as model:
            response = self.client.post(
                "/api/chat",
                json={"message": message, "history": history or []},
                headers=self.headers(staff_id),
            )
        return response, model

    # --- case ID detection -------------------------------------------------

    def test_find_case_ids_skips_plain_words_and_uppercases(self) -> None:
        self.assertEqual(find_case_ids("what is happening with ar-2026-00417?"), ["AR-2026-00417"])
        self.assertEqual(find_case_ids("What happens at EXPOSURE LIMIT today"), [])

    # --- Level 3 lookup and who may see what ------------------------------

    def test_auditor_sees_own_case_with_real_tier_and_no_manager_fields(self) -> None:
        with self.Session() as db:
            summary = lookup_case(db, "auditor", "auditor-1", "AR-2026-00417")
        self.assertEqual(summary["status"], "Ready for Review")
        self.assertEqual(summary["ai_severity"], "S2")
        self.assertNotIn("delivery_status", summary)
        self.assertNotIn("assigned_auditor", summary)

    def test_auditor_cannot_look_up_another_auditors_case(self) -> None:
        with self.Session() as db:
            self.assertIsNone(lookup_case(db, "auditor", "auditor-1", "AR-2026-00500"))

    def test_manager_lookup_has_all_seven_fields_and_tier_not_raw_score(self) -> None:
        with self.Session() as db:
            summary = lookup_case(db, "manager", "manager-1", "AR-2026-00500")
        self.assertEqual(
            set(summary),
            {
                "case_id",
                "status",
                "ai_severity",
                "final_auditor_severity",
                "assigned_auditor",
                "final_outcome",
                "delivery_status",
            },
        )
        self.assertEqual(summary["final_auditor_severity"], get_severity_tier(72))
        self.assertEqual(summary["final_outcome"], "Violation Found")
        self.assertEqual(summary["delivery_status"], "NEEDS_ATTENTION")

    def test_a_completed_case_the_auditor_confirmed_shows_the_ai_tier_as_final(self) -> None:
        with self.Session.begin() as db:
            case = db.get(Case, "AR-2026-00500")
            case.auditor_severity_score = None
            case.status = "COMPLETE"
            ai_tier = case.severity_tier
        with self.Session() as db:
            summary = lookup_case(db, "manager", "manager-1", "AR-2026-00500")
        self.assertEqual(summary["final_auditor_severity"], ai_tier)

    def test_a_case_with_the_manager_never_names_who_declined_it(self) -> None:
        with self.Session.begin() as db:
            db.get(Case, "AR-2026-00500").manager_flag = "DECLINED"
            db.get(Case, "AR-2026-00500").status = "AUDITOR_REVIEW"
        with self.Session() as db:
            summary = lookup_case(db, "manager", "manager-1", "AR-2026-00500")
        self.assertEqual(summary["status"], "Manager Review")
        self.assertIsNone(summary["assigned_auditor"])

    def test_declined_case_shows_as_manager_review(self) -> None:
        with self.Session.begin() as db:
            db.get(Case, "AR-2026-00417").manager_flag = "DECLINED"
        with self.Session() as db:
            summary = lookup_case(db, "manager", "manager-1", "AR-2026-00417")
        self.assertEqual(summary["status"], "Manager Review")

    # --- Level 2 live values ----------------------------------------------

    def test_auditor_live_values_are_their_own_and_rounded(self) -> None:
        with self.Session() as db:
            ctx = build_context(db, "auditor", "auditor-1", "What is my exposure today?")
        self.assertEqual(ctx.live["your exposure today"], "47 of 120 min")
        self.assertEqual(ctx.live["your exposure remaining"], "73 min")
        self.assertEqual(ctx.live["your cooldown"], "none")
        self.assertEqual(ctx.live["your cases ready for review"], 1)

    def test_auditor_cooldown_is_reported_while_active(self) -> None:
        with self.Session.begin() as db:
            db.get(Auditor, "auditor-1").cooldown_ends_at = datetime.now(timezone.utc) + timedelta(minutes=20)
        with self.Session() as db:
            ctx = build_context(db, "auditor", "auditor-1", "Am I in cooldown?")
        self.assertIn("active", ctx.live["your cooldown"])

    def test_manager_live_values_count_failed_deliveries_and_open_cases(self) -> None:
        with self.Session() as db:
            ctx = build_context(db, "manager", "manager-1", "What needs my attention right now?")
        self.assertEqual(ctx.live["failed deliveries"], 1)
        self.assertEqual(ctx.live["open cases"], 1)
        self.assertEqual(ctx.live["open break requests"], 0)

    # --- the endpoint -------------------------------------------------------

    def test_requires_sign_in(self) -> None:
        response = self.client.post("/api/chat", json={"message": "hello"})
        self.assertEqual(response.status_code, 401)

    def test_reply_shape_for_a_case_lookup(self) -> None:
        response, model = self.ask("manager-1", "What is happening with AR-2026-00500?")
        body = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(body["reply"], "Model reply.")
        self.assertFalse(body["fallback"])
        self.assertEqual(body["case"]["case_id"], "AR-2026-00500")
        self.assertIn({"label": "Open case review", "to": "/manager/cases/AR-2026-00500/review"}, body["links"])
        self.assertTrue(body["live_as_of"])
        shown = model.call_args.args[2]
        self.assertEqual(shown["case lookup"]["delivery_status"], "NEEDS_ATTENTION")

    def test_other_auditors_case_gets_fixed_fallback_and_no_model_call(self) -> None:
        response, model = self.ask("auditor-1", "What is happening with AR-2026-00500?")
        body = response.json()
        self.assertEqual(body["reply"], NO_VERIFIED_INFO_AUDITOR)
        self.assertTrue(body["fallback"])
        self.assertIsNone(body["case"])
        model.assert_not_called()

    def test_unknown_case_id_gets_the_same_fallback(self) -> None:
        response, model = self.ask("auditor-1", "Tell me about AR-2026-99999")
        self.assertTrue(response.json()["fallback"])
        model.assert_not_called()

    def test_history_is_passed_to_the_model(self) -> None:
        history = [{"role": "user", "text": "What is SOS?"}, {"role": "assistant", "text": "SOS is urgent."}]
        _, model = self.ask("auditor-1", "And a check-in?", history=history)
        self.assertEqual(model.call_args.args[3], history)

    def test_distress_adds_fixed_safety_wording_for_auditors(self) -> None:
        response, _ = self.ask("auditor-1", "I feel overwhelmed by that last video")
        reply = response.json()["reply"]
        self.assertIn("SOS", reply)
        self.assertIn("Wellbeing check-in", reply)
        self.assertNotIn("Lifeline", reply)

    def test_crisis_wording_names_emergency_and_lifeline(self) -> None:
        response, _ = self.ask("auditor-1", "I want to hurt myself")
        reply = response.json()["reply"]
        self.assertIn("000", reply)
        self.assertIn("13 11 14", reply)

    def test_model_failure_returns_503_without_leaking_configuration(self) -> None:
        with patch("app.chat.chat", side_effect=RuntimeError("WATSONX_API_KEY missing")):
            response = self.client.post(
                "/api/chat", json={"message": "hello"}, headers=self.headers("auditor-1")
            )
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("WATSONX", response.text)

    # --- links and prompt ---------------------------------------------------

    def test_links_are_fixed_rules_and_capped_at_two(self) -> None:
        links = suggest_links("manager", "failed delivery and reassignment and sos alerts", None)
        self.assertEqual(len(links), 2)
        self.assertTrue(all(link["to"].startswith("/manager") for link in links))
        self.assertEqual(suggest_links("auditor", "how does cooldown work", None)[0]["to"], "/auditor/cooldown")

    def test_prompt_has_correct_name_guardrails_and_live_data(self) -> None:
        prompt = chat_module.build_system_prompt("auditor", {"your exposure today": "47 of 120 min"}, "2026-10-17T08:00:00")
        self.assertIn("Responsible Content Safety", prompt)
        self.assertNotIn("Rapid Case System", prompt)
        self.assertIn("## Never", prompt)
        self.assertIn("I don't have enough verified information", prompt)
        self.assertIn("your exposure today: 47 of 120 min", prompt)

    def test_only_recent_history_reaches_the_model(self) -> None:
        fake = MagicMock()
        fake.chat.return_value = {"choices": [{"message": {"content": " ok "}}]}
        long_history = [{"role": "user" if i % 2 == 0 else "assistant", "text": f"t{i}"} for i in range(12)]
        with patch.object(chat_module, "_get_model", return_value=fake):
            reply = chat_module.chat("now", "auditor", {}, long_history)
        sent = fake.chat.call_args.kwargs["messages"]
        self.assertEqual(reply, "ok")
        self.assertEqual(len(sent), 1 + chat_module.MAX_HISTORY_TURNS + 1)
        self.assertEqual(fake.chat.call_args.kwargs["params"]["temperature"], 0.2)


if __name__ == "__main__":
    unittest.main()
