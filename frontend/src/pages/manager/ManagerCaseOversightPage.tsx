import { InlineNotification } from "@carbon/react";
import { StaffHeader } from "../../components/shell/StaffHeader";
import { ManagerTopNav } from "../../components/shell/ManagerTopNav";
import { StaffPage } from "../../components/layout/StaffPage";
import { ScaffoldLabel } from "../../components/notifications/ScaffoldLabel";

/**
 * Consolidated Case Oversight — Sprint 2 scaffold (Figma node 86:198).
 *
 * The backend has no Manager-facing case-list endpoint yet (only
 * GET /api/manager/dashboard, which returns aggregate counts), so there is
 * nothing real to put in the Figma table. Rather than build against a guessed
 * future response shape, this page is a clearly labelled structural
 * placeholder, matching the "static/placeholder shell" scope in
 * docs/ux/sprint2-build-scope-handoff.md. Open dependency for the PR.
 */
export function ManagerCaseOversightPage() {
  return (
    <>
      <StaffHeader role="manager" />
      <ManagerTopNav />
      <StaffPage clearHeader={false}>
        <div className="flex flex-col items-start gap-3">
          <h1 style={{ fontSize: 32, lineHeight: "40px", fontWeight: 600 }}>Consolidated Case Oversight</h1>
          <ScaffoldLabel>Scaffold — no case-list API exists yet</ScaffoldLabel>
        </div>
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="This view is a structural placeholder for Sprint 2."
          subtitle="A case-level Manager view needs a new backend endpoint before it can show real cases."
          style={{ maxWidth: 640 }}
        />
      </StaffPage>
    </>
  );
}
