from sqlalchemy import (
    ARRAY,
    Column,
    DateTime,
    ForeignKey,
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

    auditor_id = Column(String(50), primary_key=True)
    login_hash = Column(Text, nullable=False)
    role = Column(String(20), nullable=False, default="auditor")
    active_case_count = Column(Integer, nullable=False, default=0)
    exposure_minutes = Column(Integer, nullable=False, default=0)
    last_assigned_at = Column(DateTime(timezone=True))  # for round-robin tie-break
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Case(Base):
    __tablename__ = "cases"

    case_id = Column(String(20), primary_key=True)
    status = Column(String(30), nullable=False, default="SUBMITTED")
    assigned_auditor = Column(String(50), ForeignKey("auditors.auditor_id"))
    video_storage_path = Column(Text)

    watson_severity_score = Column(Integer)
    effective_severity_score = Column(Integer)
    severity_tier = Column(String(2))
    narrative_summary = Column(Text)
    incident_timeline = Column(JSONB)

    auditor_severity_score = Column(Integer)
    auditor_comment = Column(Text)
    final_outcome = Column(String(50))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))


class FrameAnalysis(Base):
    __tablename__ = "frame_analyses"

    id = Column(Integer, primary_key=True)
    case_id = Column(String(20), ForeignKey("cases.case_id"), nullable=False)
    frame_num = Column(String(20), nullable=False)
    timestamp = Column(Integer, nullable=False)
    tags = Column(ARRAY(Text), nullable=False, default=list)
    watson_severity_score = Column(Integer, nullable=False)
    effective_severity_score = Column(Integer, nullable=False)
    severity_tier = Column(String(2), nullable=False)
    reasoning = Column(Text, nullable=False)
    entities = Column(ARRAY(Text), nullable=False, default=list)

    model_id = Column(String(100), nullable=False)
    model_version = Column(String(50))
    prompt_version = Column(String(20), nullable=False)
    decision_timestamp = Column(DateTime(timezone=True), nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    case_id = Column(String(20), ForeignKey("cases.case_id"), nullable=False)
    actor = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    before_value = Column(JSONB)
    after_value = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
