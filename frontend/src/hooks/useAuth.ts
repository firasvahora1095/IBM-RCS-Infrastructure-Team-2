import { useCallback, useState } from "react";
import { staffLogin } from "../api/client";

const TOKEN_KEY = "rcs_staff_token";
const ROLE_KEY = "rcs_staff_role";
const STAFF_ID_KEY = "rcs_staff_id";

export type StaffRole = "auditor" | "manager";

/** Where each role lands after login, or when it opens the other role's page. */
export const ROLE_HOME: Record<StaffRole, string> = {
  auditor: "/auditor",
  manager: "/manager",
};

export interface StaffSession {
  token: string;
  role: StaffRole;
  staffId: string;
}

/** Reads the current session straight from sessionStorage. */
export function readStaffSession(): StaffSession | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const role = sessionStorage.getItem(ROLE_KEY);
  if (!token || (role !== "auditor" && role !== "manager")) {
    return null;
  }
  // The API returns no display name, only the ID used to log in, so that's
  // what the staff headers show (rather than inventing a name like the
  // Figma mockups' "J. Doe").
  return { token, role, staffId: sessionStorage.getItem(STAFF_ID_KEY) ?? "" };
}

function clearStaffSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  sessionStorage.removeItem(STAFF_ID_KEY);
}

/**
 * Staff session state for login, logout and role checks.
 *
 * sessionStorage (not localStorage) is deliberate: Task 60's AC requires
 * that "logging out and pressing back does not restore access." A
 * sessionStorage session also ends when the tab closes, and logout clears
 * it explicitly. ProtectedRoute re-reads storage whenever it mounts, so
 * pressing Back to a staff URL after logout redirects to login instead of
 * restoring the page.
 *
 * Known limitation (backend): there is no logout endpoint, so the bearer
 * token stays valid server-side until the backend restarts. Logging out
 * removes it from this browser, which is all the frontend can do.
 */
export function useAuth() {
  const [session, setSession] = useState<StaffSession | null>(readStaffSession);

  const login = useCallback(async (staffId: string, password: string): Promise<StaffRole> => {
    const result = await staffLogin(staffId, password);
    sessionStorage.setItem(TOKEN_KEY, result.token);
    sessionStorage.setItem(ROLE_KEY, result.role);
    sessionStorage.setItem(STAFF_ID_KEY, staffId);
    setSession({ token: result.token, role: result.role, staffId });
    return result.role;
  }, []);

  const logout = useCallback(() => {
    clearStaffSession();
    setSession(null);
  }, []);

  return {
    token: session?.token ?? null,
    role: session?.role ?? null,
    staffId: session?.staffId ?? "",
    isLoggedIn: session !== null,
    login,
    logout,
  };
}
