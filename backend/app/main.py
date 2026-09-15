import logging
import re
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.assignment import select_auditor
from app.auth import create_session, get_session, verify_password
from app.cases import generate_case_id, get_public_status
from app.db import engine, get_db
from app.models import AuditLog, Auditor, Base, Case, FrameAnalysis
from app.rate_limit import is_locked_out, record_failed_attempt, record_success
from app.storage import verify_storage_connection
from app.uploads import validate_video

app = FastAPI(title="IBM RCS Backend")

# Dev-only: allow the local Vite frontend (different port = different
# origin) to call this API from the browser. Restrict this to the real
# frontend URL before Week3 deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://rcs-frontend-test.2e76lsq2uda9.ca-tor.codeengine.appdomain.cloud",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ibm-rcs-backend")

# Auto-create any missing tables on startup - a no-op if they already exist
# (e.g. local dev, where db_schema.sql was already applied by hand).
Base.metadata.create_all(bind=engine)

# UR-NFR-05: case IDs (10 uppercase-alnum chars, see cases.generate_case_id)
# must not appear in plain text in application logs.
_CASE_ID_PATTERN = re.compile(r"/(?:api/status|api/auditor/cases)/([A-Z0-9]{10})\b")


def _redact_case_id(path):
    return _CASE_ID_PATTERN.sub(lambda match: match.group(0).replace(match.group(1), "***"), path)


@app.middleware("http")
async def log_requests_with_redaction(request: Request, call_next):
    response = await call_next(request)
    logger.info("%s %s -> %s", request.method, _redact_case_id(request.url.path), response.status_code)
    return response


@app.get("/")
def root():
    return {
        "service": "IBM RCS Backend",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ibm-rcs-backend"
    }


@app.get("/storage-check")
def storage_check():
    try:
        return verify_storage_connection()
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail="Storage connection check failed"
        ) from error


@app.post("/api/reports")
async def create_report(video: UploadFile, db: Session = Depends(get_db)):
    file_bytes = await video.read()

    try:
        validate_video(video.filename, file_bytes)
    except ValueError as error:
        # UR-VU-06: tell the user why it failed and what formats are accepted.
        raise HTTPException(status_code=400, detail=str(error)) from error

    # Actual COS storage is still to be wired in - this creates the row so
    # the rest of the flow (status lookup, auditor queue) has something
    # real to work with.
    case_id = generate_case_id()
    case = Case(case_id=case_id, status="SUBMITTED")
    db.add(case)

    # T22: real weighted assignment, triggered automatically on creation -
    # no manual step. In production this call is made by Orchestrate's
    # workflow (see GET /api/assignment/select-auditor); calling the same
    # selection logic directly here keeps Week 1 working end-to-end even
    # before that Orchestrate wiring exists.
    assigned_id = assign_case_to_auditor(case, db)

    db.commit()

    return {
        "case_id": case_id,
        "status": get_public_status(case.status),
        "assigned_auditor": assigned_id,
    }


def _eligible_auditors(db):
    # Sprint 2: cooldown/exposure-cap exclusion is Sprint 3 - every auditor
    # is eligible for now, with exposure_minutes pinned to 0 (AR-AS-02).
    return [
        {
            "auditor_id": a.auditor_id,
            "exposure_minutes": a.exposure_minutes,
            "active_case_count": a.active_case_count,
            "last_assigned_at": a.last_assigned_at,
        }
        for a in db.query(Auditor).all()
    ]


def assign_case_to_auditor(case, db):
    chosen_id = select_auditor(_eligible_auditors(db))

    if chosen_id is None:
        return None

    auditor = db.get(Auditor, chosen_id)
    auditor.active_case_count += 1
    auditor.last_assigned_at = datetime.now(timezone.utc)

    case.assigned_auditor = chosen_id
    case.status = "AI_PROCESSING"

    db.add(
        AuditLog(
            case_id=case.case_id,
            actor="system",
            action="ASSIGNED",
            after_value={"assigned_auditor": chosen_id},
        )
    )

    return chosen_id


class SelectedAuditorResponse(BaseModel):
    auditor_id: str


@app.get("/api/assignment/select-auditor", response_model=SelectedAuditorResponse)
def get_selected_auditor(db: Session = Depends(get_db)):
    # T17 AC: called by Orchestrate's selection step instead of picking
    # randomly. Read-only - does not assign or mutate state.
    chosen_id = select_auditor(_eligible_auditors(db))

    if chosen_id is None:
        raise HTTPException(status_code=503, detail="No eligible auditors")

    return {"auditor_id": chosen_id}


def get_current_auditor(authorization: str = Header(...)):
    session = get_session(authorization.removeprefix("Bearer "))

    if session is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return session


@app.post("/api/staff/login")
def staff_login(auditor_id: str, password: str, db: Session = Depends(get_db)):
    auditor = db.get(Auditor, auditor_id)

    if auditor is None or not verify_password(password, auditor.login_hash):
        # Generic message either way - don't reveal whether the ID exists.
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_session(auditor.auditor_id, auditor.role)

    return {"token": token, "role": auditor.role}


@app.get("/api/status/{case_id}")
def get_status(case_id: str, request: Request, db: Session = Depends(get_db)):
    client_key = request.client.host if request.client else "unknown"

    if is_locked_out(client_key):
        # UR-ST-07: 15-minute lockout after repeated invalid lookups.
        raise HTTPException(
            status_code=429,
            detail="Too many invalid attempts. Try again later.",
        )

    # UR-ST-08: same generic response whether the ID format is valid or not.
    case = db.get(Case, case_id)

    if case is None:
        record_failed_attempt(client_key)
        raise HTTPException(status_code=404, detail="Case not found")

    record_success(client_key)

    return {
        "case_id": case.case_id,
        "status": get_public_status(case.status),
        "final_outcome": case.final_outcome if case.status == "COMPLETE" else None,
    }


@app.get("/api/auditor/cases")
def list_auditor_cases(
    auditor=Depends(get_current_auditor), db: Session = Depends(get_db)
):
    # AR-AS-01: only cases assigned to the authenticated auditor.
    cases = (
        db.query(Case)
        .filter(Case.assigned_auditor == auditor["auditor_id"])
        .all()
    )

    return [
        {"case_id": case.case_id, "status": case.status, "severity_tier": case.severity_tier}
        for case in cases
    ]


@app.get("/api/auditor/cases/{case_id}")
def get_auditor_case_detail(
    case_id: str, auditor=Depends(get_current_auditor), db: Session = Depends(get_db)
):
    case = db.get(Case, case_id)

    if case is None or case.assigned_auditor != auditor["auditor_id"]:
        # AR-AS-01: an auditor's request for a case not assigned to them
        # gets the same "not found" response as a real missing case.
        raise HTTPException(status_code=404, detail="Case not found")

    return {
        "case_id": case.case_id,
        "status": case.status,
        "watson_severity_score": case.watson_severity_score,
        "effective_severity_score": case.effective_severity_score,
        "severity_tier": case.severity_tier,
        "narrative_summary": case.narrative_summary,
        "incident_timeline": case.incident_timeline,
    }


@app.post("/api/internal/mock-ai-result")
def insert_mock_ai_result(case_id: str, db: Session = Depends(get_db)):
    # Week1 placeholder standing in for the real watsonx.ai pipeline (Week2).
    case = db.get(Case, case_id)

    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    case.watson_severity_score = 72
    case.effective_severity_score = 72
    case.severity_tier = "S3"
    case.narrative_summary = "Mock: physical altercation detected between two people."
    case.incident_timeline = [{"start": 12, "end": 20, "severity_tier": "S3"}]
    case.status = "READY_FOR_REVIEW"

    db.add(
        FrameAnalysis(
            case_id=case_id,
            frame_num="frame-00001",
            timestamp=12,
            tags=["physical_violence"],
            watson_severity_score=72,
            effective_severity_score=72,
            severity_tier="S3",
            reasoning="Mock frame result for Week 1 testing.",
            entities=["person", "person"],
            model_id="mock-model",
            model_version=None,
            prompt_version="1.0",
            decision_timestamp=datetime.now(timezone.utc),
        )
    )

    db.commit()

    return {"case_id": case_id, "status": case.status}


@app.post("/api/auditor/cases/{case_id}/resolve")
def resolve_case(
    case_id: str,
    final_outcome: str,
    auditor_severity_score: int | None = None,
    auditor_comment: str | None = None,
    auditor=Depends(get_current_auditor),
    db: Session = Depends(get_db),
):
    case = db.get(Case, case_id)

    if case is None or case.assigned_auditor != auditor["auditor_id"]:
        raise HTTPException(status_code=404, detail="Case not found")

    # AR-AI-07: a comment is required whenever the AI rating is overridden.
    if auditor_severity_score is not None and not auditor_comment:
        raise HTTPException(
            status_code=400,
            detail="A comment is required when overriding the AI severity score",
        )

    case.auditor_severity_score = auditor_severity_score
    case.auditor_comment = auditor_comment
    case.final_outcome = final_outcome
    case.status = "COMPLETE"
    case.completed_at = datetime.now(timezone.utc)

    db.commit()

    return {"case_id": case_id, "status": get_public_status(case.status), "final_outcome": final_outcome}


@app.post("/api/auditor/cases/{case_id}/decline")
def decline_case(case_id: str):
    return {
        "case_id": case_id,
        "status": "Declined",
        "routed_to": "Manager Queue"
    }


@app.get("/api/manager/dashboard")
def manager_dashboard():
    return {
        "auditors": [],
        "pending_declined_cases": 0
    }
