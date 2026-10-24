import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { canSee, useClientAuth } from "../../hooks/useClientAuth";
import { useClientQuery } from "../../hooks/useClientQuery";
import { clientCaseResultsSummary } from "../../services";

/** Fired when a case result is actioned, so the count on the Case results tab refreshes. */
export const CLIENT_RESULTS_CHANGED_EVENT = "rcs:client-results-changed";

/** The same tab bar the Manager has: a light row under the header, an underline on the section you are in. */
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
  const results = useClientQuery(showsCases ? clientCaseResultsSummary : () => Promise.resolve(null));
  const { reload } = results;
  useEffect(() => {
    window.addEventListener(CLIENT_RESULTS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(CLIENT_RESULTS_CHANGED_EVENT, reload);
  }, [reload]);
  const waiting = results.data?.needs_action ?? 0;

  return (
    <div
      className="rcs-app-tabbar"
    >
      <nav aria-label="Client sections" className="rcs-app-tabs">
        {TABS.filter(({ section }) => !section || canSee(session?.role, section)).map(({ tab }) => {
          const isActive = tab.owns.test(pathname);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              aria-current={isActive ? "page" : undefined}
              className="rcs-app-tab"
            >
              {tab.label}
              {tab.path === "/client/cases" && waiting > 0 && (
                <span className="rcs-subnav-count rcs-subnav-count--neutral">
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
