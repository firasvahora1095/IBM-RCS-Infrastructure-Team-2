import { Header, HeaderName, HeaderGlobalBar, Theme } from "@carbon/react";
import { useNavigate } from "react-router-dom";
import { useAuth, ROLE_HOME, type StaffRole } from "../../hooks/useAuth";
import { DemoDataBadge } from "./DemoDataBadge";

const ROLE_LABEL: Record<StaffRole, string> = {
  auditor: "Auditor",
  manager: "Manager",
};

interface StaffHeaderProps {
  role: StaffRole;
}

/**
 * The staff UI Shell header (Figma components "Header=Auditor" and
 * "Header=Manager"): "RCS — {Role}" on the left, the logged-in staff member
 * and a Sign out link on the right. One component with a role prop, since
 * the two variants differ only in their label and home route.
 *
 * Deliberately omitted, because both are Sprint 3 and there is no data for
 * them: the Auditor's exposure bar ("62 / 120 min today") and the Manager's
 * SOS badge/banner. Showing either with a static number would look like
 * live data.
 */
export function StaffHeader({ role }: StaffHeaderProps) {
  const { staffId, logout } = useAuth();
  const navigate = useNavigate();
  const label = ROLE_LABEL[role];

  function handleSignOut() {
    logout();
    // Task 60 AC: pressing Back after this must not restore access. `replace`
    // drops the staff page from history, and ProtectedRoute re-checks the
    // (now cleared) session if the user navigates back to it anyway.
    navigate("/staff/login", { replace: true });
  }

  return (
    <Theme theme="g100">
      <Header aria-label={`RCS — ${label}`}>
        <HeaderName href={ROLE_HOME[role]} prefix="">
          {`RCS — ${label}`}
        </HeaderName>
        <DemoDataBadge />
        <HeaderGlobalBar className="items-center gap-6 pr-6">
          {staffId && (
            <span style={{ fontSize: 14, color: "#ffffff" }}>
              {label}: {staffId}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="cursor-pointer"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "#ffffff",
              fontSize: 14,
              fontFamily: "inherit",
              textDecoration: "underline",
            }}
          >
            Sign out
          </button>
        </HeaderGlobalBar>
      </Header>
    </Theme>
  );
}
