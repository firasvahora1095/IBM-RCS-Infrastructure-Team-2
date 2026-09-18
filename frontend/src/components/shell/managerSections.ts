/** The five Manager sections, in Figma TopNav order (94:132). */
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
  { label: "Validation", path: "/manager/validation", end: false },
];
