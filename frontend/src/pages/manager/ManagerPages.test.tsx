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
  "/manager": "Manager Intelligence Dashboard",
  "/manager/cases": "Consolidated Case Oversight",
  "/manager/sos": "SOS Inbox",
  "/manager/reassignment": "Reassignment Queue",
  "/manager/deliveries": "Deliveries",
  "/manager/reports": "Client reports",
  "/manager/validation": "Validation & Audit",
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

  describe("Validation & Audit (one screen, three separate views)", () => {
    it("shows the ground-truth check, the AI vs Auditor comparison and the audit log together, with no tabs", async () => {
      renderAt("/manager/validation");
      for (const name of ["AI vs ground truth", "AI vs Auditor", "Audit log"]) {
        expect(await screen.findByRole("heading", { level: 2, name })).toBeInTheDocument();
      }
      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
      // The comparison and the three client-required audit fields are on screen at the same moment.
      expect(
        await screen.findByRole("table", { name: /AI severity against final Auditor severity/ }),
      ).toBeInTheDocument();
      for (const field of [/Accumulated score/, /Prompt leakage/, /Source attribution/]) {
        expect(screen.getByText(field)).toBeInTheDocument();
      }
      expect(screen.getByRole("table", { name: "watsonx.ai call log" })).toBeInTheDocument();
    });

    it("names every result in words and never calls the AI or an Auditor wrong", async () => {
      renderAt("/manager/validation");
      const table = await screen.findByRole("table", { name: /AI severity against final Auditor severity/ });
      const results = within(table).getAllByText(/^AI (Override|Match)$/);
      expect(results.length).toBeGreaterThan(0);
      expect(document.body.textContent).not.toMatch(/AI wrong|Auditor wrong|poor Auditor/i);
    });

    it("filters the comparison by result and keeps Auditors unnamed", async () => {
      renderAt("/manager/validation");
      const table = await screen.findByRole("table", { name: /AI severity against final Auditor severity/ });
      expect(within(table).queryByText(/Reese|Marcus|Sam Nguyen|auditor-/)).not.toBeInTheDocument();
      // jsdom has no scrollIntoView; Carbon's dropdown calls it when the menu opens.
      const original = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = () => {};
      try {
        fireEvent.click(screen.getByRole("combobox", { name: /Result/ }));
        fireEvent.click(await screen.findByRole("option", { name: "AI Override" }));
        await waitFor(() => expect(within(table).queryByText("AI Match")).not.toBeInTheDocument());
        expect(within(table).queryAllByText("AI Override").length).toBeGreaterThan(0);
      } finally {
        Element.prototype.scrollIntoView = original;
      }
    });

    it("opens a case's audit trail from its row", async () => {
      renderAt("/manager/validation");
      const table = await screen.findByRole("table", { name: /AI severity against final Auditor severity/ });
      const [link] = within(table).getAllByRole("link", { name: /^View audit trail for / });
      expect(link.getAttribute("href")).toMatch(/^\/manager\/audit-logs\?case=/);
    });

    it("writes a failed AI call as a word as well as an accent, and shows the chart's values", async () => {
      renderAt("/manager/validation");
      const log = await screen.findByRole("table", { name: "watsonx.ai call log" });
      fireEvent.click(await screen.findByRole("button", { name: /^Show all \d+ calls$/ }));
      await waitFor(() => expect(within(log).queryAllByText("Failed").length).toBeGreaterThan(0));
      expect(within(log).getAllByText("Succeeded").length).toBeGreaterThan(0);
      // Each bar's value is printed beside it, so the chart never rests on colour or pattern.
      const validation = document.getElementById("validation")!;
      expect(within(validation).getAllByText(/^\d+(\.\d+)?%$/).length).toBeGreaterThanOrEqual(8);
    });

    it("opens the audit history already filtered to the case it was linked from", async () => {
      renderAt("/manager/audit-logs?case=AR-2026-00417");
      expect(await screen.findByDisplayValue("AR-2026-00417")).toBeInTheDocument();
    });
  });

  it("labels the validation data as a placeholder everywhere it appears (Task 96, MR-OV-08)", async () => {
    renderAt("/manager/validation");
    expect(await screen.findByText("Placeholder / mock data — not real validation results.")).toBeInTheDocument();
    expect(screen.getByText("Match rate (illustrative)")).toBeInTheDocument();
    expect(screen.getByText(/All values illustrative placeholder data\./)).toBeInTheDocument();
  });

  it("shows exposure state and cooldowns on the dashboard, with the SOS banner (MR-OV-05, MR-SOS-03)", async () => {
    renderAt("/manager");
    const table = await screen.findByRole("table", { name: "Auditor protection and availability" });
    const samRow = within(table).getByRole("link", { name: "Sam Nguyen" }).closest("tr")!;
    expect(within(samRow).getByText("At limit")).toBeInTheDocument();
    const reeseRow = within(table).getByRole("link", { name: "Reese Patel" }).closest("tr")!;
    expect(within(reeseRow).getByText("Approaching")).toBeInTheDocument();
    expect(within(reeseRow).getByText("Check-in pending")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /SOS alert — 3 SOS alerts need follow-up/ })).toBeInTheDocument();
  });

  describe("Manager Intelligence Dashboard (Sprint 3 extras §1)", () => {
    it("shows the KPI strip from stored records, with the demo badge (MR-OV-08)", async () => {
      renderAt("/manager");
      const strip = await screen.findByRole("region", { name: "Operations at a glance" });
      for (const label of ["Total cases", "Completed", "Open cases", "Needs manager action"]) {
        expect(within(strip).getByText(label)).toBeInTheDocument();
      }
      expect(screen.getByText("DEMO / PLACEHOLDER DATA")).toBeInTheDocument();
      // Open cases is the live backlog: every non-complete case, whenever it arrived.
      const open = readDb().cases.filter((c) => c.status !== "COMPLETE").length;
      await waitFor(() => expect(within(strip).getByText(String(open))).toBeInTheDocument());
    });

    it("has exactly one primary button: the most urgent action, else Generate (D4)", async () => {
      renderAt("/manager");
      const urgent = await screen.findByRole("button", { name: "Follow up 3 SOS alerts" });
      const primaries = () => document.querySelectorAll(".cds--btn--primary:not(.cds--modal-footer *)");
      expect(urgent).toHaveClass("cds--btn--primary");
      expect(primaries()).toHaveLength(1);
      expect(screen.getByRole("button", { name: "Generate Client Service Report" })).toHaveClass("cds--btn--tertiary");
    });

    it("lists only Manager decisions in Needs Attention, each linked to where it's handled", async () => {
      renderAt("/manager");
      const list = await screen.findByRole("list", { name: "Items that need you" });
      expect(within(list).getByRole("link", { name: /^Open SOS: 3/ })).toHaveAttribute("href", "/manager/sos");
      expect(within(list).getByRole("link", { name: /^Failed CommunityHub handoffs/ })).toHaveAttribute(
        "href",
        "/manager/deliveries?status=needs-attention",
      );
      expect(within(list).getByRole("link", { name: /^Reassignment decisions/ })).toHaveAttribute(
        "href",
        "/manager/reassignment",
      );
      // Break and talk requests share one row that says which replies are waiting.
      expect(
        within(list)
          .getByRole("link", { name: /^Support requests/ })
          .getAttribute("href"),
      ).toMatch(/^\/manager\/auditors\//);
    });

    it("shows who asked for support with one quiet tag, and no rankings or scores (MR-SOS-07)", async () => {
      renderAt("/manager");
      const table = await screen.findByRole("table", { name: "Auditor protection and availability" });
      const reese = within(table).getByRole("link", { name: "Reese Patel" }).closest("td")!;
      expect(within(reese).getByText("Break requested")).toBeInTheDocument();
      expect(within(reese).getByText("Wants to talk")).toBeInTheDocument();
      expect(screen.queryByText("Cases today")).not.toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/leaderboard|ranking|performance score|fastest/i);
    });

    it("opens the evidence behind a figure, with its definition and source fields (§1.4)", async () => {
      renderAt("/manager");
      const strip = await screen.findByRole("region", { name: "Operations at a glance" });
      const [totalEvidence] = await within(strip).findAllByRole("button", { name: "View evidence" });
      fireEvent.click(totalEvidence);
      expect(await screen.findByText("Reports received by RCS during the selected period.")).toBeInTheDocument();
      expect(screen.getByText("cases.created_at")).toBeInTheDocument();
      expect(screen.getByRole("table", { name: "Contributing cases" })).toBeInTheDocument();
    });

    it("the KPI jump links point at sections that exist", async () => {
      renderAt("/manager");
      const strip = await screen.findByRole("region", { name: "Operations at a glance" });
      for (const link of within(strip).getAllByRole("link")) {
        const target = link.getAttribute("href")!.slice(1);
        expect(document.getElementById(target), `#${target} has no section`).not.toBeNull();
      }
    });

    it("keeps the chosen period in the URL", async () => {
      renderAt("/manager?period=last-month");
      expect(await screen.findByRole("combobox", { name: /Period/ })).toHaveTextContent("Last month");
    });

    it("Case Oversight opens filtered to the stage chosen on the dashboard", async () => {
      renderAt("/manager/cases?stage=MANAGER_ACTION");
      expect(await screen.findByText("Stage: Manager action required")).toBeInTheDocument();
      const table = await screen.findByRole("table");
      const flagged = readDb().cases.filter((c) => c.manager_flag && c.status !== "COMPLETE").length;
      await waitFor(() => expect(within(table).getAllByRole("row")).toHaveLength(flagged + 1));
    });
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

  it("shows the Manager when an SOS alert was raised by an AI failure mid-review (AR-AI-11)", async () => {
    const { token } = await mockDataService.staffLogin("auditor-1", DEMO_PASSWORD);
    await mockDataService.reportUnexpectedExposure("AR-2026-00417", token, "AI_FAILURE_MID_REVIEW");
    const alertId = readDb().sosEvents.at(-1)!.id;
    renderAt(`/manager/sos/${alertId}`);
    const raisedBy = await screen.findByText("Raised by");
    expect(raisedBy.nextElementSibling).toHaveTextContent("AI failure mid-review");
    expect(screen.getByText("AR-2026-00417")).toBeInTheDocument();
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
    // Since a85e69f the limit is adjusted on its own view, as the dashboard's
    // "Adjust exposure limit" button opens it.
    renderAt("/manager/auditors/auditor-4?mode=exposure");
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
    expect(await screen.findByText("Exposure limit updated to 90 min.")).toBeInTheDocument();
    await waitFor(() =>
      expect(readDb().staff.find((s) => s.staff_id === "auditor-4")!.exposure_limit_minutes).toBe(90),
    );
  });

  it("approves a break request from the Auditor record (MR-SOS-07)", async () => {
    renderAt("/manager/auditors/auditor-4");
    expect(await screen.findByText("Pattern flagged — private")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Approve break" }));
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
    expect(readDb().auditLog.some((e) => e.action === "EXCEPTIONAL_ACCESS_RECORDED")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Return to reassignment decision" }));
    expect(await screen.findByRole("heading", { name: "Reassignment decision — AR-2026-00398" })).toBeInTheDocument();
  });
});
