import { NavLink } from "react-router-dom";

interface NavTab {
  label: string;
  path: string;
  /** Only Dashboard and Case Oversight exist as Sprint 2 scaffolds. */
  availableThisSprint: boolean;
}

const TABS: NavTab[] = [
  { label: "Dashboard", path: "/manager", availableThisSprint: true },
  { label: "Case Oversight", path: "/manager/cases", availableThisSprint: true },
  { label: "SOS Inbox", path: "/manager/sos", availableThisSprint: false },
  { label: "Reassignment Queue", path: "/manager/reassignment", availableThisSprint: false },
  { label: "Validation", path: "/manager/validation", availableThisSprint: false },
];

const tabBase = {
  display: "inline-block",
  padding: "14px 4px 12px",
  fontSize: 14,
  lineHeight: "18px",
  textDecoration: "none",
  borderBottom: "2px solid transparent",
} as const;

/**
 * The Manager TopNav (Figma component "TopNav=Manager", node 94:132): all
 * five sections are shown so the intended navigation structure is visible,
 * but only Dashboard and Case Oversight navigate this sprint. SOS Inbox,
 * Reassignment Queue and Validation are Sprint 3 screens, so they're shown
 * as disabled items labelled "(Sprint 3)" — never links that 404.
 *
 * Real links (NavLink) rather than buttons, because these navigate between
 * pages; NavLink also sets aria-current="page" on the active section.
 */
export function ManagerTopNav() {
  return (
    <nav
      aria-label="Manager sections"
      className="flex flex-wrap gap-2 px-6 sm:px-8"
      // Sits in normal flow directly below Carbon's fixed 48px header.
      style={{ marginTop: 48, backgroundColor: "#ffffff", borderBottom: "1px solid #c6c6c6" }}
    >
      {TABS.map((tab) =>
        tab.availableThisSprint ? (
          <NavLink
            key={tab.path}
            to={tab.path}
            end
            style={({ isActive }) => ({
              ...tabBase,
              color: isActive ? "#0f62fe" : "#525252",
              fontWeight: isActive ? 600 : 400,
              borderBottomColor: isActive ? "#0f62fe" : "transparent",
            })}
          >
            {tab.label}
          </NavLink>
        ) : (
          <span
            key={tab.path}
            aria-disabled="true"
            title="Coming in Sprint 3"
            style={{ ...tabBase, color: "#a8a8a8", cursor: "not-allowed" }}
          >
            {tab.label}
            <span style={{ fontSize: 11, marginLeft: 6 }}>(Sprint 3)</span>
          </span>
        ),
      )}
    </nav>
  );
}
