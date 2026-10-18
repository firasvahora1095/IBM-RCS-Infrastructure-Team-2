import { Link, useLocation } from "react-router-dom";
import { canSee, useClientAuth } from "../../hooks/useClientAuth";
import { useClientQuery } from "../../hooks/useClientQuery";
import { clientListCaseResults } from "../../services";

/** The same tab bar the Manager has: a light row under the header, an underline on the section you are in. */
const tabBase = {
  display: "inline-flex",
  alignItems: "center",
  padding: "14px 4px 12px",
  fontSize: 14,
  lineHeight: "18px",
  textDecoration: "none",
  borderBottom: "2px solid transparent",
} as const;

interface Tab {
  label: string;
  path: string;
  /** A client's own list stays one section however deep they go (a report, a message). */
  owns: RegExp;
}

const TABS: { tab: Tab; section?: "reports" | "cases" }[] = [
  { tab: { label: "Reports", path: "/client/reports", owns: /^\/client\/reports(\/|$)/ }, section: "reports" },
  { tab: { label: "Case results", path: "/client/cases", owns: /^\/client\/cases(\/|$)/ }, section: "cases" },
  { tab: { label: "Messages", path: "/client/messages", owns: /^\/client\/messages(\/|$)/ } },
];

/**
 * Sections of the CommunityHub portal, as real links. Only the sections the account's role includes are shown.
 * Case results carries a dark count of delivered results still waiting for the team's action, the one thing in
 * the portal that is waiting for them (the same neutral badge the Manager's tabs use).
 */
export function ClientTopNav() {
  const { pathname } = useLocation();
  const { session } = useClientAuth();
  const showsCases = canSee(session?.role, "cases");
  const results = useClientQuery(showsCases ? clientListCaseResults : () => Promise.resolve([]));
  const waiting = (results.data ?? []).filter((r) => r.status === "DELIVERED" && !r.platform_action).length;

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 px-6 sm:px-8"
      style={{ backgroundColor: "var(--cds-background)", borderBottom: "1px solid var(--cds-border-subtle-01)" }}
    >
      <nav aria-label="Client sections" className="flex flex-wrap gap-2">
        {TABS.filter(({ section }) => !section || canSee(session?.role, section)).map(({ tab }) => {
          const isActive = tab.owns.test(pathname);
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
              {tab.path === "/client/cases" && waiting > 0 && (
                <span className="rcs-subnav-count rcs-subnav-count--neutral" style={{ marginInlineStart: 8 }}>
                  {waiting}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
