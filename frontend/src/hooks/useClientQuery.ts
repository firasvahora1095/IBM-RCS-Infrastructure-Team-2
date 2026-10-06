import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../services/types";
import { useClientAuth } from "./useClientAuth";

interface ClientQuery<T> {
  data: T | null;
  error: ApiError | Error | null;
  reload: () => void;
}

/**
 * Loads data for a client page. An expired session returns the user to the
 * client sign-in; anything else is passed back for the page to show (the
 * report page turns a 404 into its "no access" state).
 */
export function useClientQuery<T>(load: (token: string) => Promise<T>, key: string = ""): ClientQuery<T> {
  const { token, logout } = useClientAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
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
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          logout();
          navigate("/client/login", { replace: true, state: { expired: true } });
          return;
        }
        setError(err instanceof Error ? err : new Error(NETWORK_ERROR_MESSAGE));
      });
    return () => {
      cancelled = true;
    };
  }, [token, key, version, logout, navigate]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, reload };
}
