"""Request payloads and controlled values for the Week 1 API."""

from enum import Enum

from pydantic import BaseModel, Field


class StaffRole(str, Enum):
    AUDITOR = "auditor"
    MANAGER = "manager"


class FinalOutcome(str, Enum):
    NO_VIOLATION_FOUND = "NO_VIOLATION_FOUND"
    POLICY_VIOLATION_FOUND = "POLICY_VIOLATION_FOUND"


class SeverityTier(str, Enum):
    S1 = "S1"
    S2 = "S2"
    S3 = "S3"
    S4 = "S4"


class LoginRequest(BaseModel):
    staff_id: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=256)


class TimelineEntry(BaseModel):
    start: float = Field(ge=0)
    end: float = Field(ge=0)
    severity_tier: SeverityTier
    tag: str | None = Field(default=None, max_length=100)


class MockAiResultRequest(BaseModel):
    watson_severity_score: int = Field(default=72, ge=0, le=100)
    effective_severity_score: int = Field(default=72, ge=0, le=100)
    severity_tier: SeverityTier = SeverityTier.S3
    narrative_summary: str = Field(
        default="Mock: physical altercation detected between two people.",
        min_length=1,
        max_length=5000,
    )
    incident_timeline: list[TimelineEntry] = Field(
        default_factory=lambda: [
            TimelineEntry(start=12, end=20, severity_tier=SeverityTier.S3)
        ]
    )


class ResolutionRequest(BaseModel):
    final_outcome: FinalOutcome
    auditor_severity_score: int | None = Field(default=None, ge=0, le=100)
    auditor_comment: str | None = Field(default=None, max_length=5000)
