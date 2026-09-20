"""Mapping between internal workflow states and public-safe labels."""

PUBLIC_STATUS_LABELS = {
    "SUBMITTED": "Received",
    "AI_PROCESSING": "Being Reviewed",
    "READY_FOR_REVIEW": "Being Reviewed",
    "AUDITOR_REVIEW": "Being Reviewed",
    "COMPLETE": "Complete",
}


def public_status(internal_status: str) -> str:
    """Return only a status label approved for the accountless public view."""
    return PUBLIC_STATUS_LABELS.get(internal_status, "Received")
