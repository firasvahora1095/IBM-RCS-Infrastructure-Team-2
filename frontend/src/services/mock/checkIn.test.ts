import { describe, it, expect, beforeEach } from "vitest";
import { mockDataService as mock } from "./index";
import { readDb, resetDb } from "./store";
import { DEMO_PASSWORD } from "./seed";

async function managerToken() {
  return (await mock.staffLogin("manager-1", DEMO_PASSWORD)).token;
}

/** Auditor-1 rates the demo case 90, so the worse of the AI's S3 and their own S4 applies: an S4 cooldown. */
async function finishAnS4Case() {
  const { token } = await mock.staffLogin("auditor-1", DEMO_PASSWORD);
  await mock.resolveCase("AR-2026-00417", token, "POLICY_VIOLATION_FOUND", 90, "A weapon appears earlier than the AI marked.");
}

const checkIns = async (manager: string) =>
  (
    await mock.getManagerIntelligence(manager, {
      organisationId: "ALL",
      periodStart: "2026-08-01",
      periodEnd: "2026-10-31",
    })
  ).attention.find((a) => a.kind === "CHECK_IN")?.count;

describe("Manager check-in after an S4 case (AR-WB-12)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetDb();
  });

  it("holds the Reviewer in cooldown, tells the Manager, and releases them once it is logged", async () => {
    const manager = await managerToken();
    expect(await checkIns(manager)).toBe(0);

    await finishAnS4Case();
    const auditor = readDb().staff.find((s) => s.staff_id === "auditor-1")!;
    expect(auditor.cooldown).toMatchObject({ trigger: "S4", requires_check_in: true, check_in_completed_at: null });
    expect(await checkIns(manager)).toBe(1);
    const row = (await mock.getAuditorOverview(manager)).find((r) => r.auditor_id === "auditor-1")!;
    expect(row.cooldown?.requires_check_in).toBe(true);

    // Even after the 30-minute timer, the Reviewer stays held until the Manager checks in.
    await mock.logCheckIn("auditor-1", manager, "  Spoke on a call. Doing okay.  ");
    const after = readDb().staff.find((s) => s.staff_id === "auditor-1")!;
    expect(after.cooldown?.check_in_completed_at).toBeTruthy();
    expect(await checkIns(manager)).toBe(0);
    // The audit trail hangs off the S4 case, with the note trimmed.
    expect(readDb().auditLog.find((e) => e.action === "CHECK_IN_LOGGED")).toMatchObject({
      case_id: "AR-2026-00417",
      detail: "Spoke on a call. Doing okay.",
    });
  });

  it("needs a note, and something waiting to check in on", async () => {
    const manager = await managerToken();
    await expect(mock.logCheckIn("auditor-1", manager, "Hi")).rejects.toMatchObject({ status: 409 });

    await finishAnS4Case();
    await expect(mock.logCheckIn("auditor-1", manager, "   ")).rejects.toMatchObject({ status: 422 });
    await mock.logCheckIn("auditor-1", manager, "Done");
    // Logged once: a second one is refused rather than overwriting the first.
    await expect(mock.logCheckIn("auditor-1", manager, "Again")).rejects.toMatchObject({ status: 409 });
  });

  it("is for Managers, and an SOS is checked in through its follow-up instead", async () => {
    const { token: auditor } = await mock.staffLogin("auditor-1", DEMO_PASSWORD);
    await expect(mock.logCheckIn("auditor-1", auditor, "x")).rejects.toMatchObject({ status: 403 });

    const manager = await managerToken();
    // Marcus Webb has an open SOS in the demo data.
    await expect(mock.logCheckIn("auditor-5", manager, "x")).rejects.toThrow(/SOS follow-up/);
    // An SOS is not counted as an S4 check-in owed.
    expect(await checkIns(manager)).toBe(0);
  });
});
