import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OverflowMenu, OverflowMenuItem } from "@carbon/react";
import { Settings } from "@carbon/icons-react";
import { isMockData } from "../../services";
import { DEMO_CONNECTION_LOST_EVENT, DEMO_SCENARIO_EVENT, demoScenarios } from "../../services/mock/demo";
import { useAuth, type StaffRole } from "../../hooks/useAuth";
import { notifyWellbeingChanged } from "../../hooks/useMyWellbeing";
import { notifySosChanged } from "../../hooks/useSosSummary";

interface Scenario {
  label: string;
  run: (token: string) => void;
  /** Also shown on Manager screens. */
  forManager?: boolean;
  /** Shown on Manager screens only. */
  managerOnly?: boolean;
}

const SCENARIOS: Scenario[] = [
  {
    label: "Drop the connection for 8 seconds",
    run: () => window.dispatchEvent(new CustomEvent(DEMO_CONNECTION_LOST_EVENT, { detail: { seconds: 8 } })),
  },
  { label: "Fail my next submission or save", run: () => demoScenarios.failNextSubmission(), forManager: true },
  {
    label: "Make the next reassignment target unavailable",
    run: () => demoScenarios.makeNextReassignTargetUnavailable(),
    forManager: true,
    managerOnly: true,
  },
  { label: "Expire my session", run: (token) => demoScenarios.expireSession(token), forManager: true },
  { label: "Put me at my exposure limit", run: (token) => demoScenarios.reachExposureLimit(token) },
  { label: "Start a 15-minute S3 cooldown", run: (token) => demoScenarios.startCooldown(token, "S3", 15) },
  { label: "Start a 30-minute S4 cooldown", run: (token) => demoScenarios.startCooldown(token, "S4", 30) },
  { label: "End my cooldown (manager checked in)", run: (token) => demoScenarios.finishCooldown(token) },
];

/**
 * "Demo scenarios" menu in the staff header, mock mode only. Forces the edge
 * states the prototypes design for — lost connection, failed submission,
 * expired session, exposure limit, cooldowns — so every designed screen can
 * be shown on demand. It never renders against the real backend.
 */
export function DemoScenarioMenu({ role }: { role: StaffRole }) {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState("");

  if (!isMockData || !token) return null;

  const scenarios = SCENARIOS.filter((s) => (role === "auditor" ? !s.managerOnly : s.forManager));

  function apply(scenario: Scenario) {
    if (!token) return;
    scenario.run(token);
    window.dispatchEvent(new Event(DEMO_SCENARIO_EVENT));
    notifyWellbeingChanged();
    notifySosChanged();
    setAnnouncement(`Demo scenario applied: ${scenario.label}.`);
  }

  return (
    <>
      <OverflowMenu
        renderIcon={Settings}
        iconDescription="Demo scenarios"
        aria-label="Demo scenarios"
        flipped
        size="lg"
        menuOptionsClass="rcs-demo-menu"
      >
        {scenarios.map((scenario) => (
          <OverflowMenuItem key={scenario.label} itemText={scenario.label} onClick={() => apply(scenario)} />
        ))}
        <OverflowMenuItem
          hasDivider
          isDelete
          itemText="Reset all demo data"
          onClick={() => {
            demoScenarios.reset();
            logout();
            navigate("/staff/login", { replace: true });
          }}
        />
      </OverflowMenu>
      <span className="cds--visually-hidden" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}
