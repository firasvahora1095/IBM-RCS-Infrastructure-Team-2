from datetime import datetime, timezone

DAILY_EXPOSURE_CAP_MINUTES = 120
CASE_RATIO_REFERENCE = 10  # scaling constant only, not an enforcement cap


def calculate_score(exposure_minutes, active_case_count):
    # AR-AS-02: exposure ratio pinned to 0 in Sprint 2 (no exposure tracking
    # yet - Sprint 3), so exposure_minutes is always 0 for now, but the
    # formula is written in full so it's ready when Sprint 3 wires it up.
    exposure_ratio = exposure_minutes / DAILY_EXPOSURE_CAP_MINUTES
    case_ratio = active_case_count / CASE_RATIO_REFERENCE
    return 0.6 * exposure_ratio + 0.4 * case_ratio


def select_auditor(auditors):
    """
    auditors: list of dicts with auditor_id, exposure_minutes,
    active_case_count, last_assigned_at. Cooldown/exposure-cap exclusion
    is Sprint 3 - Sprint 2 assumes all passed-in auditors are eligible.
    """
    if not auditors:
        return None

    scored = [
        (calculate_score(a["exposure_minutes"], a["active_case_count"]), a)
        for a in auditors
    ]
    lowest_score = min(score for score, _ in scored)
    tied = [a for score, a in scored if score == lowest_score]

    if len(tied) == 1:
        return tied[0]["auditor_id"]

    # Round-robin: the auditor who hasn't received a new case in the
    # longest time (None = never assigned, so they go first).
    tied.sort(key=lambda a: a["last_assigned_at"] or datetime.min.replace(tzinfo=timezone.utc))
    return tied[0]["auditor_id"]
