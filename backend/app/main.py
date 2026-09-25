"""Sprint 2 Week 1 API for the mocked end-to-end moderation flow."""

import hmac
import logging
import os
from datetime import datetime, timezone

from fastapi import (
    BackgroundTasks,
    Body,
    Depends,
    FastAPI,
    File,
    Header,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api_schemas import (
    DeclineCaseRequest,
    ExposureSampleRequest,
    LoginRequest,
    MockAiResultRequest,
    ResolutionRequest,
    SetExposureLimitRequest,
    SosFollowUpRequest,
    StaffRole,
)
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
from app.storage import delete_stored_video, store_video, stream_video_from_storage, verify_storage_connection
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
    allow_methods=["GET", "POST", "PUT", "DELETE"],
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


def _run_analysis_in_background(case_id: str) -> None:
    try:
        from app.analysis_service import CaseAnalysisError, process_case_analysis
    except ImportError:
        logger.warning("Analysis pipeline unavailable (missing dependencies); skipping case %s", case_id)
        return
    from app.db import SessionLocal
    with SessionLocal() as db:
        try:
            process_case_analysis(db, case_id)
        except CaseAnalysisError as exc:
            logger.warning("Background analysis skipped for %s: %s", case_id, exc)
        except Exception:
            logger.exception("Background analysis failed for case %s", case_id)


@app.post("/api/reports", status_code=status.HTTP_201_CREATED)
async def create_report(
    background_tasks: BackgroundTasks,
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
        background_tasks.add_task(_run_analysis_in_background, case_id)
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
        .where(
            Case.assigned_auditor_id == auditor.staff_id,
            (Case.manager_flag != "DECLINED") | (Case.manager_flag == None),
        )
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
        "flagged_entities": case.flagged_entities,
        "video_duration_seconds": case.video_duration_seconds,
        "ai_failure": case.ai_failure,
    }


@app.get("/api/auditor/cases/{case_id}/video")
async def stream_case_video(
    request: Request,
    case_id: str,
    token: str | None = None,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    # <video src> cannot send headers, so accept token as a query param too.
    raw_token = (credentials.credentials if credentials else None) or token
    if not raw_token:
        raise _not_authenticated()
    session = session_store.get(raw_token)
    if session is None or session.role != StaffRole.AUDITOR.value:
        raise _not_authenticated()
    auditor = session
    case = _get_owned_case(db, case_id, auditor.staff_id)
    if not case.video_storage_path:
        raise HTTPException(status_code=404, detail="No video on file for this case")
    range_header = request.headers.get("Range")
    try:
        body, media_type, content_length, is_partial, content_range = stream_video_from_storage(
            case.video_storage_path, byte_range=range_header
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Video could not be retrieved") from exc

    headers: dict[str, str] = {"Accept-Ranges": "bytes"}
    if content_length is not None:
        headers["Content-Length"] = str(content_length)
    if content_range:
        headers["Content-Range"] = content_range

    status_code = 206 if is_partial else 200
    return StreamingResponse(body, status_code=status_code, media_type=media_type, headers=headers)


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
    case.flagged_entities = []
    case.ai_failure = None
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
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    auditors = db.scalars(select(Auditor).where(Auditor.role == "auditor")).all()
    auditor_list = []
    for a in auditors:
        ends_at = a.cooldown_ends_at
        if ends_at and ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
        in_cooldown = bool(ends_at and ends_at > now)
        requires_check_in = a.cooldown_trigger in ("S4", "SOS")
        check_in_pending = requires_check_in and not bool(a.cooldown_check_in_done)
        auditor_list.append({
            "auditor_id": a.auditor_id,
            "exposure_minutes_today": float(a.exposure_minutes or 0),
            "exposure_limit_minutes": int(a.exposure_limit_minutes or 120),
            "active_case_count": int(a.active_case_count or 0),
            "in_cooldown": in_cooldown,
            "check_in_pending": check_in_pending,
        })
    pending_declined = db.scalar(
        select(func.count()).select_from(Case).where(
            Case.manager_flag == "DECLINED",
            Case.status != "COMPLETE",
        )
    ) or 0
    return {"auditors": auditor_list, "pending_declined_cases": pending_declined}


# ---------------------------------------------------------------------------
# Auditor wellbeing endpoints (Sprint 3)
# ---------------------------------------------------------------------------

_DEFAULT_EXPOSURE_LIMIT = 120


@app.get("/api/auditor/wellbeing")
async def get_my_wellbeing(
    auditor: StaffSession = Depends(get_current_auditor),
    db: Session = Depends(get_db),
):
    row = db.get(Auditor, auditor.staff_id)
    exposure = float(row.exposure_minutes or 0) if row else 0
    limit = int(row.exposure_limit_minutes or _DEFAULT_EXPOSURE_LIMIT) if row else _DEFAULT_EXPOSURE_LIMIT
    cooldown = None
    if row and row.cooldown_ends_at:
        now = datetime.now(timezone.utc)
        ends_at = row.cooldown_ends_at
        if ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
        requires_check_in = row.cooldown_trigger in ("S4", "SOS")
        check_in_done = bool(row.cooldown_check_in_done)
        if ends_at > now or (requires_check_in and not check_in_done):
            cooldown = {
                "started_at": (ends_at - __import__("datetime").timedelta(minutes=30)).isoformat(),
                "ends_at": ends_at.isoformat(),
                "trigger": row.cooldown_trigger,
                "requires_check_in": requires_check_in,
                "check_in_completed_at": ends_at.isoformat() if check_in_done else None,
            }
    return {
        "exposure_minutes_today": exposure,
        "exposure_limit_minutes": limit,
        "cooldown": cooldown,
        "cases_reviewed_today": 0,
    }


@app.post("/api/auditor/cases/{case_id}/acknowledge-content-warning")
async def acknowledge_content_warning(
    case_id: str,
    auditor: StaffSession = Depends(get_current_auditor),
    db: Session = Depends(get_db),
):
    case = _get_owned_case(db, case_id, auditor.staff_id)
    if case.status == "READY_FOR_REVIEW":
        case.status = "AUDITOR_REVIEW"
        db.commit()
    return {"acknowledged": True}


@app.post("/api/auditor/cases/{case_id}/decline")
async def decline_case(
    case_id: str,
    payload: DeclineCaseRequest,
    auditor: StaffSession = Depends(get_current_auditor),
    db: Session = Depends(get_db),
):
    case = _get_owned_case(db, case_id, auditor.staff_id)
    if case.status == "COMPLETE":
        raise HTTPException(status_code=409, detail="Cannot decline a completed case")
    before = {"status": case.status, "manager_flag": case.manager_flag}
    case.manager_flag = "DECLINED"
    db.add(AuditLog(
        case_id=case.case_id,
        actor=auditor.staff_id,
        action="CASE_DECLINED",
        before_value=before,
        after_value={"manager_flag": "DECLINED", "reason": payload.reason.value, "other_text": payload.other_text},
    ))
    db.commit()
    return {"declined": True}


@app.post("/api/auditor/cases/{case_id}/exposure")
async def record_exposure(
    case_id: str,
    payload: ExposureSampleRequest,
    auditor: StaffSession = Depends(get_current_auditor),
    db: Session = Depends(get_db),
):
    _get_owned_case(db, case_id, auditor.staff_id)
    db.execute(
        update(Auditor)
        .where(Auditor.auditor_id == auditor.staff_id)
        .values(exposure_minutes=Auditor.exposure_minutes + (payload.total_seconds / 60.0))
    )
    db.commit()
    return {"recorded": True}


@app.post("/api/auditor/cases/{case_id}/sos")
async def trigger_sos(
    case_id: str,
    auditor: StaffSession = Depends(get_current_auditor),
    db: Session = Depends(get_db),
):
    from datetime import timedelta
    case = _get_owned_case(db, case_id, auditor.staff_id)
    before = {"status": case.status, "manager_flag": case.manager_flag}
    case.manager_flag = "SOS"
    now = datetime.now(timezone.utc)
    ends_at = now + timedelta(minutes=30)
    auditor_row = db.get(Auditor, auditor.staff_id)
    if auditor_row:
        auditor_row.cooldown_ends_at = ends_at
        auditor_row.cooldown_trigger = "SOS"
        auditor_row.cooldown_check_in_done = 0
    db.add(AuditLog(
        case_id=case.case_id,
        actor=auditor.staff_id,
        action="SOS_TRIGGERED",
        before_value=before,
        after_value={"manager_flag": "SOS", "triggered_at": now.isoformat()},
    ))
    db.commit()
    return {
        "cooldown": {
            "started_at": now.isoformat(),
            "ends_at": ends_at.isoformat(),
            "trigger": "SOS",
            "requires_check_in": True,
            "check_in_completed_at": None,
        }
    }


@app.post("/api/auditor/cases/{case_id}/unexpected-exposure")
async def report_unexpected_exposure(
    case_id: str,
    reason: str = Body(default="AI_FAILURE_MID_REVIEW", embed=True),
    auditor: StaffSession = Depends(get_current_auditor),
    db: Session = Depends(get_db),
):
    case = _get_owned_case(db, case_id, auditor.staff_id)
    now = datetime.now(timezone.utc)
    db.add(AuditLog(
        case_id=case.case_id,
        actor=auditor.staff_id,
        action="UNEXPECTED_EXPOSURE",
        before_value=None,
        after_value={"reason": reason, "triggered_at": now.isoformat()},
    ))
    db.commit()
    return {
        "cooldown": {
            "started_at": now.isoformat(),
            "ends_at": now.isoformat(),
            "trigger": "SOS",
            "requires_check_in": True,
        }
    }


@app.post("/api/auditor/wellbeing-support")
async def request_wellbeing_support(
    kind: str = Body(embed=True),
    case_id: str | None = Body(default=None, embed=True),
    auditor: StaffSession = Depends(get_current_auditor),
    db: Session = Depends(get_db),
):
    # AuditLog.case_id is NOT NULL — only log when we have a real case reference.
    if case_id:
        db.add(AuditLog(
            case_id=case_id,
            actor=auditor.staff_id,
            action="WELLBEING_SUPPORT_REQUESTED",
            before_value=None,
            after_value={"kind": kind},
        ))
        db.commit()
    else:
        logger.info("Wellbeing support requested by %s (kind=%s, no case)", auditor.staff_id, kind)
    return {"received": True}


# ---------------------------------------------------------------------------
# Manager endpoints (Sprint 3)
# ---------------------------------------------------------------------------

def _exposure_state(minutes: float, limit: float) -> str:
    if limit <= 0:
        return "UNDER"
    pct = minutes / limit
    if pct >= 1.0:
        return "AT_LIMIT"
    if pct >= 0.75:
        return "APPROACHING"
    return "UNDER"


@app.get("/api/manager/auditors")
async def list_auditors(
    _: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    auditors = db.scalars(select(Auditor).where(Auditor.role == "auditor")).all()
    cases_today = dict(
        db.execute(
            select(Case.assigned_auditor_id, func.count(Case.case_id))
            .where(Case.assigned_auditor_id.is_not(None))
            .group_by(Case.assigned_auditor_id)
        ).all()
    )
    result = []
    for a in auditors:
        exp = float(a.exposure_minutes or 0)
        limit = int(a.exposure_limit_minutes or _DEFAULT_EXPOSURE_LIMIT)
        result.append({
            "auditor_id": a.auditor_id,
            "display_name": a.auditor_id,
            "exposure_minutes_today": round(exp, 1),
            "exposure_limit_minutes": limit,
            "exposure_state": _exposure_state(exp, limit),
            "cooldown": None,
            "cases_today": cases_today.get(a.auditor_id, 0),
        })
    return result


@app.get("/api/manager/sos-summary")
async def get_sos_summary(
    _: StaffSession = Depends(get_current_manager),
):
    return {"unresolved_count": 0, "most_recent": None}


@app.get("/api/manager/auditors/{auditor_id}")
async def get_auditor_detail(
    auditor_id: str,
    _: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    row = db.get(Auditor, auditor_id)
    if row is None or row.role != "auditor":
        raise HTTPException(status_code=404, detail="Auditor not found")
    exp = float(row.exposure_minutes or 0)
    limit = _DEFAULT_EXPOSURE_LIMIT
    recent = db.scalars(
        select(Case)
        .where(Case.assigned_auditor_id == auditor_id, Case.status == "COMPLETE")
        .order_by(Case.completed_at.desc())
        .limit(10)
    ).all()
    return {
        "auditor_id": row.auditor_id,
        "display_name": row.auditor_id,
        "exposure_minutes_today": round(exp, 1),
        "exposure_limit_minutes": limit,
        "exposure_state": _exposure_state(exp, limit),
        "cooldown": None,
        "cases_today": len(recent),
        "pattern_flagged": False,
        "recent_cases": [
            {
                "case_id": c.case_id,
                "severity_tier": c.severity_tier,
                "completed_at": c.completed_at.isoformat() if c.completed_at else None,
            }
            for c in recent
        ],
        "wellbeing_requests": [],
    }


@app.put("/api/manager/auditors/{auditor_id}/exposure-limit")
async def set_exposure_limit(
    auditor_id: str,
    payload: SetExposureLimitRequest,
    _: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    row = db.get(Auditor, auditor_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Auditor not found")
    row.exposure_limit_minutes = payload.minutes
    db.commit()
    return {"exposure_limit_minutes": payload.minutes}


@app.post("/api/manager/auditors/{auditor_id}/break-requests/{request_id}/approve")
async def approve_break_request(
    auditor_id: str,
    request_id: str,
    _: StaffSession = Depends(get_current_manager),
):
    return {"approved": True}


@app.get("/api/manager/cases")
async def get_case_oversight(
    _: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    cases = db.scalars(select(Case).order_by(Case.created_at.desc()).limit(100)).all()
    auditor_names = {
        a.auditor_id: a.auditor_id
        for a in db.scalars(select(Auditor)).all()
    }
    return [
        {
            "case_id": c.case_id,
            "auditor_name": auditor_names.get(c.assigned_auditor_id) if c.assigned_auditor_id else None,
            "severity_tier": c.severity_tier,
            "status": c.status,
            "manager_flag": c.manager_flag,
            "sos_alert_id": None,
        }
        for c in cases
    ]


@app.get("/api/manager/sos-alerts")
async def list_sos_alerts(
    _: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    logs = db.execute(
        select(AuditLog)
        .where(AuditLog.action == "SOS_TRIGGERED")
        .order_by(AuditLog.audit_log_id.desc())
        .limit(50)
    ).scalars().all()
    auditor_names = {
        a.auditor_id: a.auditor_id
        for a in db.scalars(select(Auditor)).all()
    }
    result = []
    for log in logs:
        after = log.after_value or {}
        status = "ACKNOWLEDGED" if after.get("acknowledged") else "UNACKNOWLEDGED"
        result.append({
            "id": str(log.audit_log_id),
            "auditor_id": log.actor,
            "auditor_name": auditor_names.get(log.actor, log.actor),
            "case_id": log.case_id,
            "triggered_at": after.get("triggered_at", log.created_at.isoformat()),
            "status": status,
            "trigger": "AUDITOR_SOS",
        })
    return result


@app.get("/api/manager/sos-alerts/{alert_id}")
async def get_sos_alert(
    alert_id: str,
    _: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    try:
        log_id = int(alert_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="SOS alert not found")
    log = db.get(AuditLog, log_id)
    if log is None or log.action != "SOS_TRIGGERED":
        raise HTTPException(status_code=404, detail="SOS alert not found")
    after = log.after_value or {}
    auditor = db.get(Auditor, log.actor)
    case = db.get(Case, log.case_id)
    return {
        "id": str(log.audit_log_id),
        "auditor_id": log.actor,
        "auditor_name": log.actor,
        "case_id": log.case_id,
        "triggered_at": after.get("triggered_at", log.created_at.isoformat()),
        "status": "UNACKNOWLEDGED",
        "trigger": "AUDITOR_SOS",
        "exposure_minutes_today": float(auditor.exposure_minutes or 0) if auditor else 0,
        "exposure_limit_minutes": int(auditor.exposure_limit_minutes or 120) if auditor else 120,
        "severity_tier": case.severity_tier if case else None,
        "effective_severity_score": case.effective_severity_score if case else None,
        "narrative_summary": case.narrative_summary if case else None,
        "follow_up_notes": None,
    }


@app.post("/api/manager/sos-alerts/{alert_id}/acknowledge")
async def acknowledge_sos_alert(
    alert_id: str,
    manager: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    try:
        log_id = int(alert_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="SOS alert not found")
    log = db.get(AuditLog, log_id)
    if log is None or log.action != "SOS_TRIGGERED":
        raise HTTPException(status_code=404, detail="SOS alert not found")
    after = log.after_value or {}
    if not after.get("acknowledged"):
        log.after_value = {**after, "acknowledged": True, "acknowledged_by": manager.staff_id}
        db.commit()
    return {"acknowledged": True}


@app.post("/api/manager/sos-alerts/{alert_id}/follow-up")
async def log_sos_follow_up(
    alert_id: str,
    payload: SosFollowUpRequest,
    _: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    log = db.get(AuditLog, int(alert_id))
    if log and log.action == "SOS_TRIGGERED":
        auditor_row = db.get(Auditor, log.actor)
        if auditor_row:
            auditor_row.cooldown_check_in_done = 1
            db.commit()
    return {"resolved": True}


@app.get("/api/manager/declined-cases")
async def list_declined_cases(
    _: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    cases = db.scalars(
        select(Case).where(Case.manager_flag == "DECLINED").order_by(Case.created_at.desc())
    ).all()
    auditor_names = {
        a.auditor_id: a.auditor_id
        for a in db.scalars(select(Auditor)).all()
    }
    result = []
    for c in cases:
        log = db.scalars(
            select(AuditLog)
            .where(AuditLog.case_id == c.case_id, AuditLog.action == "CASE_DECLINED")
            .order_by(AuditLog.audit_log_id.desc())
            .limit(1)
        ).first()
        reason = log.after_value.get("reason", "OTHER") if log and log.after_value else "OTHER"
        result.append({
            "case_id": c.case_id,
            "auditor_name": auditor_names.get(c.assigned_auditor_id, "Unknown"),
            "severity_tier": c.severity_tier,
            "reason": reason,
            "declined_at": c.completed_at.isoformat() if c.completed_at else c.created_at.isoformat(),
        })
    return result


@app.get("/api/manager/cases/{case_id}/review")
async def get_manager_case_review(
    case_id: str,
    _: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    case = db.get(Case, _case_id_for_lookup(case_id))
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    decline_log = None
    if case.manager_flag == "DECLINED":
        decline_log = db.scalars(
            select(AuditLog)
            .where(AuditLog.case_id == case.case_id, AuditLog.action == "CASE_DECLINED")
            .order_by(AuditLog.audit_log_id.desc())
            .limit(1)
        ).first()
    auditor = db.get(Auditor, case.assigned_auditor_id) if case.assigned_auditor_id else None
    return {
        "case_id": case.case_id,
        "status": case.status,
        "manager_flag": case.manager_flag,
        "severity_tier": case.severity_tier,
        "effective_severity_score": case.effective_severity_score,
        "narrative_summary": case.narrative_summary,
        "auditor_severity_score": case.auditor_severity_score,
        "auditor_comment": case.auditor_comment,
        "auditor_name": auditor.auditor_id if auditor else None,
        "final_outcome": case.final_outcome,
        "flagged_entities": case.flagged_entities or [],
        "decline": {
            "reason": decline_log.after_value.get("reason", "OTHER"),
            "other_text": decline_log.after_value.get("other_text"),
        } if decline_log and decline_log.after_value else None,
    }


@app.get("/api/manager/cases/{case_id}/reassignment")
async def get_reassignment_context(
    case_id: str,
    _: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    case = db.get(Case, _case_id_for_lookup(case_id))
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    candidates = db.scalars(
        select(Auditor).where(Auditor.role == "auditor")
    ).all()
    declining_auditor = db.get(Auditor, case.assigned_auditor_id) if case.assigned_auditor_id else None
    return {
        "case_id": case.case_id,
        "declining_auditor": {
            "name": declining_auditor.auditor_id,
            "exposure_minutes_today": float(declining_auditor.exposure_minutes or 0),
            "exposure_limit_minutes": int(declining_auditor.exposure_limit_minutes or 120),
        } if declining_auditor else None,
        "candidates": [
            {
                "auditor_id": a.auditor_id,
                "name": a.auditor_id,
                "headroom_minutes": int(a.exposure_limit_minutes or 120) - int(a.exposure_minutes or 0),
                "limited_headroom": (int(a.exposure_limit_minutes or 120) - int(a.exposure_minutes or 0)) < 30,
                "available": float(a.exposure_minutes or 0) < int(a.exposure_limit_minutes or 120),
            }
            for a in candidates
            if a.auditor_id != case.assigned_auditor_id
        ],
    }


@app.post("/api/manager/cases/{case_id}/reassign")
async def reassign_case(
    case_id: str,
    auditor_id: str = Body(embed=True),
    manager: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    case = db.get(Case, _case_id_for_lookup(case_id))
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    target = db.get(Auditor, auditor_id)
    if target is None or target.role != "auditor":
        raise HTTPException(status_code=404, detail="Auditor not found")
    before = {"assigned_auditor_id": case.assigned_auditor_id, "status": case.status}
    case.assigned_auditor_id = auditor_id
    case.status = "READY_FOR_REVIEW"
    case.manager_flag = None
    db.add(AuditLog(
        case_id=case.case_id,
        actor=manager.staff_id,
        action="CASE_REASSIGNED",
        before_value=before,
        after_value={"assigned_auditor_id": auditor_id, "status": "READY_FOR_REVIEW"},
    ))
    db.commit()
    return {"assigned_to_name": auditor_id}


@app.post("/api/manager/cases/{case_id}/close")
async def close_without_reassignment(
    case_id: str,
    note: str = Body(embed=True),
    manager: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    case = db.get(Case, _case_id_for_lookup(case_id))
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    before = {"status": case.status}
    case.status = "COMPLETE"
    case.final_outcome = "CLOSED_NO_REASSIGNMENT"
    case.completed_at = datetime.now(timezone.utc)
    db.add(AuditLog(
        case_id=case.case_id,
        actor=manager.staff_id,
        action="CASE_CLOSED_BY_MANAGER",
        before_value=before,
        after_value={"status": "COMPLETE", "note": note},
    ))
    db.commit()
    return {"status": "COMPLETE"}


@app.get("/api/manager/cases/{case_id}/exceptional-access")
async def get_case_exceptional_access(
    case_id: str,
    _: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    case = db.get(Case, _case_id_for_lookup(case_id))
    if case is None:
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


@app.post("/api/manager/cases/{case_id}/exceptional-access")
async def record_exceptional_access(
    case_id: str,
    manager: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    case = db.get(Case, _case_id_for_lookup(case_id))
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    db.add(AuditLog(
        case_id=case.case_id,
        actor=manager.staff_id,
        action="EXCEPTIONAL_ACCESS_RECORDED",
        before_value=None,
        after_value={"accessed_at": datetime.now(timezone.utc).isoformat()},
    ))
    db.commit()
    return {"recorded": True}


@app.get("/api/manager/validation")
async def get_validation_summary(
    _: StaffSession = Depends(get_current_manager),
):
    return {
        "is_placeholder": True,
        "tiers": [
            {"tier": "S1", "ai_predicted_pct": 62.0, "ground_truth_pct": 58.0},
            {"tier": "S2", "ai_predicted_pct": 21.0, "ground_truth_pct": 24.0},
            {"tier": "S3", "ai_predicted_pct": 11.0, "ground_truth_pct": 13.0},
            {"tier": "S4", "ai_predicted_pct": 6.0, "ground_truth_pct": 5.0},
        ],
        "match_rate_pct": 84.0,
        "validation_set_size": 0,
    }
