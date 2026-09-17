import { NavLink } from "react-router-dom";
import { MANAGER_SECTIONS } from "./managerSections";

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
 * five sections, each a real route (Task 103).
 *
 * Real links (NavLink) rather than buttons, because these navigate between
 * pages; NavLink also sets aria-current="page" on the active section.
 */
export function ManagerTopNav() {
  return (
    <nav
      aria-label="Manager sections"
      className="flex flex-wrap gap-2 px-6 sm:px-8"
      style={{
        backgroundColor: "var(--cds-background)",
        borderBottom: "1px solid var(--cds-border-subtle-01)",
      }}
    >
      {MANAGER_SECTIONS.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.end}
          style={({ isActive }) => ({
            ...tabBase,
            color: isActive ? "var(--cds-text-primary)" : "var(--cds-text-secondary)",
            fontWeight: isActive ? 600 : 400,
            borderBottomColor: isActive ? "var(--cds-border-interactive)" : "transparent",
          })}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
