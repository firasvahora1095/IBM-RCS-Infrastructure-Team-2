import type { ReactNode } from "react";
import { StaffHeader } from "../shell/StaffHeader";
import { ManagerTopNav } from "../shell/ManagerTopNav";
import { ClientSwitcher } from "../shell/ClientSwitcher";
import { ManagerSubNav } from "../shell/ManagerSubNav";
import { SosAlertBanner } from "../notifications/SosAlertBanner";
import { StaffPage } from "./StaffPage";
import { useSosSummary } from "../../hooks/useSosSummary";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { listClientMessages, listDeclinedCases, listDeliveries } from "../../services";

interface ManagerLayoutProps {
  children: ReactNode;
  /**
   * Section pages (Dashboard, Case Oversight, SOS inbox, Reassignment queue,
   * Validation) show the TopNav; drill-down pages use a breadcrumb instead,
   * as in the Figma file.
   */
  showNav?: boolean;
  /** The persistent SOS banner (MR-SOS-03). Off on SOS detail pages, which already are the alert. */
  showSosBanner?: boolean;
  maxWidth?: number;
  /** Shows the client selector. On for pages that belong to one client; off for Overview, SOS and Auditors. */
  clientScope?: boolean;
}

/**
 * Shared frame for every Manager screen: dark header with the SOS badge, the
 * SOS banner, the section TopNav, then the page body.
 */
export function ManagerLayout({ children, showNav = true, showSosBanner = true, maxWidth, clientScope = false }: ManagerLayoutProps) {
  const sos = useSosSummary();
  // The counts on the work-queue tabs: cases waiting for a new Auditor and Client messages not yet answered.
  const declined = useStaffQuery(listDeclinedCases, "", { refreshMs: 30_000 });
  // Deliveries that failed and need a person. Cases has no count of its own: what needs you there is the SOS and
  // reassignment items, already counted on their own tabs, so a second number would count the same work twice.
  const deliveries = useStaffQuery(listDeliveries, "", { refreshMs: 30_000 });
  const messages = useStaffQuery(listClientMessages, "", { refreshMs: 30_000 });
  return (
    <>
      <StaffHeader role="manager" sosSummary={sos} />
      {/* Carbon's header is fixed at 48px; this block sits in normal flow below it. */}
      <div style={{ paddingTop: 48 }}>
        {showSosBanner && <SosAlertBanner summary={sos} />}
        {showNav && <ManagerTopNav
            end={clientScope ? <ClientSwitcher /> : undefined}
            counts={{
              "/manager/deliveries": deliveries.data?.filter((d) => d.delivery_status === "NEEDS_ATTENTION").length ?? 0,
            }}
          />}
        {showNav && <ManagerSubNav
            sosCount={sos?.unresolved_count ?? 0}
            reassignmentCount={declined.data?.length ?? 0}
            messageCount={messages.data?.filter((m) => m.status !== "ANSWERED").length ?? 0}
          />}
      </div>
      <StaffPage clearHeader={false} maxWidth={maxWidth}>
        {children}
      </StaffPage>
    </>
  );
}
