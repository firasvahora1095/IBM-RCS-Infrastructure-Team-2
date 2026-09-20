"""Sprint 2 Week 1 API for the mocked end-to-end moderation flow."""

import hmac
import logging
import os
from datetime import datetime, timezone

from fastapi import (
    Depends,
    FastAPI,
    File,
    Header,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api_schemas import LoginRequest, MockAiResultRequest, ResolutionRequest, StaffRole
from app.auth import DUMMY_PASSWORD_HASH, StaffSession, session_store, verify_password
from app.assignment import NoEligibleAuditorError, select_auditor
from app.case_ids import generate_case_id
from app.case_status import public_status
from app.case_workflow import record_case_assignment
from app.db import get_db
from app.models import AuditLog, Auditor, Case
from app.orchestrate import (
    AssignmentOrchestrationError,
    AssignmentOrchestrator,
    build_assignment_orchestrator,
)
from app.rate_limit import status_lookup_limiter
from app.request_logging import install_access_log_redaction, redact_case_ids
from app.storage import delete_stored_video, store_video, verify_storage_connection
from app.uploads import InvalidVideoError, validate_video


install_access_log_redaction()
logger = logging.getLogger("ibm_rcs.api")
bearer_scheme = HTTPBearer(auto_error=False)

app = FastAPI(title="IBM RCS Backend", version="0.1.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type", "X-Internal-API-Key"],
)


@app.middleware("http")
async def log_request(request: Request, call_next):
    response = await call_next(request)
    logger.info(
        "%s %s -> %s",
        request.method,
        redact_case_ids(request.url.path),
        response.status_code,
    )
    return response


def _not_authenticated() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> StaffSession:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _not_authenticated()
    session = session_store.get(credentials.credentials)
    if session is None:
        raise _not_authenticated()
    return session


async def get_current_auditor(
    session: StaffSession = Depends(get_current_session),
) -> StaffSession:
    if session.role != StaffRole.AUDITOR.value:
        raise HTTPException(status_code=403, detail="Auditor access required")
    return session


async def get_current_manager(
    session: StaffSession = Depends(get_current_session),
) -> StaffSession:
    if session.role != StaffRole.MANAGER.value:
        raise HTTPException(status_code=403, detail="Manager access required")
    return session


async def require_internal_api_key(
    supplied_key: str | None = Header(default=None, alias="X-Internal-API-Key"),
) -> None:
    expected_key = os.getenv("INTERNAL_API_KEY")
    if not expected_key:
        raise HTTPException(status_code=503, detail="Internal API is not configured")
    if supplied_key is None or not hmac.compare_digest(supplied_key, expected_key):
        raise HTTPException(status_code=401, detail="Not authenticated")


async def get_assignment_orchestrator(
    db: Session = Depends(get_db),
) -> AssignmentOrchestrator:
    """Inject the assignment adapter so real and local flows share one path."""
    try:
        return build_assignment_orchestrator(db)
    except AssignmentOrchestrationError as error:
        raise HTTPException(
            status_code=503,
            detail="Assignment service is unavailable",
        ) from error


def _lookup_client_key(request: Request) -> str:
    # Do not trust X-Forwarded-For until a known reverse proxy is configured;
    # accepting it directly would let callers evade the limiter by spoofing it.
    return request.client.host if request.client else "unknown"


def _case_id_for_lookup(case_id: str) -> str:
    # Case IDs are generated uppercase; accepting lowercase avoids punishing a
    # public user for transcription casing without exposing format validity.
    return case_id.upper()


@app.get("/")
async def root():
    return {"service": "IBM RCS Backend", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ibm-rcs-backend"}


@app.get("/storage-check")
async def storage_check():
    try:
        return verify_storage_connection()
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail="Storage connection check failed",
        ) from error


@app.post("/api/reports", status_code=status.HTTP_201_CREATED)
async def create_report(
    video: UploadFile = File(...),
    db: Session = Depends(get_db),
    orchestrator: AssignmentOrchestrator = Depends(get_assignment_orchestrator),
):
    try:
        validated = validate_video(video.filename, video.file)
    except InvalidVideoError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    case_id = generate_case_id()
    while db.get(Case, case_id) is not None:
        case_id = generate_case_id()

    storage_reference: str | None = None
    try:
        storage_reference = store_video(
            case_id,
            validated.extension,
            video.file,
            validated.media_type,
        )
        case = Case(
            case_id=case_id,
            status="SUBMITTED",
            assigned_auditor_id=None,
            video_storage_path=storage_reference,
        )
        db.add(case)
        # Flush the parent row before adding its audit record. Without an ORM
        # relationship SQLAlchemy cannot infer the insert order from IDs alone.
        db.flush()
        db.add(
            AuditLog(
                case_id=case_id,
                actor="system",
                action="CASE_CREATED",
                after_value={"status": "SUBMITTED", "size_bytes": validated.size_bytes},
            )
        )
        db.flush()

        # Auditors never claim cases. The configured Orchestrate adapter owns
        # the assignment decision; this endpoint only validates and persists it.
        decision = await orchestrator.assign_case(case_id)
        selected_auditor = db.get(Auditor, decision.auditor_id)
        if selected_auditor is None or selected_auditor.role != "auditor":
            raise AssignmentOrchestrationError(
                "Orchestrate selected an invalid Auditor account"
            )
        record_case_assignment(db, case, decision)
        db.commit()
    except (
        AssignmentOrchestrationError,
        IntegrityError,
        OSError,
        RuntimeError,
    ) as error:
        db.rollback()
        if storage_reference is not None:
            try:
                delete_stored_video(storage_reference)
            except Exception:
                logger.exception("Failed to clean up stored video after case creation error")
        raise HTTPException(status_code=503, detail="Report could not be created") from error

    return {
        "case_id": case_id,
        "status": public_status("SUBMITTED"),
    }


@app.post("/api/internal/assignments/select-auditor")
async def select_auditor_for_orchestrate(
    _: None = Depends(require_internal_api_key),
    db: Session = Depends(get_db),
):
    """Return the weighted choice that a watsonx Orchestrate flow can use."""
    try:
        candidate = select_auditor(db)
    except NoEligibleAuditorError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    return {
        "auditor_id": candidate.auditor_id,
        "score": candidate.score,
        "active_case_count": candidate.active_case_count,
        "exposure_minutes": candidate.exposure_minutes,
    }


@app.post("/api/staff/login")
async def staff_login(payload: LoginRequest, db: Session = Depends(get_db)):
    staff = db.get(Auditor, payload.staff_id)
    password_hash = staff.login_hash if staff is not None else DUMMY_PASSWORD_HASH
    password_is_valid = verify_password(payload.password, password_hash)
    if staff is None or not password_is_valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token, session = session_store.create(staff.auditor_id, staff.role)
    return {
        "token": token,
        "role": session.role,
        "expires_at": datetime.fromtimestamp(
            session.expires_at,
            tz=timezone.utc,
        ).isoformat(),
    }


@app.post("/api/staff/logout", status_code=status.HTTP_204_NO_CONTENT)
async def staff_logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: StaffSession = Depends(get_current_session),
) -> None:
    del session
    if credentials is not None:
        session_store.invalidate(credentials.credentials)


@app.get("/api/status/{case_id}")
async def get_status(
    case_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    client_key = _lookup_client_key(request)
    if status_lookup_limiter.is_locked(client_key):
        raise HTTPException(
            status_code=429,
            detail="Status lookup temporarily unavailable. Try again later.",
        )

    case = db.get(Case, _case_id_for_lookup(case_id))
    if case is None:
        locked = status_lookup_limiter.record_failure(client_key)
        if locked:
            raise HTTPException(
                status_code=429,
                detail="Status lookup temporarily unavailable. Try again later.",
            )
        raise HTTPException(status_code=404, detail="Case not found")

    return {
        "case_id": case.case_id,
        "status": public_status(case.status),
        "final_outcome": case.final_outcome if case.status == "COMPLETE" else None,
        "submitted_at": case.created_at,
    }


@app.get("/api/auditor/cases")
async def list_auditor_cases(
    auditor: StaffSession = Depends(get_current_auditor),
    db: Session = Depends(get_db),
):
    assigned_cases = db.scalars(
        select(Case)
        .where(Case.assigned_auditor_id == auditor.staff_id)
        .order_by(Case.created_at.desc())
    ).all()
    return [
        {
            "case_id": case.case_id,
            "status": case.status,
            "severity_tier": case.severity_tier,
        }
        for case in assigned_cases
    ]


def _get_owned_case(db: Session, case_id: str, auditor_id: str) -> Case:
    case = db.scalar(
        select(Case).where(
            Case.case_id == _case_id_for_lookup(case_id),
            Case.assigned_auditor_id == auditor_id,
        )
    )
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@app.get("/api/auditor/cases/{case_id}")
async def get_auditor_case_detail(
    case_id: str,
    auditor: StaffSession = Depends(get_current_auditor),
    db: Session = Depends(get_db),
):
    case = _get_owned_case(db, case_id, auditor.staff_id)
    return {
        "case_id": case.case_id,
        "status": case.status,
        "watson_severity_score": case.watson_severity_score,
        "effective_severity_score": case.effective_severity_score,
        "severity_tier": case.severity_tier,
        "narrative_summary": case.narrative_summary,
        "incident_timeline": case.incident_timeline,
    }


@app.post("/api/internal/cases/{case_id}/mock-ai-result")
async def insert_mock_ai_result(
    case_id: str,
    payload: MockAiResultRequest,
    _: None = Depends(require_internal_api_key),
    db: Session = Depends(get_db),
):
    case = db.get(Case, _case_id_for_lookup(case_id))
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.status == "COMPLETE":
        raise HTTPException(status_code=409, detail="Completed cases cannot be changed")
    if any(entry.end < entry.start for entry in payload.incident_timeline):
        raise HTTPException(status_code=422, detail="Timeline end must not precede start")

    before = {
        "status": case.status,
        "effective_severity_score": case.effective_severity_score,
        "severity_tier": case.severity_tier,
    }
    case.watson_severity_score = payload.watson_severity_score
    case.effective_severity_score = payload.effective_severity_score
    case.severity_tier = payload.severity_tier.value
    case.narrative_summary = payload.narrative_summary
    case.incident_timeline = [entry.model_dump(mode="json") for entry in payload.incident_timeline]
    case.status = "READY_FOR_REVIEW"
    db.add(
        AuditLog(
            case_id=case.case_id,
            actor="mock-ai",
            action="MOCK_AI_RESULT_INSERTED",
            before_value=before,
            after_value={
                "status": case.status,
                "effective_severity_score": case.effective_severity_score,
                "severity_tier": case.severity_tier,
            },
        )
    )
    db.commit()
    return {"case_id": case.case_id, "status": case.status}


@app.post("/api/auditor/cases/{case_id}/resolve")
async def resolve_case(
    case_id: str,
    payload: ResolutionRequest,
    auditor: StaffSession = Depends(get_current_auditor),
    db: Session = Depends(get_db),
):
    case = _get_owned_case(db, case_id, auditor.staff_id)
    if case.status not in {"READY_FOR_REVIEW", "AUDITOR_REVIEW"}:
        raise HTTPException(status_code=409, detail="Case is not ready for resolution")

    comment = payload.auditor_comment.strip() if payload.auditor_comment else None
    is_override = (
        payload.auditor_severity_score is not None
        and payload.auditor_severity_score != case.effective_severity_score
    )
    if is_override and not comment:
        raise HTTPException(
            status_code=400,
            detail="A comment is required when overriding the AI severity score",
        )

    before = {
        "status": case.status,
        "auditor_severity_score": case.auditor_severity_score,
        "auditor_comment": case.auditor_comment,
        "final_outcome": case.final_outcome,
    }
    case.auditor_severity_score = payload.auditor_severity_score
    case.auditor_comment = comment
    case.final_outcome = payload.final_outcome.value
    case.status = "COMPLETE"
    case.completed_at = datetime.now(timezone.utc)
    db.add(
        AuditLog(
            case_id=case.case_id,
            actor=auditor.staff_id,
            action="CASE_RESOLVED",
            before_value=before,
            after_value={
                "status": case.status,
                "auditor_severity_score": case.auditor_severity_score,
                "auditor_comment": case.auditor_comment,
                "final_outcome": case.final_outcome,
            },
        )
    )
    db.commit()
    return {
        "case_id": case.case_id,
        "status": public_status(case.status),
        "final_outcome": case.final_outcome,
    }


@app.get("/api/manager/dashboard")
async def manager_dashboard(
    _: StaffSession = Depends(get_current_manager),
):
    """Retain the Sprint 2 manager scaffold behind the correct role boundary."""
    return {"auditors": [], "pending_declined_cases": 0}
