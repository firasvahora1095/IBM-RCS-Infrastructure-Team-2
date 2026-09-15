import secrets
import string

CASE_ID_ALPHABET = string.ascii_uppercase + string.digits

# Internal DB/API states vs. public labels shown to the Normal User (UR-ST-02).
# Internal states are never exposed directly - see Jana's T7 mapping table.
PUBLIC_STATUS_LABELS = {
    "SUBMITTED": "Received",
    "AI_PROCESSING": "Being Reviewed",
    "READY_FOR_REVIEW": "Being Reviewed",
    "AUDITOR_REVIEW": "Being Reviewed",
    "COMPLETE": "Complete",
}


def generate_case_id():
    # Non-sequential, non-guessable per UR-ID-08.
    return "".join(secrets.choice(CASE_ID_ALPHABET) for _ in range(10))


def get_public_status(internal_status):
    return PUBLIC_STATUS_LABELS.get(internal_status, "Received")
