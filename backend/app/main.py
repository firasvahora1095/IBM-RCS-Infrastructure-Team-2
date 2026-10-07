"""Sprint 2 Week 1 API for the mocked end-to-end moderation flow."""

import hmac
import logging
import os
from datetime import datetime, timedelta, timezone

logging.basicConfig(level=logging.INFO)

from fastapi import (
    BackgroundTasks,
    Body,
    Depends,
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse
from anyio import CancelScope
from starlette.concurrency import run_in_threadpool
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
from app.b2b import create_delivery_for_case, public_delivery_confirmed
from app.b2b import router as b2b_router
from app.support import (
    auditor_exists,
    completed_today,
    create_request,
    requests_for,
    resolve_request,
    sos_history,
    start_of_today,
)
from app.support import router as support_router
from app.auth import DUMMY_PASSWORD_HASH, StaffSession, session_store, verify_password
from app.assignment import NoEligibleAuditorError, select_auditor
from app.case_ids import generate_case_id
from app.case_status import public_status
from app.case_workflow import record_case_assignment
from app.db import get_db
from app.models import AuditLog, Auditor, Case, CaseSource
from app.orchestrate import (
    AssignmentOrchestrationError,
    AssignmentOrchestrator,
    build_assignment_orchestrator,
)
from app.rate_limit import status_lookup_limiter
from app.request_logging import install_access_log_redaction, redact_case_ids
from app.storage import VideoRangeError, delete_stored_video, store_video, stream_video_from_storage, verify_storage_connection
from app.uploads import InvalidVideoError, validate_video


install_access_log_redaction()
logger = logging.getLogger("ibm_rcs.api")
bearer_scheme = HTTPBearer(auto_error=False)


class _VideoStreamingResponse(StreamingResponse):
    """Release the storage connection even when the browser cancels a seek."""

    def __init__(self, body, **kwargs):
        self._video_body = body
        super().__init__(body, **kwargs)

    async def __call__(self, scope, receive, send):
        try:
            await super().__call__(scope, receive, send)
        finally:
            # Cleanup must run even if the request's task was cancelled.
            with CancelScope(shield=True):
                await run_in_threadpool(self._video_body.close)

def _run_db_migrations() -> None:
    """Apply all incremental schema changes to the deployed database.

    Every statement uses IF NOT EXISTS / safe casts so re-running is harmless.
    """
    from app.db import engine
    from sqlalchemy import text
    with engine.begin() as conn:
        # auditors — Sprint 2 columns
        conn.execute(text(
            "ALTER TABLE auditors ADD COLUMN IF NOT EXISTS active_case_count INTEGER NOT NULL DEFAULT 0"
        ))
        conn.execute(text(
            "ALTER TABLE auditors ADD COLUMN IF NOT EXISTS exposure_limit_minutes INTEGER NOT NULL DEFAULT 120"
        ))
        conn.execute(text(
            "ALTER TABLE auditors ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMPTZ"
        ))
        conn.execute(text(
            "ALTER TABLE auditors ADD COLUMN IF NOT EXISTS cooldown_ends_at TIMESTAMPTZ"
        ))
        conn.execute(text(
            "ALTER TABLE auditors ADD COLUMN IF NOT EXISTS cooldown_trigger VARCHAR(10)"
        ))
        conn.execute(text(
            "ALTER TABLE auditors ADD COLUMN IF NOT EXISTS cooldown_check_in_done INTEGER NOT NULL DEFAULT 0"
        ))
        conn.execute(text(
            "ALTER TABLE auditors ALTER COLUMN exposure_minutes TYPE FLOAT USING exposure_minutes::float"
        ))
        # cases — AI pipeline output columns (Sprint 2/3)
        conn.execute(text(
            "ALTER TABLE cases ADD COLUMN IF NOT EXISTS video_duration_seconds DOUBLE PRECISION"
        ))
        conn.execute(text(
            "ALTER TABLE cases ADD COLUMN IF NOT EXISTS analysis_output_path TEXT"
        ))
        conn.execute(text(
            "ALTER TABLE cases ADD COLUMN IF NOT EXISTS ai_failure VARCHAR(30)"
        ))
        conn.execute(text(
            "ALTER TABLE cases ADD COLUMN IF NOT EXISTS flagged_entities JSONB"
        ))
        conn.execute(text(
            "ALTER TABLE cases ADD COLUMN IF NOT EXISTS transcript JSONB"
        ))
        conn.execute(text(
            "ALTER TABLE cases ADD COLUMN IF NOT EXISTS audio_intensity JSONB"
        ))
        conn.execute(text(
            "ALTER TABLE cases ADD COLUMN IF NOT EXISTS manager_flag VARCHAR(10)"
        ))


try:
    _run_db_migrations()
except Exception as _migration_exc:
    logging.getLogger("ibm_rcs.api").warning(
        "DB migration skipped (non-PostgreSQL or already applied): %s", _migration_exc
    )

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
    # Range is what a <video> element sends to seek/stream - without it
    # explicitly allowed, the browser's CORS preflight for the video-stream
    # endpoint fails with "Disallowed CORS headers" and the request is never
    # sent at all. Content-Range/Accept-Ranges aren't CORS-safelisted
    # response headers either, so the video element can't read them back
    # without exposing them explicitly.
    allow_headers=["Authorization", "Content-Type", "X-Internal-API-Key", "Range"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length"],
)
app.include_router(b2b_router)
app.include_router(support_router)


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
    # Optional "where did you see it?" details. Never required: a missing
    # source must not block a report or its handoff to the customer.
    source_url: str | None = Form(default=None, max_length=2000),
    source_detail: str | None = Form(default=None, max_length=1000),
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
        if (source_url and source_url.strip()) or (source_detail and source_detail.strip()):
            db.add(CaseSource(
                case_id=case_id,
                source_url=(source_url or "").strip() or None,
                source_detail=(source_detail or "").strip() or None,
            ))
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
        print(f"[ASSIGN] case_id={case_id} assigned_to={decision.auditor_id}", flush=True)
        logger.info("case %s assigned to %s", case_id, decision.auditor_id)
        record_case_assignment(db, case, decision)
        db.commit()
        background_tasks.add_task(_run_analysis_in_background, case_id)
    except (
        AssignmentOrchestrationError,
        IntegrityError,
        OSError,
        RuntimeError,
    ) as error:
        logger.exception("Report creation failed: %s", error)
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

    delivered = case.status == "COMPLETE" and public_delivery_confirmed(db, case.case_id)
    db.commit()
    return {
        "case_id": case.case_id,
        "status": public_status(case.status),
        "final_outcome": case.final_outcome if case.status == "COMPLETE" else None,
        "submitted_at": case.created_at,
        # The only delivery fact allowed across the public boundary: the
        # Reporter hears "CommunityHub has been notified" only once it is true.
        "public_delivery_confirmed": delivered,
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


def _get_owned_case(
    db: Session,
    case_id: str,
    auditor_id: str,
    *,
    for_update: bool = False,
) -> Case:
    statement = select(Case).where(
        Case.case_id == _case_id_for_lookup(case_id),
        Case.assigned_auditor_id == auditor_id,
    )
    if for_update:
        statement = statement.with_for_update()

    case = db.scalar(statement)
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
        "transcript": case.transcript,
        "audio_intensity": case.audio_intensity,
        "video_duration_seconds": case.video_duration_seconds,
        "ai_failure": case.ai_failure,
    }


@app.get("/api/auditor/cases/{case_id}/video")
def stream_case_video(
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
    except VideoRangeError as exc:
        headers = {"Content-Range": f"bytes */{exc.total_size}"} if exc.total_size is not None else {}
        raise HTTPException(status_code=416, detail=str(exc), headers=headers) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Video could not be retrieved") from exc

    headers: dict[str, str] = {"Accept-Ranges": "bytes"}
    if content_length is not None:
        headers["Content-Length"] = str(content_length)
    if content_range:
        headers["Content-Range"] = content_range

    status_code = 206 if is_partial else 200
    return _VideoStreamingResponse(
        body, status_code=status_code, media_type=media_type, headers=headers,
    )


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
    # A row lock prevents two Code Engine instances from completing the same
    # case concurrently and overwriting the first Auditor decision.
    case = _get_owned_case(db, case_id, auditor.staff_id, for_update=True)
    if case.status not in {"READY_FOR_REVIEW", "AUDITOR_REVIEW"}:
        raise HTTPException(status_code=409, detail="Case is not ready for resolution")
    if case.manager_flag in {"DECLINED", "SOS"}:
        raise HTTPException(
            status_code=409,
            detail="Flagged cases require Manager action",
        )

    comment = (
        payload.auditor_comment.strip() or None
        if payload.auditor_comment is not None
        else None
    )
    is_override = (
        payload.auditor_severity_score is not None
        and payload.auditor_severity_score != case.effective_severity_score
    )
    if is_override and not comment:
        raise HTTPException(
            status_code=400,
            detail="A comment is required when overriding the AI severity score",
        )

    ai_assessment = {
        "watson_severity_score": case.watson_severity_score,
        "effective_severity_score": case.effective_severity_score,
        "severity_tier": case.severity_tier,
    }
    before = {
        **ai_assessment,
        "status": case.status,
        "auditor_severity_score": case.auditor_severity_score,
        "auditor_comment": case.auditor_comment,
        "final_outcome": case.final_outcome,
    }
    case.auditor_severity_score = payload.auditor_severity_score
    case.auditor_comment = comment
    case.final_outcome = payload.final_outcome.value
    case.status = "COMPLETE"
    now = datetime.now(timezone.utc)
    case.completed_at = now

    # S3/S4 automatic cooldown on case resolution (AR-WB-12)
    tier = case.severity_tier
    cooldown_minutes: int | None = None
    if tier == "S3":
        cooldown_minutes = 15
    elif tier == "S4":
        cooldown_minutes = 30

    if cooldown_minutes is not None:
        auditor_row = db.get(Auditor, auditor.staff_id)
        if auditor_row is not None:
            # Only extend if not already in a longer cooldown
            new_ends_at = now + timedelta(minutes=cooldown_minutes)
            if auditor_row.cooldown_ends_at is None or auditor_row.cooldown_ends_at < new_ends_at:
                auditor_row.cooldown_ends_at = new_ends_at
                auditor_row.cooldown_trigger = tier
                auditor_row.cooldown_check_in_done = 0

    db.add(
        AuditLog(
            case_id=case.case_id,
            actor=auditor.staff_id,
            action="CASE_RESOLVED",
            before_value=before,
            after_value={
                **ai_assessment,
                "status": case.status,
                "auditor_severity_score": case.auditor_severity_score,
                "auditor_comment": case.auditor_comment,
                "final_outcome": case.final_outcome,
                "is_override": is_override,
            },
        )
    )
    # Hand the result to the customer automatically. The Manager never
    # approves it, and the Auditor never sees its delivery status.
    create_delivery_for_case(db, case, now)
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
        cooldown = None
        if in_cooldown and ends_at:
            cooldown = {
                "ends_at": ends_at.isoformat(),
                "trigger": a.cooldown_trigger,
                "check_in_pending": check_in_pending,
            }
        auditor_list.append({
            "auditor_id": a.auditor_id,
            "exposure_minutes_today": float(a.exposure_minutes or 0),
            "exposure_limit_minutes": int(a.exposure_limit_minutes or 120),
            "active_case_count": int(a.active_case_count or 0),
            "in_cooldown": in_cooldown,
            "check_in_pending": check_in_pending,
            "cooldown": cooldown,
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
        "cases_reviewed_today": len(completed_today(db, auditor.staff_id)),
        "requests": requests_for(db, auditor.staff_id, since=start_of_today()),
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


@app.post("/api/auditor/cases/{case_id}/release-at-limit")
async def release_case_at_limit(
    case_id: str,
    auditor: StaffSession = Depends(get_current_auditor),
    db: Session = Depends(get_db),
):
    """The Auditor reached the daily exposure cap mid-review.

    Playback has stopped on the client. The case goes back to the Manager for
    reassignment as a "near my exposure limit" decline; entered progress is
    kept on the case.
    """
    case = _get_owned_case(db, case_id, auditor.staff_id)
    if case.status == "COMPLETE":
        raise HTTPException(status_code=409, detail="Cannot return a completed case")
    before = {"status": case.status, "manager_flag": case.manager_flag}
    case.manager_flag = "DECLINED"
    db.add(AuditLog(
        case_id=case.case_id,
        actor=auditor.staff_id,
        action="CASE_DECLINED",
        before_value=before,
        after_value={
            "manager_flag": "DECLINED",
            "reason": "NEAR_EXPOSURE_LIMIT",
            "other_text": None,
            "returned_at_daily_limit": True,
        },
    ))
    db.commit()
    return {"returned": True}


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


@app.post("/api/auditor/stop-shift")
async def stop_shift(
    auditor: StaffSession = Depends(get_current_auditor),
    db: Session = Depends(get_db),
):
    """Auditor stops their shift early from the cooldown screen (AR-WB-12).

    Sets exposure to the daily limit so no further cases are assigned,
    then returns all active cases to READY_FOR_REVIEW for reassignment.
    """
    auditor_row = db.get(Auditor, auditor.staff_id)
    if auditor_row is None:
        raise HTTPException(status_code=404, detail="Auditor not found")

    # Block future assignments by pinning exposure to the limit
    limit = int(auditor_row.exposure_limit_minutes or _DEFAULT_EXPOSURE_LIMIT)
    auditor_row.exposure_minutes = float(limit)

    # Return all active cases to the queue
    active_cases = db.scalars(
        select(Case).where(
            Case.assigned_auditor_id == auditor.staff_id,
            Case.status.in_(["AUDITOR_REVIEW", "READY_FOR_REVIEW"]),
        )
    ).all()

    now = datetime.now(timezone.utc)
    for case in active_cases:
        before = {"status": case.status, "assigned_auditor_id": case.assigned_auditor_id}
        case.status = "READY_FOR_REVIEW"
        case.assigned_auditor_id = None
        db.add(AuditLog(
            case_id=case.case_id,
            actor=auditor.staff_id,
            action="SHIFT_STOPPED_CASE_RETURNED",
            before_value=before,
            after_value={"status": case.status, "assigned_auditor_id": None},
        ))

    if active_cases:
        db.add(AuditLog(
            case_id=active_cases[0].case_id,
            actor=auditor.staff_id,
            action="SHIFT_STOPPED",
            before_value=None,
            after_value={"cases_returned": len(active_cases), "stopped_at": now.isoformat()},
        ))
    else:
        logger.info("Shift stopped by %s (no active cases)", auditor.staff_id)

    db.commit()
    return {"stopped": True, "cases_returned": len(active_cases)}


@app.post("/api/auditor/wellbeing-support")
async def request_wellbeing_support(
    kind: str = Body(embed=True),
    case_id: str | None = Body(default=None, embed=True),
    reason: str | None = Body(default=None, embed=True),
    auditor: StaffSession = Depends(get_current_auditor),
    db: Session = Depends(get_db),
):
    request = create_request(db, auditor.staff_id, kind, case_id, reason)
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
        db.commit()
        logger.info("Wellbeing support requested by %s (kind=%s, no case)", auditor.staff_id, kind)
    return {"received": True, "request_id": request.request_id}


# ---------------------------------------------------------------------------
# Manager endpoints (Sprint 3)
# ---------------------------------------------------------------------------

def _auditor_cooldown_payload(row: Auditor) -> dict | None:
    if not row.cooldown_ends_at:
        return None
    ends_at = row.cooldown_ends_at
    if ends_at.tzinfo is None:
        ends_at = ends_at.replace(tzinfo=timezone.utc)
    if ends_at <= datetime.now(timezone.utc):
        return None
    requires_check_in = row.cooldown_trigger in ("S4", "SOS")
    check_in_done = bool(row.cooldown_check_in_done)
    return {
        "ends_at": ends_at.isoformat(),
        "trigger": row.cooldown_trigger,
        "requires_check_in": requires_check_in,
        "check_in_completed_at": ends_at.isoformat() if check_in_done else None,
    }


def _exposure_state(minutes: float, limit: float) -> str:
    if limit <= 0:
        return "UNDER"
    pct = minutes / limit
    if pct >= 1.0:
        return "AT_LIMIT"
    if pct >= 0.75:
        return "APPROACHING"
    return "UNDER"


@app.get("/api/manager/audit-logs")
async def get_audit_history(
    response: Response,
    _: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
    case_id: str | None = Query(default=None, max_length=20),
    action: str | None = Query(default=None, max_length=50),
    before_id: int | None = Query(default=None, ge=1, le=9223372036854775807),
    limit: int = Query(default=25, ge=1, le=100),
):
    """Read saved audit events through the backend's existing DB connection."""
    query = select(AuditLog)
    if case_id and case_id.strip():
        query = query.where(AuditLog.case_id == case_id.strip())
    if action and action.strip():
        query = query.where(AuditLog.action == action.strip())
    if before_id is not None:
        query = query.where(AuditLog.audit_log_id < before_id)

    # Stable ID cursors allow browsing older history while new events arrive.
    rows = db.scalars(
        query.order_by(AuditLog.audit_log_id.desc()).limit(limit + 1)
    ).all()
    entries = rows[:limit]
    response.headers["Cache-Control"] = "no-store"
    return {
        "entries": [
            {
                "audit_log_id": row.audit_log_id,
                "case_id": row.case_id,
                "actor": row.actor,
                "action": row.action,
                "before_value": row.before_value,
                "after_value": row.after_value,
                "created_at": (
                    row.created_at.replace(tzinfo=timezone.utc)
                    if row.created_at.tzinfo is None else row.created_at
                ).isoformat(),
            }
            for row in entries
        ],
        "next_before_id": (
            entries[-1].audit_log_id if len(rows) > limit else None
        ),
    }


@app.get("/api/manager/auditors")
async def list_auditors(
    _: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    auditors = db.scalars(select(Auditor).where(Auditor.role == "auditor")).all()
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
            "cooldown": _auditor_cooldown_payload(a),
            "cases_today": len(completed_today(db, a.auditor_id)),
        })
    return result


@app.get("/api/manager/sos-summary")
async def get_sos_summary(
    _: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    # Unresolved = SOS triggered but cooldown_check_in_done is still 0
    sos_auditors = db.scalars(
        select(Auditor)
        .where(
            Auditor.cooldown_trigger == "SOS",
            Auditor.cooldown_check_in_done == 0,
            Auditor.cooldown_ends_at.is_not(None),
        )
        .order_by(Auditor.cooldown_ends_at.desc())
    ).all()
    if not sos_auditors:
        return {"unresolved_count": 0, "most_recent": None}
    most_recent = sos_auditors[0]
    ends_at = most_recent.cooldown_ends_at
    if ends_at and ends_at.tzinfo is None:
        ends_at = ends_at.replace(tzinfo=timezone.utc)
    triggered_at = (ends_at - timedelta(minutes=30)).isoformat() if ends_at else None
    return {
        "unresolved_count": len(sos_auditors),
        "most_recent": {
            "auditor_name": most_recent.auditor_id,
            "triggered_at": triggered_at,
        },
    }


@app.get("/api/manager/auditors/{auditor_id}")
async def get_auditor_detail(
    auditor_id: str,
    _: StaffSession = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    row = auditor_exists(db, auditor_id)
    exp = float(row.exposure_minutes or 0)
    limit = int(row.exposure_limit_minutes or _DEFAULT_EXPOSURE_LIMIT)
    recent = completed_today(db, auditor_id)
    last_active = [t for t in (recent[0].completed_at if recent else None, row.last_assigned_at) if t is not None]
    return {
        "auditor_id": row.auditor_id,
        "display_name": row.auditor_id,
        "exposure_minutes_today": round(exp, 1),
        "exposure_limit_minutes": limit,
        "exposure_state": _exposure_state(exp, limit),
        "cooldown": _auditor_cooldown_payload(row),
        "cases_today": len(recent),
        "pattern_flagged": False,
        "recent_cases": [
            {
                "case_id": c.case_id,
                "severity_tier": c.severity_tier,
                "completed_at": c.completed_at.isoformat() if c.completed_at else None,
                "final_outcome": c.final_outcome,
            }
            for c in recent
        ],
        "wellbeing_requests": requests_for(db, auditor_id),
        "sos_history": sos_history(db, auditor_id),
        "last_active_at": max(
            (t if t.tzinfo else t.replace(tzinfo=timezone.utc) for t in last_active), default=None
        ),
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
    db: Session = Depends(get_db),
):
    resolve_request(db, request_id, "BREAK_REQUEST", "APPROVED")
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
        "flagged_entities": case.flagged_entities or [],
        "transcript": case.transcript,
        "audio_intensity": case.audio_intensity,
        "video_duration_seconds": case.video_duration_seconds,
        "ai_failure": case.ai_failure,
    }


@app.get("/api/manager/cases/{case_id}/video")
def stream_case_video_manager(
    request: Request,
    case_id: str,
    token: str | None = None,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    raw_token = (credentials.credentials if credentials else None) or token
    if not raw_token:
        raise _not_authenticated()
    session = session_store.get(raw_token)
    if session is None or session.role != StaffRole.MANAGER.value:
        raise _not_authenticated()
    case = db.get(Case, _case_id_for_lookup(case_id))
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    if not case.video_storage_path:
        raise HTTPException(status_code=404, detail="No video on file for this case")
    range_header = request.headers.get("Range")
    try:
        body, media_type, content_length, is_partial, content_range = stream_video_from_storage(
            case.video_storage_path, byte_range=range_header
        )
    except VideoRangeError as exc:
        headers = {"Content-Range": f"bytes */{exc.total_size}"} if exc.total_size is not None else {}
        raise HTTPException(status_code=416, detail=str(exc), headers=headers) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Video could not be retrieved") from exc

    headers: dict[str, str] = {"Accept-Ranges": "bytes"}
    if content_length is not None:
        headers["Content-Length"] = str(content_length)
    if content_range:
        headers["Content-Range"] = content_range

    status_code = 206 if is_partial else 200
    return _VideoStreamingResponse(
        body, status_code=status_code, media_type=media_type, headers=headers,
    )


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


@app.post("/api/admin/reseed")
async def reseed_db():
    """Re-run the demo seed script. Wipes all data and re-inserts demo accounts and cases."""
    import subprocess
    app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    result = subprocess.run(
        ["python3", "-m", "scripts.seed_demo"],
        capture_output=True,
        text=True,
        cwd=app_dir,
    )
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr[-2000:])
    return {"ok": True, "output": result.stdout[-2000:]}


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
