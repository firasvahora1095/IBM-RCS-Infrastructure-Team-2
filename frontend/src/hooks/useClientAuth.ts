import { useCallback, useEffect, useState } from "react";
import { clientLogin } from "../services";

/**
 * Session for the CommunityHub authorised user (role COMMUNITYHUB_CLIENT,
 * B2B spec S11). Deliberately separate from the staff session: different
 * storage keys, a different guard and a different login page, so a client
 * session can never open a staff page and vice versa.
 *
 * sessionStorage, as for staff: the session ends with the tab and sign-out
 * clears it, so Back after sign-out doesn't restore access. Production would
 * use organisation SSO/OIDC with MFA (Sprint 3 extras §16.12).
 */
const TOKEN_KEY = "rcs_client_token";
const PROFILE_KEY = "rcs_client_profile";
const CHANGED_EVENT = "rcs:client-session-changed";

export interface ClientSession {
  token: string;
  userId: string;
  displayName: string;
  organisationId: string;
  organisationName: string;
}

export function readClientSession(): ClientSession | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const raw = sessionStorage.getItem(PROFILE_KEY);
  if (!token || !raw) return null;
  try {
    const profile = JSON.parse(raw) as Omit<ClientSession, "token">;
    return { token, ...profile };
  } catch {
    return null;
  }
}

export function useClientAuth() {
  const [session, setSession] = useState<ClientSession | null>(readClientSession);

  useEffect(() => {
    const sync = () => setSession(readClientSession());
    window.addEventListener(CHANGED_EVENT, sync);
    return () => window.removeEventListener(CHANGED_EVENT, sync);
  }, []);

  const login = useCallback(async (userId: string, password: string) => {
    const result = await clientLogin(userId, password);
    const profile = {
      userId: result.user_id,
      displayName: result.display_name,
      organisationId: result.organisation_id,
      organisationName: result.organisation_name,
    };
    sessionStorage.setItem(TOKEN_KEY, result.token);
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event(CHANGED_EVENT));
    setSession({ token: result.token, ...profile });
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(PROFILE_KEY);
    window.dispatchEvent(new Event(CHANGED_EVENT));
    setSession(null);
  }, []);

  return { session, isLoggedIn: session !== null, token: session?.token ?? null, login, logout };
}
