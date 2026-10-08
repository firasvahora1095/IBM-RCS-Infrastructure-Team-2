"""Adapter between case creation and the watsonx Orchestrate assignment flow."""

import os
import time
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
class _IamTokenCache:
    """Simple in-memory cache for IBM IAM bearer tokens (expire after 55 min)."""
    token: str = ""
    expires_at: float = 0.0


_iam_cache = _IamTokenCache()


async def _get_iam_token(api_key: str, timeout: float) -> str:
    """Fetch a fresh IBM IAM token, reusing the cached one if still valid."""
    now = time.time()
    if _iam_cache.token and now < _iam_cache.expires_at:
        return _iam_cache.token

    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(
            "https://iam.cloud.ibm.com/identity/token",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                "apikey": api_key,
            },
        )
        r.raise_for_status()
        data = r.json()

    token = data.get("access_token")
    if not token:
        raise AssignmentOrchestrationError("IBM IAM did not return an access_token")

    _iam_cache.token = token
    _iam_cache.expires_at = now + 55 * 60  # refresh 5 min before 1h expiry
    return token


@dataclass
class RemoteWatsonxOrchestrator:
    """HTTP contract for the deployed watsonx Orchestrate Native Runs API."""

    base_url: str  # https://.../instances/<tenant_id>
    agent_id: str
    api_key: str | None
    bearer_token: str | None
    timeout_seconds: float
    poll_interval: float = 3.0
    max_polls: int = 20

    async def _auth_header(self) -> str:
        if self.api_key:
            token = await _get_iam_token(self.api_key, self.timeout_seconds)
            return f"Bearer {token}"
        if self.bearer_token:
            return f"Bearer {self.bearer_token}"
        raise AssignmentOrchestrationError(
            "Either IBM_API_KEY or WATSONX_ORCHESTRATE_BEARER_TOKEN is required"
        )

    async def assign_case(self, case_id: str) -> AssignmentDecision:
        import asyncio
        auth = await self._auth_header()
        headers = {
            "Authorization": auth,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                # Step 1: submit run
                r = await client.post(
                    f"{self.base_url}/v1/orchestrate/runs",
                    headers=headers,
                    json={
                        "agent_id": self.agent_id,
                        "message": {
                            "role": "user",
                            "content": f"A new case has been submitted. Please assign the best available auditor. Case ID: {case_id}",
                        },
                    },
                )
                r.raise_for_status()
                run_data = r.json()
                thread_id = run_data["thread_id"]
                run_id = run_data["run_id"]

                # Step 2: poll until completed
                for _ in range(self.max_polls):
                    await asyncio.sleep(self.poll_interval)
                    pr = await client.get(
                        f"{self.base_url}/v1/orchestrate/runs/{run_id}",
                        headers=headers,
                    )
                    pr.raise_for_status()
                    status = pr.json().get("status", "")
                    if status == "completed":
                        break
                    if status in ("failed", "cancelled"):
                        raise AssignmentOrchestrationError(
                            f"watsonx Orchestrate run ended with status: {status}"
                        )
                else:
                    raise AssignmentOrchestrationError(
                        "watsonx Orchestrate run did not complete in time"
                    )

                # Step 3: fetch messages and find last assistant reply
                mr = await client.get(
                    f"{self.base_url}/v1/orchestrate/threads/{thread_id}/messages",
                    headers=headers,
                )
                mr.raise_for_status()
                messages = mr.json()

        except (httpx.HTTPError, ValueError, KeyError) as error:
            raise AssignmentOrchestrationError(
                f"watsonx Orchestrate assignment request failed: {error}"
            ) from error

        # Extract auditor_id from the last assistant message
        auditor_id = ""
        for msg in reversed(messages if isinstance(messages, list) else []):
            if msg.get("role") == "assistant":
                for block in msg.get("content", []):
                    text = block.get("text", "").strip()
                    if text:
                        auditor_id = text
                        break
                if auditor_id:
                    break

        if not auditor_id:
            raise AssignmentOrchestrationError(
                f"watsonx Orchestrate returned no auditor_id. Messages: {messages}"
            )

        if auditor_id.lower().startswith("no eligible"):
            raise NoEligibleAuditorError("No eligible auditors available (Orchestrate)")

        # Extract just the auditor_id token in case LLM adds surrounding text
        import re
        match = re.search(r"auditor-\w+", auditor_id, re.IGNORECASE)
        if match:
            auditor_id = match.group(0).lower()

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

    base_url = os.getenv("WATSONX_ORCHESTRATE_URL", "").strip().rstrip("/")
    if not base_url:
        raise AssignmentOrchestrationError(
            "WATSONX_ORCHESTRATE_URL is required in remote mode"
        )

    agent_id = os.getenv("WATSONX_ORCHESTRATE_AGENT_ID", "").strip()
    if not agent_id:
        raise AssignmentOrchestrationError(
            "WATSONX_ORCHESTRATE_AGENT_ID is required in remote mode"
        )

    try:
        timeout_seconds = float(
            os.getenv("WATSONX_ORCHESTRATE_TIMEOUT_SECONDS", "90")
        )
    except ValueError as error:
        raise AssignmentOrchestrationError(
            "WATSONX_ORCHESTRATE_TIMEOUT_SECONDS must be numeric"
        ) from error

    return RemoteWatsonxOrchestrator(
        base_url=base_url,
        agent_id=agent_id,
        api_key=os.getenv("IBM_CLOUD_API_KEY"),
        bearer_token=os.getenv("WATSONX_ORCHESTRATE_BEARER_TOKEN"),
        timeout_seconds=timeout_seconds,
    )
