import { Header, HeaderName, HeaderGlobalBar, Tag, Theme } from "@carbon/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import type { SosSummary } from "../../services/types";
import { useAuth, ROLE_HOME, type StaffRole } from "../../hooks/useAuth";
import { DemoDataBadge } from "./DemoDataBadge";
import { DemoScenarioMenu } from "./DemoScenarioMenu";
import { ExposureBar } from "../exposure/ExposureBar";
import { useMyWellbeing } from "../../hooks/useMyWellbeing";

const ROLE_LABEL: Record<StaffRole, string> = {
  auditor: "Auditor",
  manager: "Manager",
};

interface StaffHeaderProps {
  role: StaffRole;
  /** Manager only: unresolved SOS alerts, shown as the header badge (Figma "SOS badge", 21:9). */
  sosSummary?: SosSummary | null;
}

/**
 * The staff UI Shell header (Figma components "Header=Auditor" and
 * "Header=Manager"): "RCS — {Role}" on the left, the logged-in staff member
 * and a Sign out link on the right. One component with a role prop, since
 * the two variants differ only in their label and home route.
 *
 * Auditors also see their exposure today against their limit ("62 / 120 min
 * today", AR-WB-01). It only renders when the data source actually provides
 * exposure data, so there's never a made-up number.
 */
export function StaffHeader({ role, sosSummary }: StaffHeaderProps) {
  const { staffId, logout } = useAuth();
  const navigate = useNavigate();
  const label = ROLE_LABEL[role];
  const { wellbeing } = useMyWellbeing();

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
          {role === "auditor" && wellbeing && (
            <ExposureBar
              surface="dark"
              warnAtLimit
              minutes={wellbeing.exposure_minutes_today}
              limit={wellbeing.exposure_limit_minutes}
              label={`${wellbeing.exposure_minutes_today} / ${wellbeing.exposure_limit_minutes} min today`}
              ariaLabel="Your exposure today"
            />
          )}
          {role === "manager" && sosSummary && sosSummary.unresolved_count > 0 && (
            <RouterLink to="/manager/sos" style={{ textDecoration: "none" }}>
              <Tag type="red" size="md" style={{ cursor: "pointer", margin: 0 }}>
                {sosSummary.unresolved_count} SOS {sosSummary.unresolved_count === 1 ? "alert" : "alerts"}
              </Tag>
            </RouterLink>
          )}
          {staffId && (
            <span style={{ fontSize: 14, color: "var(--cds-text-primary)" }}>
              {label}: {staffId}
            </span>
          )}
          <DemoScenarioMenu role={role} />
          <button
            type="button"
            onClick={handleSignOut}
            className="cursor-pointer"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "var(--cds-text-primary)",
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
