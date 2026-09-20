"""Small in-process invalid status-lookup limiter for the Week 1 service."""

import threading
import time
from collections.abc import Callable


class InvalidLookupRateLimiter:
    def __init__(
        self,
        *,
        max_attempts: int = 5,
        window_seconds: int = 10 * 60,
        lockout_seconds: int = 15 * 60,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.lockout_seconds = lockout_seconds
        self._clock = clock
        self._failed_attempts: dict[str, list[float]] = {}
        self._locked_until: dict[str, float] = {}
        self._lock = threading.Lock()

    def is_locked(self, key: str) -> bool:
        now = self._clock()
        with self._lock:
            locked_until = self._locked_until.get(key)
            if locked_until is None:
                return False
            if locked_until <= now:
                self._locked_until.pop(key, None)
                return False
            return True

    def record_failure(self, key: str) -> bool:
        """Record an invalid lookup and return True when it starts a lockout."""
        now = self._clock()
        with self._lock:
            attempts = [
                attempted_at
                for attempted_at in self._failed_attempts.get(key, [])
                if now - attempted_at < self.window_seconds
            ]
            attempts.append(now)
            if len(attempts) >= self.max_attempts:
                self._failed_attempts.pop(key, None)
                self._locked_until[key] = now + self.lockout_seconds
                return True
            self._failed_attempts[key] = attempts
            return False

    def clear(self) -> None:
        with self._lock:
            self._failed_attempts.clear()
            self._locked_until.clear()


status_lookup_limiter = InvalidLookupRateLimiter()
