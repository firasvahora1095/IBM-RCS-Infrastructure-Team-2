"""Password verification and temporary Sprint 2 staff sessions."""

import base64
import hashlib
import hmac
import secrets
import threading
import time
from dataclasses import dataclass


PASSWORD_SCHEME = "pbkdf2_sha256"
PBKDF2_ITERATIONS = 600_000


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def hash_password(password: str, *, iterations: int = PBKDF2_ITERATIONS) -> str:
    """Create a salted password hash suitable for the auditors.login_hash field."""
    if not password:
        raise ValueError("Password must not be empty")

    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return f"{PASSWORD_SCHEME}${iterations}${_encode(salt)}${_encode(digest)}"


def verify_password(password: str, encoded_hash: str) -> bool:
    """Verify a password without exposing whether a stored hash was malformed."""
    try:
        scheme, iterations_text, salt_text, digest_text = encoded_hash.split("$", 3)
        if scheme != PASSWORD_SCHEME:
            return False
        iterations = int(iterations_text)
        if iterations < 1:
            return False
        expected = _decode(digest_text)
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            _decode(salt_text),
            iterations,
        )
        return hmac.compare_digest(actual, expected)
    except (TypeError, ValueError):
        return False


@dataclass(frozen=True)
class StaffSession:
    staff_id: str
    role: str
    expires_at: float


class SessionStore:
    """Thread-safe opaque session store for the single-instance Week 1 API."""

    def __init__(self, lifetime_seconds: int = 8 * 60 * 60) -> None:
        self._lifetime_seconds = lifetime_seconds
        self._sessions: dict[str, StaffSession] = {}
        self._lock = threading.Lock()

    def create(self, staff_id: str, role: str) -> tuple[str, StaffSession]:
        token = secrets.token_urlsafe(32)
        session = StaffSession(
            staff_id=staff_id,
            role=role,
            expires_at=time.time() + self._lifetime_seconds,
        )
        with self._lock:
            self._sessions[token] = session
        return token, session

    def get(self, token: str) -> StaffSession | None:
        now = time.time()
        with self._lock:
            session = self._sessions.get(token)
            if session is None:
                return None
            if session.expires_at <= now:
                self._sessions.pop(token, None)
                return None
            return session

    def invalidate(self, token: str) -> None:
        with self._lock:
            self._sessions.pop(token, None)

    def clear(self) -> None:
        """Clear all sessions; used by isolated contract tests."""
        with self._lock:
            self._sessions.clear()


session_store = SessionStore()

# Used when a staff ID does not exist so failed login timing does not reveal
# whether an account is provisioned. It is generated once at process startup.
DUMMY_PASSWORD_HASH = hash_password("not-a-real-staff-password")
