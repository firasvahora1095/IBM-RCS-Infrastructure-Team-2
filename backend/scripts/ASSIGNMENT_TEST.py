"""
Standalone test of the AR-AS-02 weighted assignment formula and
round-robin tie-break. No DB/server required.
"""

from datetime import datetime, timedelta, timezone

from app.assignment import select_auditor

NOW = datetime.now(timezone.utc)


def test_lowest_case_count_wins():
    auditors = [
        {"auditor_id": "a1", "exposure_minutes": 0, "active_case_count": 5, "last_assigned_at": NOW},
        {"auditor_id": "a2", "exposure_minutes": 0, "active_case_count": 1, "last_assigned_at": NOW},
        {"auditor_id": "a3", "exposure_minutes": 0, "active_case_count": 3, "last_assigned_at": NOW},
    ]
    result = select_auditor(auditors)
    assert result == "a2", f"Expected a2 (lowest case count), got {result}"
    print("PASSED: lowest case-ratio auditor wins")


def test_tie_broken_by_round_robin():
    auditors = [
        {"auditor_id": "a1", "exposure_minutes": 0, "active_case_count": 2, "last_assigned_at": NOW},
        {"auditor_id": "a2", "exposure_minutes": 0, "active_case_count": 2, "last_assigned_at": NOW - timedelta(hours=2)},
    ]
    result = select_auditor(auditors)
    assert result == "a2", f"Expected a2 (assigned longest ago), got {result}"
    print("PASSED: tie broken by round-robin (longest since last assignment)")


def test_never_assigned_goes_first_in_tie():
    auditors = [
        {"auditor_id": "a1", "exposure_minutes": 0, "active_case_count": 0, "last_assigned_at": NOW},
        {"auditor_id": "a2", "exposure_minutes": 0, "active_case_count": 0, "last_assigned_at": None},
    ]
    result = select_auditor(auditors)
    assert result == "a2", f"Expected a2 (never assigned), got {result}"
    print("PASSED: never-assigned auditor wins a tie")


def test_no_eligible_auditors():
    result = select_auditor([])
    assert result is None
    print("PASSED: returns None when no eligible auditors")


if __name__ == "__main__":
    test_lowest_case_count_wins()
    test_tie_broken_by_round_robin()
    test_never_assigned_goes_first_in_tie()
    test_no_eligible_auditors()
    print("\nAll assignment tests passed.")
