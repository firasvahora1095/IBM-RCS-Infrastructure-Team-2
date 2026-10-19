import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { activeSection, MANAGER_SECTIONS } from "./managerSections";

/**
 * The Manager TopNav (Figma component "TopNav=Manager", node 94:132): the five
 * Manager sections, each a real route (Task 103).
 *
 * Real links rather than buttons, because these navigate between pages. The
 * active section is worked out from the path so that sub-pages (an SOS alert,
 * a reassignment decision) keep the section they belong to marked with
 * aria-current="page".
 */
export function ManagerTopNav({ end, counts = {} }: { end?: ReactNode; counts?: Record<string, number> }) {
  const active = activeSection(useLocation().pathname);
  return (
    <div
      className="rcs-app-tabbar"
    >
      <nav aria-label="Manager sections" className="rcs-app-tabs">
        {MANAGER_SECTIONS.map((tab) => {
          const isActive = tab.path === active;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              aria-current={isActive ? "page" : undefined}
              className="rcs-app-tab"
            >
              {tab.label}
              {(counts[tab.path] ?? 0) > 0 && (
                <span className="rcs-subnav-count rcs-subnav-count--neutral">
                  {counts[tab.path]}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      {end}
    </div>
  );
}
