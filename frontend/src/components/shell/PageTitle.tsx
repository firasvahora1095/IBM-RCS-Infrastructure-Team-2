import { useEffect } from "react";
import { matchPath, useLocation } from "react-router-dom";

const SITE = "Responsible Content Safety (RCS)";

/**
 * The browser-tab title for every screen, named for what the person is looking at. The tab, the history list and a
 * screen reader's announcement of a new page all use it (WCAG 2.4.2, Page Titled), and a tab that still said "Demo
 * guide" on the Manager dashboard would show in the live demo. Titles use the wording on the screen, never a case,
 * delivery or report ID. The most specific route goes first. A test keeps this list in step with the routes in App.tsx.
 */
export const PAGE_TITLES: [path: string, title: string][] = [
  ["/rcs/team", "The team"],
  ["/rcs/get-started", "Set up your organisation"],
  ["/communityhub/moderation", "CommunityHub moderation (simulated)"],
  ["/communityhub", "CommunityHub (simulated)"],
  ["/flow", "Demo guide"],
  ["/report/confirmation", "Report received"],
  ["/report/status", "Check your case status"],
  ["/report/contact", "Contact us"],
  ["/report", "Report content"],
  ["/staff/login", "Staff sign in"],
  ["/client/login", "Client sign in"],
  ["/auditor/cases/:caseId", "Case review"],
  ["/auditor/cooldown", "Cooldown"],
  ["/auditor", "Case queue"],
  ["/manager/cases/:caseId/review", "Case review"],
  ["/manager/cases/:caseId/reassign", "Reassign a case"],
  ["/manager/cases/:caseId/raw", "Exceptional access"],
  ["/manager/cases", "Cases"],
  ["/manager/sos/:alertId/follow-up", "SOS follow-up"],
  ["/manager/sos/:alertId", "SOS alert"],
  ["/manager/sos", "SOS inbox"],
  ["/manager/reassignment", "Reassignment queue"],
  ["/manager/deliveries/:deliveryId", "Delivery"],
  ["/manager/deliveries", "Deliveries"],
  ["/manager/customers/communityhub", "Client connections"],
  ["/manager/reports/:reportId", "Client report"],
  ["/manager/reports", "Client reports"],
  ["/manager/messages/:messageId", "Client message"],
  ["/manager/messages", "Client messages"],
  ["/manager/auditors/:auditorId", "Auditor record"],
  ["/manager/audit-logs", "Audit history"],
  ["/manager/validation", "Validation & Audit"],
  ["/manager/insights", "Insights"],
  ["/manager", "Overview"],
  ["/client/cases", "Case results"],
  ["/client/reports/:reportId", "Service report"],
  ["/client/reports", "Service reports"],
  ["/client/messages/new", "Contact RCS"],
  ["/client/messages/:messageId", "Your message"],
  ["/client/messages", "Messages"],
];

/** The full tab title for a path. The product page and any unknown address use the product name on its own. */
export function titleFor(pathname: string): string {
  for (const [path, title] of PAGE_TITLES) {
    if (matchPath({ path, end: true }, pathname)) return `${title} · ${SITE}`;
  }
  return SITE;
}

/** Keeps the tab title in step with the screen. Render once, inside the router. */
export function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = titleFor(pathname);
  }, [pathname]);
  return null;
}
