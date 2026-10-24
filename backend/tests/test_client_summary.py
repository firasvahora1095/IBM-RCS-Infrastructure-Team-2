"""The client's key figures are worked out once on the server."""
import os
from datetime import datetime, timezone

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite://")

from app.b2b import case_results_summary
from app.models import Delivery


def delivery(i, outcome, status="SUCCESS", action=None):
    return Delivery(
        delivery_id=f"D{i}", case_id=f"C{i}", organisation_id="COMMUNITYHUB", outcome=outcome,
        final_severity=None, completed_at=datetime.now(timezone.utc), delivery_status=status,
        attempts=[], platform_action=action,
    )


def test_counts_and_rates_only_cover_results_that_reached_the_client():
    rows = [
        delivery(1, "POLICY_VIOLATION_FOUND", action="REMOVED"),
        delivery(2, "POLICY_VIOLATION_FOUND", action="KEPT"),
        delivery(3, "POLICY_VIOLATION_FOUND"),
        delivery(4, "NO_VIOLATION_FOUND", action="KEPT"),
        delivery(5, "NO_VIOLATION_FOUND"),
        delivery(6, "CLOSED_NO_REASSIGNMENT"),
        delivery(7, "POLICY_VIOLATION_FOUND", status="PENDING"),  # still on its way: not counted
    ]
    s = case_results_summary(rows)
    assert (s["delivered"], s["needs_action"], s["actioned"]) == (6, 3, 3)
    assert (s["violations"], s["decided"], s["not_reviewed"]) == (3, 5, 1)
    assert (s["removed"], s["kept"]) == (1, 2)
    assert s["needs_action_by_outcome"] == {
        "POLICY_VIOLATION_FOUND": 1, "NO_VIOLATION_FOUND": 1, "CLOSED_NO_REASSIGNMENT": 1,
    }
    assert s["violation_rate"] == 0.6 and s["actioned_rate"] == 0.5
    assert s["removal_rate"] == round(1 / 3, 4)


def test_rates_are_none_when_there_is_nothing_to_divide_by():
    s = case_results_summary([])
    assert s["delivered"] == 0
    assert s["violation_rate"] is None and s["removal_rate"] is None and s["actioned_rate"] is None
