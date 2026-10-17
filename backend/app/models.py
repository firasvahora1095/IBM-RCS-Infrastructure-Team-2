from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Float,
    Identity,
    Index,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import expression, func


Base = declarative_base()

# Keep PostgreSQL's efficient JSONB representation in deployed environments,
# while allowing the API contract tests to run against an isolated SQLite DB.
JSON_DOCUMENT = JSON().with_variant(JSONB(), "postgresql")
AUDIT_LOG_ID = BigInteger().with_variant(Integer, "sqlite")


class Auditor(Base):
    __tablename__ = "auditors"
    __table_args__ = (
        CheckConstraint(
            "role IN ('auditor', 'manager')",
            name="ck_auditors_role",
        ),
    )

    auditor_id = Column(String(50), primary_key=True)
    login_hash = Column(Text, nullable=False)
    role = Column(String(20), nullable=False, server_default="auditor")
    active_case_count = Column(Integer, nullable=False, server_default="0")
    exposure_minutes = Column(Float, nullable=False, server_default="0")
    exposure_limit_minutes = Column(Integer, nullable=False, server_default="120")
    last_assigned_at = Column(DateTime(timezone=True), nullable=True)
    cooldown_ends_at = Column(DateTime(timezone=True), nullable=True)
    cooldown_trigger = Column(String(10), nullable=True)
    cooldown_check_in_done = Column(Integer, nullable=False, server_default="0")
    exposure_last_reset_at = Column(DateTime(timezone=True), nullable=True)
    # The fallback reviewer (Sprint 3, extra-features 1.6): sees every open case's queue
    # metadata and can take a case no standard Auditor could be given. Still an Auditor
    # for wellbeing: exposure limit and cooldown apply, and the session role stays "auditor".
    is_super_admin = Column(Boolean, nullable=False, default=False, server_default=expression.false())
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class Case(Base):
    __tablename__ = "cases"
    __table_args__ = (
        CheckConstraint(
            "status IN ("
            "'SUBMITTED', "
            "'AI_PROCESSING', "
            "'READY_FOR_REVIEW', "
            "'AUDITOR_REVIEW', "
            "'COMPLETE', "
            "'DECLINED', "
            "'SOS_FLAGGED'"
            ")",
            name="ck_cases_status",
        ),
        CheckConstraint(
            "watson_severity_score IS NULL "
            "OR watson_severity_score BETWEEN 0 AND 100",
            name="ck_cases_watson_severity_score",
        ),
        CheckConstraint(
            "effective_severity_score IS NULL "
            "OR effective_severity_score BETWEEN 0 AND 100",
            name="ck_cases_effective_severity_score",
        ),
        CheckConstraint(
            "auditor_severity_score IS NULL "
            "OR auditor_severity_score BETWEEN 0 AND 100",
            name="ck_cases_auditor_severity_score",
        ),
        CheckConstraint(
            "severity_tier IS NULL OR severity_tier IN ('S1', 'S2', 'S3', 'S4')",
            name="ck_cases_severity_tier",
        ),
        CheckConstraint(
            "final_outcome IS NULL "
            "OR final_outcome IN ('NO_VIOLATION_FOUND', 'POLICY_VIOLATION_FOUND', 'CLOSED_NO_REASSIGNMENT')",
            name="ck_cases_final_outcome",
        ),
        CheckConstraint(
            "ai_failure IS NULL OR ai_failure IN ('vision', 'speech_to_text')",
            name="ck_cases_ai_failure",
        ),
        CheckConstraint(
            "manager_flag IS NULL OR manager_flag IN ('DECLINED', 'SOS', 'CAP_REACHED')",
            name="ck_cases_manager_flag",
        ),
        Index("idx_cases_assigned_auditor_id", "assigned_auditor_id"),
    )

    case_id = Column(String(20), primary_key=True)
    status = Column(String(30), nullable=False, server_default="SUBMITTED")
    assigned_auditor_id = Column(
        String(50),
        ForeignKey("auditors.auditor_id", ondelete="SET NULL"),
        nullable=True,
    )

    # Storage reference; the upload and storage behavior belongs to a later task.
    video_storage_path = Column(Text, nullable=True)

    # Nullable placeholders for later AI-pipeline output.
    watson_severity_score = Column(Integer, nullable=True)
    effective_severity_score = Column(Integer, nullable=True)
    severity_tier = Column(String(2), nullable=True)
    narrative_summary = Column(Text, nullable=True)
    incident_timeline = Column(JSON_DOCUMENT, nullable=True)
    flagged_entities = Column(JSON_DOCUMENT, nullable=True)
    transcript = Column(JSON_DOCUMENT, nullable=True)
    audio_intensity = Column(JSON_DOCUMENT, nullable=True)
    video_duration_seconds = Column(Float, nullable=True)
    analysis_output_path = Column(Text, nullable=True)
    # A non-null value is an explicit reduced-AI-support state. The frontend
    # requires protected, deliberate raw-content access in this state.
    ai_failure = Column(String(30), nullable=True)

    # Nullable fields populated by the later review/outcome workflow.
    auditor_severity_score = Column(Integer, nullable=True)
    auditor_comment = Column(Text, nullable=True)
    final_outcome = Column(String(50), nullable=True)
    manager_flag = Column(String(15), nullable=True)
    # Who may see the case in a queue, kept apart from who owns it (assigned_auditor_id):
    # ASSIGNED_ONLY (default), SUPER_ADMIN_ONLY (no standard Auditor could take it) or
    # AVAILABLE_TO_AUDITORS (released to eligible Auditors to claim, metadata only).
    case_visibility = Column(String(25), nullable=False, server_default="ASSIGNED_ONLY")

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)
    analysis_run_id = Column(String(36), nullable=True)
    ai_auditor_comparison = Column(JSON_DOCUMENT, nullable=True)
    is_validation_case = Column(Boolean, nullable=False, server_default="false")
    ground_truth_tier = Column(String(2), nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("idx_audit_logs_case_id", "case_id"),
        Index("idx_audit_logs_created_at", "created_at"),
    )

    audit_log_id = Column(
        AUDIT_LOG_ID,
        Identity(),
        primary_key=True,
    )
    case_id = Column(
        String(20),
        ForeignKey("cases.case_id", ondelete="RESTRICT"),
        nullable=False,
    )
    actor = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    before_value = Column(JSON_DOCUMENT, nullable=True)
    after_value = Column(JSON_DOCUMENT, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


# ---------------------------------------------------------------------------
# B2B: customer organisation, case result handoff and client service reports
# (docs/ux/b2b-end-to-end-flow-spec.md). New tables only, created by
# Base.metadata.create_all, so the existing schema is untouched.
# ---------------------------------------------------------------------------


class Organisation(Base):
    """A customer platform that receives RCS case results (e.g. CommunityHub)."""

    __tablename__ = "organisations"
    __table_args__ = (
        CheckConstraint("status IN ('READY', 'ERROR')", name="ck_organisations_status"),
    )

    organisation_id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False, server_default="")
    status = Column(String(10), nullable=False, server_default="READY")
    destination_masked = Column(Text, nullable=False)
    last_tested_at = Column(DateTime(timezone=True), nullable=True)


class CaseSource(Base):
    """Optional Reporter-supplied "where did you see it?" details for a case."""

    __tablename__ = "case_sources"

    case_id = Column(
        String(20),
        ForeignKey("cases.case_id", ondelete="CASCADE"),
        primary_key=True,
    )
    source_url = Column(Text, nullable=True)
    source_detail = Column(Text, nullable=True)


class CaseHistory(Base):
    """Older completed cases kept only as the figures reports need.

    No content, summaries or Auditor identities: just timings, tiers and
    outcomes, so service reports can cover months the live queue no longer holds.
    """

    __tablename__ = "case_history"

    case_id = Column(String(20), primary_key=True)
    organisation_id = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=False)
    ai_tier = Column(String(2), nullable=True)
    final_tier = Column(String(2), nullable=True)
    outcome = Column(String(50), nullable=False)
    declined_reassigned = Column(Integer, nullable=False, server_default="0")


class Delivery(Base):
    """One completed case's result handed off to the customer platform.

    Delivery status is kept apart from the case's moderation status: a failed
    delivery never reopens a completed case.
    """

    __tablename__ = "deliveries"
    __table_args__ = (
        CheckConstraint(
            "delivery_status IN ('PENDING', 'RETRYING', 'SUCCESS', 'NEEDS_ATTENTION')",
            name="ck_deliveries_status",
        ),
        Index("idx_deliveries_case_id", "case_id", unique=True),
    )

    delivery_id = Column(String(40), primary_key=True)
    case_id = Column(String(20), nullable=False)
    organisation_id = Column(String(50), nullable=False)
    outcome = Column(String(50), nullable=False)
    # Null when a Manager closed the case without a decision.
    final_severity = Column(String(2), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=False)
    delivery_status = Column(String(20), nullable=False, server_default="PENDING")
    attempts = Column(JSON_DOCUMENT, nullable=False, default=list)
    failure_reason = Column(Text, nullable=True)
    next_attempt_at = Column(DateTime(timezone=True), nullable=True)
    escalated_at = Column(DateTime(timezone=True), nullable=True)
    escalation_note = Column(Text, nullable=True)
    source_url = Column(Text, nullable=True)
    # What the customer's moderators did with the result (they decide the action).
    platform_action = Column(String(10), nullable=True)
    platform_action_note = Column(Text, nullable=True)
    platform_action_at = Column(DateTime(timezone=True), nullable=True)
    platform_action_by = Column(String(50), nullable=True)
    # Demo only: the simulated customer endpoint times out for this delivery.
    simulate_failure = Column(Integer, nullable=False, server_default="0")


class ServiceReport(Base):
    """A Manager-reviewed aggregate report for one customer and period."""

    __tablename__ = "service_reports"
    __table_args__ = (
        CheckConstraint("status IN ('DRAFT', 'RELEASED')", name="ck_service_reports_status"),
    )

    report_id = Column(String(60), primary_key=True)
    organisation_id = Column(String(50), nullable=False)
    period_start = Column(String(10), nullable=False)
    period_end = Column(String(10), nullable=False)
    status = Column(String(10), nullable=False, server_default="DRAFT")
    version = Column(Integer, nullable=False, server_default="1")
    generated_at = Column(DateTime(timezone=True), nullable=False)
    released_at = Column(DateTime(timezone=True), nullable=True)
    released_by = Column(String(100), nullable=True)
    manager_note = Column(Text, nullable=True)
    metrics = Column(JSON_DOCUMENT, nullable=False)


class ReportAccess(Base):
    """Every client view or download attempt, including refusals."""

    __tablename__ = "report_access"
    __table_args__ = (Index("idx_report_access_report_id", "report_id"),)

    access_id = Column(AUDIT_LOG_ID, Identity(), primary_key=True)
    report_id = Column(String(60), nullable=False)
    user_id = Column(String(50), nullable=False)
    organisation_id = Column(String(50), nullable=False)
    action = Column(String(10), nullable=False)
    access_result = Column(String(10), nullable=False)
    reason = Column(String(40), nullable=True)
    at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ClientUser(Base):
    """An authorised customer user. Separate from staff, bound to one organisation."""

    __tablename__ = "client_users"

    user_id = Column(String(50), primary_key=True)
    login_hash = Column(Text, nullable=False)
    display_name = Column(String(100), nullable=False)
    organisation_id = Column(String(50), nullable=False)
    # Least privilege: REPORTS (service reports), TRUST_SAFETY (case results) or ADMIN (both).
    role = Column(String(20), nullable=False, server_default="REPORTS")


class AnalysisRun(Base):
    """Immutable identity and versioned assessment for one analysis attempt."""
    __tablename__ = "analysis_runs"
    run_id = Column(String(36), primary_key=True)
    case_id = Column(String(20), ForeignKey("cases.case_id", ondelete="RESTRICT"), nullable=True, index=True)
    context = Column(String(10), nullable=False)
    subject_reference = Column(String(100), nullable=False)
    status = Column(String(30), nullable=False, server_default="STARTED")
    started_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    assessment = Column(JSON_DOCUMENT, nullable=True)
    accumulated_score = Column(Integer, nullable=True)
    output_reference = Column(Text, nullable=True)
    failure_stage = Column(String(50), nullable=True)
    error_type = Column(String(100), nullable=True)
    __table_args__ = (CheckConstraint("accumulated_score IS NULL OR accumulated_score BETWEEN 0 AND 100", name="ck_run_score"),)


class GovernanceLogEntry(Base):
    """A durable SDK invocation; legacy demo metrics never become real findings."""
    __tablename__ = "governance_log"
    entry_id = Column(String(36), primary_key=True)
    case_id = Column(String(20), nullable=True, index=True)
    run_id = Column(String(36), ForeignKey("analysis_runs.run_id", ondelete="RESTRICT"), nullable=True, index=True)
    schema_version = Column(Integer, nullable=False, server_default="2")
    context = Column(String(10), nullable=False, server_default="live")
    at = Column(DateTime(timezone=True), nullable=False, index=True)
    received_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    model_id = Column(String(100), nullable=False)
    returned_model_id = Column(String(100), nullable=True)
    model_version = Column(String(100), nullable=True)
    prompt_version = Column(String(50), nullable=False)
    prompt_hash = Column(String(64), nullable=True)
    success = Column(Integer, nullable=True)
    outcome = Column(String(30), nullable=False, server_default="STARTED")
    validation_status = Column(String(30), nullable=False, server_default="NOT_CHECKED")
    error_type = Column(String(100), nullable=True)
    frame_num = Column(String(50), nullable=True)
    source_timestamp = Column(Float, nullable=True)
    provider_request_id = Column(String(200), nullable=True)
    receipt_digest = Column(String(64), nullable=True)
    prompt_leakage_status = Column(String(20), nullable=False, server_default="NOT_CHECKED")
    prompt_leakage_evidence = Column(JSON_DOCUMENT, nullable=True)
    leakage_rule_version = Column(String(50), nullable=True)
    checked_at = Column(DateTime(timezone=True), nullable=True)
    source_attribution = Column(JSON_DOCUMENT, nullable=True)
    accumulated_score = Column(Integer, nullable=True)
    tokens_in = Column(Integer, nullable=True)
    tokens_out = Column(Integer, nullable=True)
    reasoning = Column(Text, nullable=True)
    legacy_prompt_leakage = Column(Float, nullable=True)
    legacy_source_attribution = Column(Float, nullable=True)
    legacy_accumulated_score = Column(Float, nullable=True)
    __table_args__ = (
        CheckConstraint("context IN ('live','test','demo')", name="ck_governance_context"),
        CheckConstraint("outcome IN ('STARTED','RECEIVED','FAILED','OUTCOME_UNKNOWN','LEGACY_DEMO')", name="ck_governance_outcome"),
        CheckConstraint("prompt_leakage_status IN ('NOT_CHECKED','NOT_DETECTED','DETECTED')", name="ck_governance_leakage"),
    )


class WellbeingRequest(Base):
    """An Auditor's private request for support (talk to my manager, or a break).

    Distinct from SOS. OPEN until the Manager acts (APPROVED for a break,
    FOLLOWED_UP for a talk request), or until the Auditor WITHDRAWS it.
    """

    __tablename__ = "wellbeing_requests"
    __table_args__ = (
        CheckConstraint("kind IN ('TALK_TO_MANAGER', 'BREAK_REQUEST')", name="ck_wellbeing_requests_kind"),
        CheckConstraint(
            "status IN ('OPEN', 'APPROVED', 'FOLLOWED_UP', 'WITHDRAWN')",
            name="ck_wellbeing_requests_status",
        ),
        Index("idx_wellbeing_requests_auditor_id", "auditor_id"),
    )

    request_id = Column(String(20), primary_key=True)
    auditor_id = Column(String(50), nullable=False)
    case_id = Column(String(20), nullable=True)
    kind = Column(String(20), nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String(15), nullable=False, server_default="OPEN")
    created_at = Column(DateTime(timezone=True), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)


class ClientMessage(Base):
    """A "Contact RCS" message from a customer user, and RCS's reply."""

    __tablename__ = "client_messages"
    __table_args__ = (
        CheckConstraint(
            "topic IN ('REPORT_QUESTION', 'DELIVERY_ISSUE', 'ACCOUNT_ACCESS', 'OTHER')",
            name="ck_client_messages_topic",
        ),
        CheckConstraint("status IN ('SENT', 'SEEN', 'ANSWERED')", name="ck_client_messages_status"),
        Index("idx_client_messages_organisation_id", "organisation_id"),
    )

    message_id = Column(String(20), primary_key=True)
    organisation_id = Column(String(50), nullable=False)
    user_id = Column(String(50), nullable=False)
    topic = Column(String(20), nullable=False)
    report_id = Column(String(60), nullable=True)
    subject = Column(String(120), nullable=False)
    body = Column(Text, nullable=False)
    status = Column(String(10), nullable=False, server_default="SENT")
    created_at = Column(DateTime(timezone=True), nullable=False)
    seen_at = Column(DateTime(timezone=True), nullable=True)
    reply_body = Column(Text, nullable=True)
    reply_at = Column(DateTime(timezone=True), nullable=True)
    reply_by = Column(String(100), nullable=True)
