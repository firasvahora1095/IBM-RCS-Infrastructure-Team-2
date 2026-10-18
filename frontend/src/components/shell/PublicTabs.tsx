import { Link, useLocation } from "react-router-dom";

/** The same underline tab bar the Manager and client portal use, so every part of RCS navigates the same way. */
const tabBase = {
  display: "inline-flex",
  alignItems: "center",
  padding: "14px 4px 12px",
  fontSize: 14,
  lineHeight: "18px",
  textDecoration: "none",
  borderBottom: "2px solid transparent",
} as const;

const TABS = [
  {
    label: "Report content",
    path: "/report",
    owns: (p: string) => p === "/report" || p.startsWith("/report/confirmation"),
  },
  { label: "Check case status", path: "/report/status", owns: (p: string) => p.startsWith("/report/status") },
  { label: "Contact us", path: "/report/contact", owns: (p: string) => p.startsWith("/report/contact") },
];

/**
 * The two things a reporter does: send a report, or come back to see how it is going. Both are always one click away
 * on every page of this flow, so someone returning with a case ID never has to hunt for the way in.
 */
export function PublicTabs() {
  const { pathname } = useLocation();
  return (
    <div
      style={{
        paddingTop: 48,
        backgroundColor: "var(--cds-background)",
        borderBottom: "1px solid var(--cds-border-subtle-01)",
      }}
    >
      <nav aria-label="Reporting" className="flex flex-wrap gap-2 px-6 sm:px-8">
        {TABS.map((tab) => {
          const active = tab.owns(pathname);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              aria-current={active ? "page" : undefined}
              style={{
                ...tabBase,
                color: active ? "var(--cds-text-primary)" : "var(--cds-text-secondary)",
                fontWeight: active ? 600 : 400,
                borderBottomColor: active ? "var(--cds-border-interactive)" : "transparent",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
