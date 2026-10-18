import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { activeSection, MANAGER_SECTIONS } from "./managerSections";

const tabBase = {
  display: "inline-block",
  padding: "14px 4px 12px",
  fontSize: 14,
  lineHeight: "18px",
  textDecoration: "none",
  borderBottom: "2px solid transparent",
} as const;

/**
 * The Manager TopNav (Figma component "TopNav=Manager", node 94:132): the five
 * Manager sections, each a real route (Task 103).
 *
 * Real links rather than buttons, because these navigate between pages. The
 * active section is worked out from the path so that sub-pages (an SOS alert,
 * a reassignment decision) keep the section they belong to marked with
 * aria-current="page".
 */
export function ManagerTopNav({ end }: { end?: ReactNode }) {
  const active = activeSection(useLocation().pathname);
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-4 px-6 sm:px-8"
      style={{
        backgroundColor: "var(--cds-background)",
        borderBottom: "1px solid var(--cds-border-subtle-01)",
      }}
    >
      <nav aria-label="Manager sections" className="flex flex-wrap gap-2">
        {MANAGER_SECTIONS.map((tab) => {
          const isActive = tab.path === active;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              aria-current={isActive ? "page" : undefined}
              style={{
                ...tabBase,
                color: isActive ? "var(--cds-text-primary)" : "var(--cds-text-secondary)",
                fontWeight: isActive ? 600 : 400,
                borderBottomColor: isActive ? "var(--cds-border-interactive)" : "transparent",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {end}
    </div>
  );
}
