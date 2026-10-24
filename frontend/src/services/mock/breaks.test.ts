import { describe, it, expect, beforeEach } from "vitest";
import { mockDataService as mock } from "./index";
import { readDb, resetDb, updateDb } from "./store";
import { DEMO_PASSWORD } from "./seed";
import { BREAK_MINUTES } from "../../design-tokens/breakRules";

async function token(id: string) {
  return (await mock.staffLogin(id, DEMO_PASSWORD)).token;
}

/** auditor-1 asks for a break and the Manager approves it, so the break starts now. */
async function breakStartsNow() {
  const auditor = await token("auditor-1");
  const manager = await token("manager-1");
  await mock.requestWellbeingSupport(auditor, "BREAK_REQUEST", undefined, "A long morning.");
  const request = readDb().wellbeingRequests.find((r) => r.auditor_id === "auditor-1" && r.status === "OPEN" && r.kind === "BREAK_REQUEST")!;
  await mock.approveBreakRequest(request.id, manager);
  return { auditor, manager, id: request.id };
}

describe("an approved break lasts a fixed time and ends by itself", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetDb();
  });

  it("is BREAK_MINUTES long, counted from the Manager's approval", async () => {
    expect(BREAK_MINUTES).toBe(15);
    const { auditor } = await breakStartsNow();
    const wellbeing = await mock.getMyWellbeing(auditor);
    const minutes = (Date.parse(wellbeing.break_ends_at!) - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(14.5);
    expect(minutes).toBeLessThanOrEqual(15);
  });

  it("shows the Manager who is on a break and until when, then shows them available again once it is over", async () => {
    const { manager, id } = await breakStartsNow();
    let row = (await mock.getAuditorOverview(manager)).find((r) => r.auditor_id === "auditor-1")!;
    expect(row.open_requests?.on_break).toBe(true);
    expect(row.open_requests?.break_ends_at).toBeTruthy();

    // The break was approved long enough ago that it has run its course.
    updateDb((db) => {
      db.wellbeingRequests.find((r) => r.id === id)!.resolved_at = new Date(Date.now() - (BREAK_MINUTES + 1) * 60_000).toISOString();
    });
    row = (await mock.getAuditorOverview(manager)).find((r) => r.auditor_id === "auditor-1")!;
    expect(row.open_requests?.on_break).toBe(false);
    expect(row.open_requests?.break_ends_at).toBeNull();
  });

  it("is not a day-long state: a break approved this morning is over", async () => {
    // The demo's seeded break for auditor-2 was approved well over an hour ago.
    const manager = await token("manager-1");
    const row = (await mock.getAuditorOverview(manager)).find((r) => r.auditor_id === "auditor-2")!;
    expect(row.open_requests?.on_break).toBe(false);
  });

  it("gives them no new cases while it runs, and a case they already hold stays with them", async () => {
    const { auditor, manager } = await breakStartsNow();
    const held = readDb().cases.filter((c) => c.assigned_auditor === "auditor-1").length;
    // The Manager can't hand a declined case to someone on a break.
    const declined = readDb().cases.find((c) => c.manager_flag === "DECLINED")!;
    await expect(mock.reassignCase(declined.case_id, manager, "auditor-1")).rejects.toMatchObject({ status: 409 });
    const context = await mock.getReassignmentContext(declined.case_id, manager);
    expect(context.candidates.find((c) => c.auditor_id === "auditor-1")?.available).toBe(false);
    expect(readDb().cases.filter((c) => c.assigned_auditor === "auditor-1").length).toBe(held);
    expect(auditor).toBeTruthy();
  });
});
