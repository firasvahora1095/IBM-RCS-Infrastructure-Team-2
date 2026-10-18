import type { ReactNode } from "react";
import { ClientHeader } from "../shell/ClientHeader";
import { ClientTopNav } from "../shell/ClientTopNav";
import { StaffPage } from "./StaffPage";

/**
 * Shared frame for every CommunityHub portal screen, built like the Manager's: dark header with the account,
 * the section tabs under it, then the page body.
 */
export function ClientLayout({ children, maxWidth }: { children: ReactNode; maxWidth?: number }) {
  return (
    <>
      <ClientHeader />
      {/* Carbon's header is fixed at 48px; the tabs sit in normal flow below it. */}
      <div style={{ paddingTop: 48 }}>
        <ClientTopNav />
      </div>
      <StaffPage clearHeader={false} maxWidth={maxWidth}>
        {children}
      </StaffPage>
    </>
  );
}
