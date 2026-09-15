import time

# UR-ST-07: 5 invalid case ID lookups within 10 minutes from the same
# IP/session triggers a 15-minute lockout. In-memory only - fine for a
# single Week1 backend instance, not for multi-instance production.
MAX_ATTEMPTS = 5
WINDOW_SECONDS = 10 * 60
LOCKOUT_SECONDS = 15 * 60

_failed_attempts = {}  # key -> list[timestamp]
_locked_until = {}     # key -> timestamp


def is_locked_out(key):
    locked_until = _locked_until.get(key)
    return locked_until is not None and time.time() < locked_until


def record_failed_attempt(key):
    now = time.time()
    attempts = [t for t in _failed_attempts.get(key, []) if now - t < WINDOW_SECONDS]
    attempts.append(now)
    _failed_attempts[key] = attempts

    if len(attempts) >= MAX_ATTEMPTS:
        _locked_until[key] = now + LOCKOUT_SECONDS
        _failed_attempts[key] = []


def record_success(key):
    _failed_attempts.pop(key, None)
