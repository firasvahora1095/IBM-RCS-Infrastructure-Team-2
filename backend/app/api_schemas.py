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


class DeclineReason(str, Enum):
    MORE_SEVERE_THAN_AI = "MORE_SEVERE_THAN_AI"
    NEAR_EXPOSURE_LIMIT = "NEAR_EXPOSURE_LIMIT"
    PERSONAL_TRIGGER = "PERSONAL_TRIGGER"
    OTHER = "OTHER"


class DeclineCaseRequest(BaseModel):
    reason: DeclineReason
    other_text: str | None = Field(default=None, max_length=1000)


class SosFollowUpOutcome(str, Enum):
    NO_FURTHER_ACTION = "NO_FURTHER_ACTION"
    REASSIGNED_REMAINING_CASES = "REASSIGNED_REMAINING_CASES"
    AUDITOR_STOPPED_SHIFT = "AUDITOR_STOPPED_SHIFT"


class SosFollowUpRequest(BaseModel):
    notes: str = Field(max_length=5000)
    outcome: SosFollowUpOutcome


class ExposureSampleRequest(BaseModel):
    active_seconds: float = Field(default=0, ge=0)
    replay_seconds: float = Field(default=0, ge=0)
    seconds: float | None = Field(default=None, ge=0)
    case_id: str | None = None

    @property
    def total_seconds(self) -> float:
        if self.seconds is not None:
            return self.seconds
        return self.active_seconds + self.replay_seconds


class SetExposureLimitRequest(BaseModel):
    minutes: int = Field(ge=0, le=1440)
