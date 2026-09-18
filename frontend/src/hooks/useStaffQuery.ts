import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../services/types";
import { useAuth } from "./useAuth";
import { useSessionExpiryHandler } from "./useSessionExpiryHandler";

interface StaffQuery<T> {
  data: T | null;
  error: string | null;
  /** Loads again, e.g. after an action changed the data. */
  reload: () => void;
}

/**
 * Loads data for a staff page with the signed-in token. An expired session on
 * load sends the user to login (there is no unsaved work yet); any other
 * failure becomes a readable message. `key` reloads when it changes.
 */
export function useStaffQuery<T>(load: (token: string) => Promise<T>, key: string = ""): StaffQuery<T> {
  const { token } = useAuth();
  const handleSessionExpiry = useSessionExpiryHandler();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    loadRef
      .current(token)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled || handleSessionExpiry(err)) return;
        setError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
      });
    return () => {
      cancelled = true;
    };
  }, [token, key, version, handleSessionExpiry]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, reload };
}
