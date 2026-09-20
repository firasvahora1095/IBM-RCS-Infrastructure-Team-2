import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../services/types";
import { useAuth } from "./useAuth";

/**
 * Returns a handler for staff API errors: if the backend rejected the token
 * (401), it clears the local session and sends the user back to login with
 * a "Your session has ended" notice, and returns true so the caller skips
 * its own error message.
 *
 * Why this is needed now, not in Sprint 3: the test backend keeps sessions
 * in memory, so every redeploy invalidates every token. Without this, a
 * staff page would just show "Not authenticated" with no way forward. The
 * full designed Session-expired-reauth screen is still Sprint 3 scope.
 */
export function useSessionExpiryHandler() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return useCallback(
    (err: unknown): boolean => {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        navigate("/staff/login", { replace: true, state: { sessionEnded: true } });
        return true;
      }
      return false;
    },
    [logout, navigate],
  );
}
