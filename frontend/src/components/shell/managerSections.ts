/**
 * The Manager sections. Six, not eight: the work queues (SOS Inbox,
 * Reassignment Queue) are reached from the Overview's "Needs you" inbox. Analytics
 * live under Insights; Validation (with the audit history) has its own tab.
 * Routes are unchanged; each sub-page keeps its owning section highlighted
 * (docs/ux/manager-ux-audit-and-redesign.md §4).
 */
export interface NavTab {
  label: string;
  path: string;
  /** Pages that belong to this section as well as `path` itself. */
  owns: readonly RegExp[];
}

export const MANAGER_SECTIONS: readonly NavTab[] = [
  {
    label: "Overview",
    path: "/manager",
    owns: [/^\/manager$/, /^\/manager\/(sos|reassignment|auditors)(\/|$)/, /^\/manager\/cases\/[^/]+\/(reassign|raw)$/],
  },
  { label: "Cases", path: "/manager/cases", owns: [/^\/manager\/cases(\/|$)/] },
  {
    label: "Deliveries",
    path: "/manager/deliveries",
    owns: [/^\/manager\/(deliveries|customers|messages)(\/|$)/],
  },
  { label: "Reports", path: "/manager/reports", owns: [/^\/manager\/reports(\/|$)/] },
  { label: "Insights", path: "/manager/insights", owns: [/^\/manager\/insights(\/|$)/] },
  // Assurance, not analytics: "can we trust the AI, and can every result be traced?" is asked on its own
  // and must be found without knowing it lives under another page. Six tabs stays inside what a tab bar holds.
  { label: "Validation", path: "/manager/validation", owns: [/^\/manager\/(validation|audit-logs)(\/|$)/] },
];

/** The section a page belongs to. The first match wins, so a case's reassignment page counts as Overview. */
export function activeSection(pathname: string): string | undefined {
  return MANAGER_SECTIONS.find((tab) => tab.owns.some((pattern) => pattern.test(pathname)))?.path;
}
