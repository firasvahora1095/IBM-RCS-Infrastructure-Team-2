import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { canSee, CLIENT_SECTIONS, useClientAuth } from "../../hooks/useClientAuth";
import { ClientHeader } from "./ClientHeader";
import { StaffPage } from "../layout/StaffPage";
import { PageHeader } from "../ui/PageHeader";
import { EmptyState } from "../ui/Blocks";

/**
 * Guards the CommunityHub client pages. A staff session doesn't count: the
 * client surface checks its own session only (deny by default). `section`
 * also checks the account's role, so a Reports user can't open case results
 * and a Trust & Safety user can't open reports. The API refuses too; this
 * just says so plainly.
 */
export function ClientRoute({
  children,
  section,
}: {
  children: ReactNode;
  section?: keyof typeof CLIENT_SECTIONS;
}) {
  const { isLoggedIn, session } = useClientAuth();
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/client/login" replace state={{ from: location.pathname }} />;
  }
  if (section && !canSee(session?.role, section)) {
    return (
      <>
        <ClientHeader />
        <StaffPage maxWidth={880}>
          <PageHeader title={section === "cases" ? "Case results" : "Service reports"} />
          <EmptyState
            title={`Your account doesn't include ${section === "cases" ? "case results" : "service reports"}.`}
            body="Each CommunityHub account only sees what its role needs. Ask your CommunityHub admin if you need access."
          />
        </StaffPage>
      </>
    );
  }
  return <>{children}</>;
}
