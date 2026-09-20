"""Adapter between case creation and the watsonx Orchestrate assignment flow."""

import os
from dataclasses import dataclass
from typing import Protocol

import httpx
from sqlalchemy.orm import Session

from app.assignment import NoEligibleAuditorError, select_auditor


class AssignmentOrchestrationError(RuntimeError):
    """Raised when the assignment workflow cannot return an Auditor."""


@dataclass(frozen=True)
class AssignmentDecision:
    auditor_id: str
    audit_actor: str


class AssignmentOrchestrator(Protocol):
    async def assign_case(self, case_id: str) -> AssignmentDecision:
        """Ask the workflow to choose an Auditor for one newly created case."""


@dataclass
class MockWatsonxOrchestrator:
    """Local stand-in that executes the same selector Orchestrate will call."""

    db: Session

    async def assign_case(self, case_id: str) -> AssignmentDecision:
        del case_id
        try:
            candidate = select_auditor(self.db)
        except NoEligibleAuditorError as error:
            raise AssignmentOrchestrationError(str(error)) from error
        return AssignmentDecision(
            auditor_id=candidate.auditor_id,
            audit_actor="watsonx-orchestrate-mock",
        )


@dataclass
class RemoteWatsonxOrchestrator:
    """HTTP contract for the deployed watsonx Orchestrate workflow endpoint."""

    url: str
    bearer_token: str | None
    timeout_seconds: float

    async def assign_case(self, case_id: str) -> AssignmentDecision:
        headers = {"Accept": "application/json"}
        if self.bearer_token:
            headers["Authorization"] = f"Bearer {self.bearer_token}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(
                    self.url,
                    headers=headers,
                    json={"case_id": case_id},
                )
                response.raise_for_status()
                payload = response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise AssignmentOrchestrationError(
                "watsonx Orchestrate assignment request failed"
            ) from error

        auditor_id = payload.get("auditor_id") if isinstance(payload, dict) else None
        if not isinstance(auditor_id, str) or not auditor_id.strip():
            raise AssignmentOrchestrationError(
                "watsonx Orchestrate did not return an auditor_id"
            )

        return AssignmentDecision(
            auditor_id=auditor_id,
            audit_actor="watsonx-orchestrate",
        )


def build_assignment_orchestrator(db: Session) -> AssignmentOrchestrator:
    """Build either the explicit local mock or the deployed HTTP adapter."""
    mode = os.getenv("ORCHESTRATE_MODE", "mock").strip().lower()
    if mode == "mock":
        return MockWatsonxOrchestrator(db)
    if mode != "remote":
        raise AssignmentOrchestrationError("Unsupported ORCHESTRATE_MODE")

    url = os.getenv("WATSONX_ORCHESTRATE_URL", "").strip()
    if not url:
        raise AssignmentOrchestrationError(
            "WATSONX_ORCHESTRATE_URL is required in remote mode"
        )

    try:
        timeout_seconds = float(
            os.getenv("WATSONX_ORCHESTRATE_TIMEOUT_SECONDS", "10")
        )
    except ValueError as error:
        raise AssignmentOrchestrationError(
            "WATSONX_ORCHESTRATE_TIMEOUT_SECONDS must be numeric"
        ) from error

    return RemoteWatsonxOrchestrator(
        url=url,
        bearer_token=os.getenv("WATSONX_ORCHESTRATE_BEARER_TOKEN"),
        timeout_seconds=timeout_seconds,
    )
