from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func


Base = declarative_base()


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
            "'COMPLETE'"
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
            "OR final_outcome IN ('NO_VIOLATION_FOUND', 'POLICY_VIOLATION_FOUND')",
            name="ck_cases_final_outcome",
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
    incident_timeline = Column(JSONB, nullable=True)

    # Nullable fields populated by the later review/outcome workflow.
    auditor_severity_score = Column(Integer, nullable=True)
    auditor_comment = Column(Text, nullable=True)
    final_outcome = Column(String(50), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("idx_audit_logs_case_id", "case_id"),
        Index("idx_audit_logs_created_at", "created_at"),
    )

    audit_log_id = Column(
        BigInteger,
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
    before_value = Column(JSONB, nullable=True)
    after_value = Column(JSONB, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
