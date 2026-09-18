import { useCallback, useState } from "react";
import { ApiError } from "../services/types";
import { SessionExpiredModal } from "../components/auth/SessionExpiredModal";

/**
 * For pages holding unsaved work (a follow-up note, a reassignment decision):
 * a 401 opens the in-context re-auth dialog instead of leaving the page, so
 * nothing typed is lost (Manager Figma 1:1231, Auditor 36:235).
 *
 * `handleSessionError(err)` returns true when it handled the error.
 */
export function useInPlaceSessionExpiry(preservedWorkMessage: string) {
  const [expired, setExpired] = useState(false);

  const handleSessionError = useCallback((err: unknown): boolean => {
    if (err instanceof ApiError && err.status === 401) {
      setExpired(true);
      return true;
    }
    return false;
  }, []);

  const modal = (
    <SessionExpiredModal
      open={expired}
      preservedWorkMessage={preservedWorkMessage}
      onReauthenticated={() => setExpired(false)}
    />
  );

  return { sessionExpired: expired, handleSessionError, sessionModal: modal };
}
