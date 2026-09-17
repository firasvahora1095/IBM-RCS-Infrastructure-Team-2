import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import { AppRoutes } from "../../App";
import { mockDataService } from "../../services/mock";
import { readDb, resetDb, updateDb } from "../../services/mock/store";
import { DEMO_PASSWORD } from "../../services/mock/seed";
import { MANAGER_SECTIONS } from "../../components/shell/managerSections";

/**
 * Manager screens against the real mock data source, through the real routes.
 * Covers Task 103 ("all navigation sections are reachable and render without
 * error") and Task 96 (no placeholder can be mistaken for live data).
 */

async function signInAsManager() {
  const { token } = await mockDataService.staffLogin("manager-1", DEMO_PASSWORD);
  sessionStorage.setItem("rcs_staff_token", token);
  sessionStorage.setItem("rcs_staff_role", "manager");
  sessionStorage.setItem("rcs_staff_id", "manager-1");
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

const HEADINGS: Record<string, string> = {
  "/manager": "Oversight Dashboard",
  "/manager/cases": "Consolidated Case Oversight",
  "/manager/sos": "SOS Inbox",
  "/manager/reassignment": "Declined / Reassignment Queue",
  "/manager/validation": "Validation View",
};

describe("Manager screens", () => {
  beforeEach(async () => {
    sessionStorage.clear();
    resetDb();
    await signInAsManager();
  });

  it.each(MANAGER_SECTIONS.map((s) => [s.label, s.path]))(
    "%s is reachable, renders without error and is labelled as demo data (Tasks 103, 96)",
    async (_label, path) => {
      renderAt(path);
      expect(await screen.findByRole("heading", { level: 1, name: HEADINGS[path] })).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByText(/^Couldn.t load/)).not.toBeInTheDocument());
      // Task 96: every screen of demo data carries the badge.
      expect(screen.getByText("Demo data")).toBeInTheDocument();
    },
  );

  it("labels the validation data as a placeholder everywhere it appears (Task 96, MR-OV-08)", async () => {
    renderAt("/manager/validation");
    expect(await screen.findByText("Placeholder / mock data — not real validation results.")).toBeInTheDocument();
    expect(screen.getByText("Match rate (illustrative)")).toBeInTheDocument();
    expect(screen.getByText(/All values illustrative placeholder data\./)).toBeInTheDocument();
  });

  it("shows exposure state and cooldowns on the dashboard, with the SOS banner (MR-OV-05, MR-SOS-03)", async () => {
    renderAt("/manager");
    const table = await screen.findByRole("table", { name: "Auditors under your oversight" });
    const samRow = within(table).getByRole("link", { name: "Sam Nguyen" }).closest("tr")!;
    expect(within(samRow).getByText("At limit")).toBeInTheDocument();
    const reeseRow = within(table).getByRole("link", { name: "Reese Patel" }).closest("tr")!;
    expect(within(reeseRow).getByText("Approaching")).toBeInTheDocument();
    expect(within(reeseRow).getByText("Check-in pending")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /SOS alert — 3 SOS alerts need follow-up/ })).toBeInTheDocument();
  });

  it("acknowledges an SOS and logs the follow-up, which completes the Auditor check-in (MR-SOS-04/06)", async () => {
    renderAt("/manager/sos");
    fireEvent.click(await screen.findByRole("button", { name: /Acknowledge Marcus Webb.s SOS alert/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Acknowledge" }));

    expect(await screen.findByRole("heading", { name: "Log follow-up — Marcus Webb" })).toBeInTheDocument();
    const log = await screen.findByRole("button", { name: "Log outcome" });
    expect(log).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Follow-up notes"), {
      target: { value: "Called Marcus; okay to continue." },
    });
    fireEvent.click(screen.getByLabelText("Followed up — no further action"));
    fireEvent.click(log);

    expect(await screen.findByText(/This SOS alert is now resolved\./)).toBeInTheDocument();
    const marcus = readDb().staff.find((s) => s.staff_id === "auditor-5")!;
    expect(marcus.cooldown?.check_in_completed_at).toBeTruthy();
  });

  it("closes a declined case without reassignment, requiring a note, with the content-neutral outcome", async () => {
    renderAt("/manager/reassignment");
    fireEvent.click(await screen.findByRole("link", { name: "AR-2026-00398" }));
    expect(await screen.findByText("Near my exposure limit")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue to reassignment decision" }));

    const confirmNone = await screen.findByRole("button", { name: "Confirm no reassignment" });
    expect(confirmNone).toBeDisabled();
    fireEvent.change(screen.getByLabelText("No reassignment needed"), {
      target: { value: "Severity matches the content; no further context needed." },
    });
    fireEvent.click(confirmNone);

    expect(
      await screen.findByRole("heading", { name: "No reassignment confirmed — AR-2026-00398" }),
    ).toBeInTheDocument();
    const status = await mockDataService.getStatus("AR-2026-00398");
    expect(status).toMatchObject({ status: "Complete", final_outcome: "CLOSED_NO_REASSIGNMENT" });
  });

  it("reports an unavailable reassignment target instead of silently reassigning (Figma 197:321)", async () => {
    updateDb((db) => {
      db.demo.nextReassignTargetUnavailable = true;
    });
    renderAt("/manager/cases/AR-2026-00398/reassign");
    fireEvent.click(await screen.findByRole("combobox", { name: /Reassign to another Auditor/ }));
    fireEvent.click(await screen.findByText(/Jordan Lee — \d+ min headroom/));
    fireEvent.click(screen.getByRole("button", { name: "Confirm reassignment" }));

    expect(await screen.findByText("This Auditor is no longer available — please choose another.")).toBeInTheDocument();
    expect(readDb().cases.find((c) => c.case_id === "AR-2026-00398")!.assigned_auditor).toBeNull();
  });

  it("saves an exposure limit, and keeps the entered value with a retry when saving fails (MR-OV-04)", async () => {
    renderAt("/manager/auditors/auditor-4");
    const input = await screen.findByLabelText("Daily limit (minutes)");
    updateDb((db) => {
      db.demo.failNextSubmission = true;
    });
    fireEvent.change(input, { target: { value: "90" } });
    fireEvent.click(screen.getByRole("button", { name: "Save limit" }));

    expect(
      await screen.findByText("Couldn't save the new limit. Your entered value is unchanged — try again."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Daily limit (minutes)")).toHaveValue(90);

    fireEvent.click(screen.getByRole("button", { name: "Save limit (retry)" }));
    expect(await screen.findByText("Exposure limit saved:")).toBeInTheDocument();
    await waitFor(() =>
      expect(readDb().staff.find((s) => s.staff_id === "auditor-4")!.exposure_limit_minutes).toBe(90),
    );
  });

  it("approves a break request from the Auditor record (MR-SOS-07)", async () => {
    renderAt("/manager/auditors/auditor-4");
    expect(await screen.findByText("Pattern flagged — private")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
    expect(await screen.findByText("Break approved")).toBeInTheDocument();
  });

  it("gates exceptional raw-content access behind the content warning, and logs it (MR-CR-08)", async () => {
    renderAt("/manager/cases/AR-2026-00398/raw?from=%2Fmanager%2Fcases%2FAR-2026-00398%2Freassign");
    fireEvent.click(await screen.findByLabelText(/I understand this content may be disturbing/));
    fireEvent.click(screen.getByRole("button", { name: "Proceed" }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue to review" }));

    // No SOS or exposure counter in a Manager exceptional session.
    expect(await screen.findByRole("slider", { name: "Blur intensity" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^SOS/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/active review/)).not.toBeInTheDocument();
    expect(readDb().auditLog.some((e) => e.action === "EXCEPTIONAL_RAW_ACCESS")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Return to reassignment decision" }));
    expect(await screen.findByRole("heading", { name: "Reassignment decision — AR-2026-00398" })).toBeInTheDocument();
  });
});
