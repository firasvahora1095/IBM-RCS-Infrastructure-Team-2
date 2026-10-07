import { Navigate } from "react-router-dom";
import { clientHome, useClientAuth } from "../../hooks/useClientAuth";

/** /client sends each signed-in role to the first section it can see. */
export function ClientHomeRedirect() {
  const { session } = useClientAuth();
  return <Navigate to={session ? clientHome(session.role) : "/client/login"} replace />;
}
