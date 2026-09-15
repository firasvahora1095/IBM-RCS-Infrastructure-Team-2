import secrets

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# In-memory session store. Week 1 placeholder - AR-AS-06 defers real
# MFA/session-timeout rules to the technical/security spec. Good enough to
# prove login -> role-scoped access without building JWT infra yet.
_ACTIVE_SESSIONS = {}


def hash_password(plain_password):
    return pwd_context.hash(plain_password)


def verify_password(plain_password, password_hash):
    return pwd_context.verify(plain_password, password_hash)


def create_session(auditor_id, role):
    token = secrets.token_urlsafe(32)
    _ACTIVE_SESSIONS[token] = {"auditor_id": auditor_id, "role": role}
    return token


def get_session(token):
    return _ACTIVE_SESSIONS.get(token)


def invalidate_session(token):
    _ACTIVE_SESSIONS.pop(token, None)
