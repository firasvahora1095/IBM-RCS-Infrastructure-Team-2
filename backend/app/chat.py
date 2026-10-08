"""AI chatbot ("AI buddy") — watsonx.ai backed chat for Auditor and Manager."""

import os
from ibm_watsonx_ai import Credentials
from ibm_watsonx_ai.foundation_models import ModelInference
from dotenv import load_dotenv

load_dotenv()

_CHAT_MODEL_ID = os.getenv("WATSONX_CHAT_MODEL_ID", "meta-llama/llama-3-3-70b-instruct")

_SYSTEM_PROMPT_BASE = """You are an AI assistant ("AI buddy") built into the RCS (Rapid Case System) content moderation platform.

RCS is used by trained human auditors to review potentially harmful content (videos) flagged by AI.
Your role is to help staff understand the system, their workflow, and answer questions clearly.

Key facts about RCS:
- Cases are flagged videos submitted for human review, rated S1 (low) to S4 (severe)
- Auditors review cases and submit a final moderation decision
- Managers oversee auditors, handle SOS alerts, reassignments, and client reports
- Auditors have a daily exposure limit (default 120 min) to protect their wellbeing
- Cooldown periods apply after reviewing high-severity cases (S3/S4)
- Cases can be declined (auditor chooses not to review) or interrupted by cap limit
- Managers handle declined and cap-interrupted cases via the reassignment queue
- SOS is an urgent alert when an auditor encounters unexpectedly distressing content
- CommunityHub is a simulated client platform that receives moderation results

Keep answers concise and relevant to the RCS workflow. Do not make up case IDs or user data.
If you don't know something specific, say so honestly."""

_SYSTEM_PROMPT_AUDITOR = _SYSTEM_PROMPT_BASE + """

You are currently speaking with an Auditor."""

_SYSTEM_PROMPT_MANAGER = _SYSTEM_PROMPT_BASE + """

You are currently speaking with a Manager."""


def _build_system_prompt(role: str, context: dict) -> str:
    base = _SYSTEM_PROMPT_MANAGER if role == "manager" else _SYSTEM_PROMPT_AUDITOR

    if not context:
        return base

    lines = [base, "\nCurrent operational context (live data):"]
    for key, value in context.items():
        lines.append(f"- {key}: {value}")
    return "\n".join(lines)


def _get_model() -> ModelInference:
    api_key = os.getenv("WATSONX_API_KEY")
    url = os.getenv("WATSONX_URL")
    project_id = os.getenv("WATSONX_PROJECT_ID")

    if not api_key or not url or not project_id:
        raise RuntimeError("WATSONX_API_KEY, WATSONX_URL, and WATSONX_PROJECT_ID are required")

    return ModelInference(
        model_id=_CHAT_MODEL_ID,
        credentials=Credentials(api_key=api_key, url=url),
        project_id=project_id,
    )


def chat(message: str, role: str, context: dict) -> str:
    """Send a message to the AI buddy and return the response text."""
    model = _get_model()
    system_prompt = _build_system_prompt(role, context)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": message},
    ]

    response = model.chat(
        messages=messages,
        params={"max_tokens": 400, "temperature": 0.7},
    )

    try:
        return response["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as err:
        raise RuntimeError("Unexpected response from watsonx.ai") from err
