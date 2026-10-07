/**
 * The Manager sections: the five from the Figma TopNav (94:132) plus Deliveries
 * and Reports from the B2B flow (docs/ux/b2b-end-to-end-flow-spec.md §2).
 */
export interface NavTab {
  label: string;
  path: string;
  /** False when sub-pages (e.g. /manager/sos/:alertId) keep this section highlighted. */
  end: boolean;
}

export const MANAGER_SECTIONS: readonly NavTab[] = [
  { label: "Dashboard", path: "/manager", end: true },
  { label: "Case Oversight", path: "/manager/cases", end: true },
  { label: "SOS Inbox", path: "/manager/sos", end: false },
  { label: "Reassignment Queue", path: "/manager/reassignment", end: false },
  { label: "Deliveries", path: "/manager/deliveries", end: false },
  { label: "Reports", path: "/manager/reports", end: false },
  { label: "Validation", path: "/manager/validation", end: false },
];
