import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useClientAuth } from "../../hooks/useClientAuth";

/**
 * Guards the CommunityHub client pages. A staff session doesn't count: the
 * client surface checks its own session only (deny by default).
 */
export function ClientRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useClientAuth();
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/client/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
