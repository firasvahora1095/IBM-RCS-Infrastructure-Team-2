"""Request-path logging that never emits case IDs in plaintext."""

import logging
import re
from typing import Any


CASE_PATH_PATTERN = re.compile(
    r"(?P<prefix>/api/(?:status|auditor/cases|internal/cases)/)"
    r"(?P<case_id>[^/?\s]+)",
    flags=re.IGNORECASE,
)


def redact_case_ids(value: str) -> str:
    return CASE_PATH_PATTERN.sub(r"\g<prefix>[REDACTED]", value)


class CaseIdRedactionFilter(logging.Filter):
    """Redact request targets used by both application and Uvicorn access logs."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact_case_ids(record.msg)
        if isinstance(record.args, tuple):
            record.args = tuple(self._redact(argument) for argument in record.args)
        elif isinstance(record.args, dict):
            record.args = {
                key: self._redact(value) for key, value in record.args.items()
            }
        return True

    @staticmethod
    def _redact(value: Any) -> Any:
        return redact_case_ids(value) if isinstance(value, str) else value


def install_access_log_redaction() -> None:
    """Install once; duplicate filters are harmless but avoided for reloads/tests."""
    access_logger = logging.getLogger("uvicorn.access")
    if not any(isinstance(item, CaseIdRedactionFilter) for item in access_logger.filters):
        access_logger.addFilter(CaseIdRedactionFilter())
