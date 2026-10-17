import { cleanup, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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
  "/manager": "Overview",
  "/manager/cases": "Cases",
  "/manager/sos": "SOS Inbox",
  "/manager/reassignment": "Reassignment Queue",
  "/manager/deliveries": "Deliveries",
  "/manager/reports": "Client reports",
  "/manager/insights": "Insights",
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
    it("has one tab per view and shows only the chosen one, landing on AI vs Auditor", async () => {
      renderAt("/manager/validation");
      const tabs = await screen.findByRole("tablist", { name: "Validation and audit views" });
      const names = within(tabs).getAllByRole("tab").map((t) => t.textContent);
      expect(names).toEqual(["Auditor overrides", "AI accuracy test", "AI call log"]);
      expect(within(tabs).getByRole("tab", { name: "Auditor overrides" })).toHaveAttribute("aria-selected", "true");
      expect(
        await screen.findByRole("table", { name: /AI severity against final Auditor severity/ }),
      ).toBeVisible();
      // The other views are not on screen until chosen.
      expect(screen.queryByRole("table", { name: "watsonx.ai call log" })).not.toBeInTheDocument();
      fireEvent.click(within(tabs).getByRole("tab", { name: "AI call log" }));
      const log = await screen.findByRole("table", { name: "watsonx.ai call log" });
      // The three client-required audit fields are in each call's details, opened from its row.
      fireEvent.click(within(log).getAllByRole("button", { name: /^Show details for the call/ })[0]);
      for (const field of [/Accumulated score/, /Prompt leakage/, /Source attribution/]) {
        expect(await within(log).findAllByText(field)).not.toHaveLength(0);
      }
      expect(within(log).getByRole("button", { name: "Open case history" })).toBeInTheDocument();
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

    it("labels old demo calls without inventing real outcomes, and shows the chart's values", async () => {
      renderAt("/manager/validation?view=audit-log");
      const log = await screen.findByRole("table", { name: "watsonx.ai call log" });
      await waitFor(() => expect(within(log).queryAllByText("Legacy demo").length).toBeGreaterThan(0));
      fireEvent.click(within(log).getAllByRole("button", { name: /^Show details for the call/ })[0]);
      expect((await within(log).findAllByText("Not recorded")).length).toBeGreaterThan(0);
      // Long lists page like Deliveries, rather than a button that shows everything.
      expect((await screen.findAllByText(/items per page/i)).length).toBeGreaterThan(0);
      // Each bar's value is printed beside it, so the chart never rests on colour or pattern.
      cleanup();
      renderAt("/manager/validation?view=ai-vs-ground-truth");
      const validation = await waitFor(() => document.getElementById("validation")!);
      await within(validation).findAllByText(/^\d+(\.\d+)?%$/);
      expect(within(validation).getAllByText(/^\d+(\.\d+)?%$/).length).toBeGreaterThanOrEqual(8);
    });

    it("opens the audit history already filtered to the case it was linked from", async () => {
      renderAt("/manager/audit-logs?case=AR-2026-00417");
      expect(await screen.findByDisplayValue("AR-2026-00417")).toBeInTheDocument();
    });
  });

  it("labels the validation data as a placeholder everywhere it appears (Task 96, MR-OV-08)", async () => {
    renderAt("/manager/validation?view=ai-vs-ground-truth");
    expect(await screen.findByText("Placeholder / mock data — not real validation results.")).toBeInTheDocument();
    expect(screen.getByText("Match rate (illustrative)")).toBeInTheDocument();
    expect(screen.getByText(/All values illustrative placeholder data\./)).toBeInTheDocument();
  });

  it("shows exposure state and cooldowns on the dashboard, with the SOS banner (MR-OV-05, MR-SOS-03)", async () => {
    renderAt("/manager");
    const table = await screen.findByRole("table", { name: "Auditor protection and availability" });
    const samRow = within(table).getByRole("link", { name: "Sam Nguyen" }).closest("tr")!;
    expect(within(samRow).getByText("Limit reached")).toBeInTheDocument();
    const reeseRow = within(table).getByRole("link", { name: "Reese Patel" }).closest("tr")!;
    expect(within(reeseRow).getByText("Near limit")).toBeInTheDocument();
    expect(within(reeseRow).getByText("Check-in pending")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /SOS alert — 3 SOS alerts need follow-up/ })).toBeInTheDocument();
  });

  describe("Manager Intelligence Dashboard (Sprint 3 extras §1)", () => {
    it("shows three quiet figures from stored records, with the demo badge (MR-OV-08)", async () => {
      renderAt("/manager");
      const strip = await screen.findByRole("region", { name: "Figures for the period" });
      for (const label of ["Open cases", "Completed", "Delivery success"]) {
        expect(within(strip).getByText(label)).toBeInTheDocument();
      }
      // Quiet: figures carry no links or buttons of their own.
      expect(within(strip).queryAllByRole("link")).toHaveLength(0);
      expect(within(strip).queryAllByRole("button")).toHaveLength(0);
      // The header badge labels demo data; the page does not repeat it.
      expect(screen.getByText("Demo data")).toBeInTheDocument();
      expect(screen.queryByText("DEMO / PLACEHOLDER DATA")).not.toBeInTheDocument();
      // Open cases is the live backlog: every non-complete case, whenever it arrived.
      const open = readDb().cases.filter((c) => c.status !== "COMPLETE").length;
      await waitFor(() => expect(within(strip).getByText(String(open))).toBeInTheDocument());
    });

    it("has exactly one primary button, Generate Report, and no inbox row is primary (D4)", async () => {
      renderAt("/manager");
      const list = await screen.findByRole("list", { name: "Items that need you" });
      expect(list).toBeInTheDocument();
      const primaries = () => document.querySelectorAll(".cds--btn--primary:not(.cds--modal-footer *)");
      expect(screen.getByRole("button", { name: "Generate Report" })).toHaveClass("cds--btn--primary");
      expect(primaries()).toHaveLength(1);
      expect(screen.queryByRole("button", { name: /Follow up \d+ SOS/ })).not.toBeInTheDocument();
    });

    it("keeps Generate Report as the one primary action when nothing needs the Manager", async () => {
      updateDb((db) => {
        const now = new Date().toISOString();
        for (const sos of db.sosEvents) sos.resolved_at = sos.resolved_at ?? now;
        for (const w of db.wellbeingRequests) w.status = w.kind === "BREAK_REQUEST" ? "APPROVED" : "FOLLOWED_UP";
        for (const c of db.cases) {
          if (c.manager_flag) c.manager_flag = null;
        }
        for (const d of db.deliveries) if (d.delivery_status === "NEEDS_ATTENTION") d.delivery_status = "SUCCESS";
        for (const m of db.clientMessages) m.status = "ANSWERED";
      });
      renderAt("/manager");
      expect(await screen.findByText("Nothing needs your attention")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Generate Report" })).toHaveClass("cds--btn--primary");
      expect(document.querySelectorAll(".cds--btn--primary:not(.cds--modal-footer *)")).toHaveLength(1);
    });

    it("lists Manager decisions as an inbox, each row naming what it is and where to go (BA 11.1)", async () => {
      updateDb((db) => {
        db.deliveries[0].delivery_status = "NEEDS_ATTENTION";
      });
      renderAt("/manager");
      const list = await screen.findByRole("list", { name: "Items that need you" });
      // SOS opens its context first: acknowledging is a deliberate step.
      // One row for all open SOS alerts, not one identical row each; it opens the SOS Inbox.
      expect(within(list).getAllByText("SOS Alert")).toHaveLength(1);
      expect(within(list).getByRole("button", { name: /^Open SOS Inbox \(3\)/ })).toBeInTheDocument();
      expect(within(list).getAllByText("Break Request").length).toBeGreaterThan(0);
      expect(within(list).getAllByText("Talk Request").length).toBeGreaterThan(0);
      expect(within(list).getAllByText("Reassignment").length).toBeGreaterThan(0);
      expect(within(list).getAllByText("Delivery Failed").length).toBeGreaterThan(0);
    });

    it("approves a break request in the row, with no page change (one click)", async () => {
      renderAt("/manager");
      const approve = await screen.findByRole("button", { name: /^Approve, break request from Reese Patel/ });
      fireEvent.click(approve);
      await waitFor(() => expect(screen.queryByRole("button", { name: /^Approve, break request from Reese/ })).toBeNull());
      expect(await screen.findByText("Approved the break request from Reese Patel.", { selector: "p[role=status]" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
      expect(
        readDb().wellbeingRequests.filter((w) => w.kind === "BREAK_REQUEST" && w.status === "APPROVED").length,
      ).toBeGreaterThan(0);
    });

    it("opens a talk request instead of dismissing it, so it is read before it is marked followed up", async () => {
      renderAt("/manager");
      const row = (await screen.findByText("Talk Request")).closest("li")!;
      expect(within(row).queryByRole("button", { name: /^Follow/ })).not.toBeInTheDocument();
      fireEvent.click(within(row).getByRole("button", { name: "View request" }));
      expect(await screen.findByRole("heading", { level: 1, name: "Reese Patel" })).toBeInTheDocument();
      const done = () => readDb().wellbeingRequests.filter((w) => w.kind === "TALK_TO_MANAGER" && w.status === "FOLLOWED_UP").length;
      const before = done();
      fireEvent.click(await screen.findByRole("button", { name: "Mark as followed up" }));
      await waitFor(() => expect(done()).toBe(before + 1));
    });

    it("never reassigns from the list: Review opens the decision with the suggested Auditor selected", async () => {
      renderAt("/manager");
      const row = (await screen.findByText("AR-2026-00398")).closest("li")!;
      expect(within(row).getByText(/Suggested: /)).toBeInTheDocument();
      expect(within(row).queryByRole("button", { name: /^Reassign/ })).not.toBeInTheDocument();
      fireEvent.click(within(row).getByRole("button", { name: "Review" }));
      expect(await screen.findByRole("heading", { level: 1, name: "Reassignment decision — AR-2026-00398" })).toBeInTheDocument();
      // Nothing moved until the Manager confirms on that page.
      expect(readDb().cases.find((c) => c.case_id === "AR-2026-00398")!.assigned_auditor).toBeNull();
    });

    it("keeps the SOS Inbox, Reassignment Queue and Client messages one click away, in a row under Overview", async () => {
      renderAt("/manager");
      const links = await screen.findByRole("navigation", { name: "Work queues" });
      expect(within(links).getByRole("link", { name: /^SOS Inbox/ })).toHaveAttribute("href", "/manager/sos");
      expect(within(links).getByRole("link", { name: "Reassignment Queue" })).toHaveAttribute("href", "/manager/reassignment");
      expect(within(links).getByRole("link", { name: "Client messages" })).toHaveAttribute("href", "/manager/messages");
    });

    it("retries a failed delivery in the row and clears it once CommunityHub accepts it", async () => {
      updateDb((db) => {
        db.organisation.status = "READY";
      });
      renderAt("/manager");
      const [retry] = await screen.findAllByRole("button", { name: /^Retry, delivery for case/ });
      const name = retry.getAttribute("aria-label")!;
      const caseId = name.replace("Retry, delivery for case ", "");
      fireEvent.click(retry);
      await waitFor(() => expect(screen.queryByRole("button", { name })).not.toBeInTheDocument());
      expect(readDb().deliveries.find((d) => d.case_id === caseId)!.delivery_status).toBe("SUCCESS");
    });

    it("keeps a failed delivery in the inbox, and says so, when the retry fails again", async () => {
      updateDb((db) => {
        db.organisation.status = "ERROR";
      });
      renderAt("/manager");
      const retry = await screen.findAllByRole("button", { name: /^Retry, delivery for case/ });
      fireEvent.click(retry[0]);
      expect(await screen.findByText(/Still failing/)).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /^Retry, delivery for case/ })).toHaveLength(retry.length);
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

    it("opens the evidence behind a section, with its definition and source fields (§1.4)", async () => {
      renderAt("/manager/insights");
      const strip = await screen.findByRole("region", { name: "Figures for the period" });
      const [totalEvidence] = await within(strip).findAllByRole("button", { name: "Evidence" });
      fireEvent.click(totalEvidence);
      expect(await screen.findByText("Reports received by RCS during the selected period.")).toBeInTheDocument();
      expect(screen.getByText("cases.created_at")).toBeInTheDocument();
      expect(screen.getByRole("table", { name: "Contributing cases" })).toBeInTheDocument();
    });

    it("Insights holds the analytics that left the Overview", async () => {
      renderAt("/manager/insights");
      for (const title of ["Case flow", "Client outcomes", "Auditor overrides", "Delivery Health"]) {
        expect(await screen.findByRole("heading", { level: 2, name: title })).toBeInTheDocument();
      }
      // Validation is a tab of its own, and Insights points to it from the accuracy note.
      for (const link of screen.getAllByRole("link", { name: "Validation" })) {
        expect(link).toHaveAttribute("href", "/manager/validation");
      }
    });

    it("the Overview no longer repeats the analytics or the evidence link six times", async () => {
      renderAt("/manager");
      await screen.findByRole("list", { name: "Items that need you" });
      for (const title of ["Case flow", "Client outcomes", "Delivery Health"]) {
        expect(screen.queryByRole("heading", { name: title })).not.toBeInTheDocument();
      }
      expect(screen.queryByRole("button", { name: "View evidence" })).not.toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "Evidence" })).toHaveLength(2);
    });

    it("keeps the chosen period in the URL", async () => {
      renderAt("/manager?period=last-month");
      expect(await screen.findByRole("combobox", { name: /Period/ })).toHaveTextContent("Last month");
    });

    it("Case Oversight opens filtered to the stage chosen on the dashboard", async () => {
      renderAt("/manager/cases?stage=MANAGER_ACTION");
      expect(await screen.findByText("Stage: Needs Reassignment or Blocked")).toBeInTheDocument();
      const table = await screen.findByRole("table", { name: "Cases that need you" });
      const flagged = readDb().cases.filter((c) => c.manager_flag && c.status !== "COMPLETE").length;
      await waitFor(() => expect(within(table).getAllByRole("row")).toHaveLength(flagged + 1));
    });

    it("puts what needs the Manager first, most severe first, and leaves the rest below", async () => {
      renderAt("/manager/cases");
      const needs = await screen.findByRole("table", { name: "Cases that need you" });
      const all = screen.getByRole("table", { name: "All cases" });
      // Blocked (an open SOS) comes before Needs Reassignment.
      const tags = within(needs).getAllByText(/^(Blocked|Needs Reassignment|Held back)$/).map((n) => n.textContent);
      const firstReassign = tags.indexOf("Needs Reassignment");
      if (firstReassign > -1) expect(tags.slice(firstReassign)).not.toContain("Blocked");
      // Nothing that needs the Manager is repeated in the long list.
      expect(within(all).queryByText("Blocked")).not.toBeInTheDocument();
      expect(within(all).queryByText("Needs Reassignment")).not.toBeInTheDocument();
    });

    it("offers Release to Auditors only for a case held back from them", async () => {
      updateDb((db) => {
        const c = db.cases.find((x) => x.status !== "COMPLETE" && !x.manager_flag && x.assigned_auditor === null);
        if (c) c.case_visibility = "SUPER_ADMIN_ONLY";
      });
      renderAt("/manager/cases");
      await screen.findByRole("table", { name: "All cases" });
      const held = readDb().cases.filter((c) => c.case_visibility === "SUPER_ADMIN_ONLY" && c.assigned_auditor === null && c.status !== "COMPLETE" && !c.manager_flag);
      await waitFor(() => expect(screen.queryAllByRole("button", { name: /^Release to Auditors, case / })).toHaveLength(held.length));
    });
  });

  it("acknowledges an SOS and logs the follow-up, which completes the Auditor check-in (MR-SOS-04/06)", async () => {
    renderAt("/manager/sos");
    fireEvent.click(await screen.findByRole("button", { name: /Review Marcus Webb.s SOS alert/ }));
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

    fireEvent.click(await screen.findByRole("button", { name: "No reassignment needed" }));
    const confirmNone = await screen.findByRole("button", { name: "Confirm no reassignment" });
    expect(confirmNone).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Note for the audit trail/), {
      target: { value: "Severity matches the content; no further context needed." },
    });
    fireEvent.click(confirmNone);

    // The Manager is taken straight back to the Overview, where the confirmation shows.
    expect(await screen.findByText("Closed AR-2026-00398 with no reassignment.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
    const status = await mockDataService.getStatus("AR-2026-00398");
    expect(status).toMatchObject({ status: "Complete", final_outcome: "CLOSED_NO_REASSIGNMENT" });
  });

  it("reports an unavailable reassignment target instead of silently reassigning (Figma 197:321)", async () => {
    updateDb((db) => {
      db.demo.nextReassignTargetUnavailable = true;
    });
    renderAt("/manager/cases/AR-2026-00398/reassign");
    fireEvent.click(await screen.findByLabelText(/Jordan Lee/));
    fireEvent.click(screen.getByRole("button", { name: "Reassign to Jordan Lee" }));

    expect(await screen.findByText("This Auditor is no longer available — please choose another.")).toBeInTheDocument();
    expect(readDb().cases.find((c) => c.case_id === "AR-2026-00398")!.assigned_auditor).toBeNull();
  });

  it("preselects the suggested Auditor so reassigning is one click, then returns to the Overview", async () => {
    renderAt("/manager/cases/AR-2026-00398/reassign");
    const confirm = await screen.findByRole("button", { name: /^Reassign to / });
    const suggestedName = confirm.textContent!.replace("Reassign to ", "");
    expect(screen.getByLabelText(new RegExp(`${suggestedName}.*Suggested`))).toBeChecked();
    // One list, not a list plus a dropdown.
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.click(confirm);
    expect(await screen.findByText(new RegExp(`Reassigned AR-2026-00398 to ${suggestedName}\\.`))).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
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
    expect(await screen.findByText("Pattern flagged")).toBeInTheDocument();
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
