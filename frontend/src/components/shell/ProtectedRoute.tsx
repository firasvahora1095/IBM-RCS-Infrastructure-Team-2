import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, ROLE_HOME, type StaffRole } from "../../hooks/useAuth";

interface ProtectedRouteProps {
  allowedRole: StaffRole;
  children: ReactNode;
}

/**
 * Blocks a staff page unless the logged-in role matches. Covers two of Task
 * 60's requirements: each role only reaches its own view (an Auditor
 * opening /manager is sent to /auditor, and vice versa), and a logged-out
 * session can't be resumed — useAuth reads sessionStorage when this mounts,
 * so there's no stale in-memory flag that could outlive a logout.
 */
export function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const { isLoggedIn, role } = useAuth();

  if (!isLoggedIn || !role) {
    return <Navigate to="/staff/login" replace />;
  }
  if (role !== allowedRole) {
    // Logged in as the other role: send them to their own view rather than
    // an error, since we know exactly where they belong.
    return <Navigate to={ROLE_HOME[role]} replace />;
  }
  return <>{children}</>;
}
