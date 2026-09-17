import type { ReactNode } from "react";
import { StaffHeader } from "../shell/StaffHeader";
import { ManagerTopNav } from "../shell/ManagerTopNav";
import { SosAlertBanner } from "../notifications/SosAlertBanner";
import { StaffPage } from "./StaffPage";
import { useSosSummary } from "../../hooks/useSosSummary";

interface ManagerLayoutProps {
  children: ReactNode;
  /**
   * Section pages (Dashboard, Case Oversight, SOS Inbox, Reassignment Queue,
   * Validation) show the TopNav; drill-down pages use a breadcrumb instead,
   * as in the Figma file.
   */
  showNav?: boolean;
  /** The persistent SOS banner (MR-SOS-03). Off on SOS detail pages, which already are the alert. */
  showSosBanner?: boolean;
  maxWidth?: number;
}

/**
 * Shared frame for every Manager screen: dark header with the SOS badge, the
 * SOS banner, the section TopNav, then the page body.
 */
export function ManagerLayout({ children, showNav = true, showSosBanner = true, maxWidth }: ManagerLayoutProps) {
  const sos = useSosSummary();
  return (
    <>
      <StaffHeader role="manager" sosSummary={sos} />
      {/* Carbon's header is fixed at 48px; this block sits in normal flow below it. */}
      <div style={{ paddingTop: 48 }}>
        {showSosBanner && <SosAlertBanner summary={sos} />}
        {showNav && <ManagerTopNav />}
      </div>
      <StaffPage clearHeader={false} maxWidth={maxWidth}>
        {children}
      </StaffPage>
    </>
  );
}
