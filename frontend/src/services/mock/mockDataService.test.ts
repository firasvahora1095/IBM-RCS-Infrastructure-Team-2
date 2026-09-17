import { describe, it, expect, beforeEach } from "vitest";
import { mockDataService as mock } from "./index";
import { readDb, resetDb, updateDb } from "./store";
import { DEMO_PASSWORD } from "./seed";
import { ApiError } from "../types";

const video = (name = "clip.mp4") => new File(["synthetic bytes"], name, { type: "video/mp4" });

async function loginAs(staffId: string) {
  return (await mock.staffLogin(staffId, DEMO_PASSWORD)).token;
}

describe("mock data source", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetDb();
  });

  it("creates a case in the RCS-XXXX-XXXX format and assigns it automatically (AR-AS-03)", async () => {
    const result = await mock.createReport(video());
    expect(result.case_id).toMatch(/^RCS-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(result.status).toBe("Being Reviewed");
    expect(result.assigned_auditor).not.toBeNull();
  });

  it("assigns to the lowest weighted score (AR-AS-02) and skips auditors at their exposure limit", async () => {
    // Clear the seeded Manager-demo cooldowns so only the weighting decides:
    // auditor-1 62 min / 3 cases (0.49), auditor-2 68 min / 2 cases (0.42),
    // auditor-3 120 min = at limit (excluded).
    updateDb((db) => db.staff.forEach((st) => (st.cooldown = null)));
    const result = await mock.createReport(video());
    expect(result.assigned_auditor).toBe("auditor-2");
    expect(readDb().cases.some((c) => c.assigned_auditor === "auditor-3" && c.case_id === result.case_id)).toBe(false);
  });

  it("never assigns to an Auditor in a cooldown (AR-WB-04)", async () => {
    // Seed: auditor-2 is in an S3 cooldown, auditors 3–5 in SOS cooldowns, so only auditor-1 is eligible.
    const result = await mock.createReport(video());
    expect(result.assigned_auditor).toBe("auditor-1");
  });

  it("rejects unsupported formats like the backend does (UR-VU-06)", async () => {
    await expect(mock.createReport(video("clip.exe"))).rejects.toMatchObject({ status: 400 });
  });

  it("only ever returns public status labels (UR-ST-02)", async () => {
    const status = await mock.getStatus("RCS-7Q3M-K91X");
    expect(status.status).toBe("Being Reviewed");
    expect(status.final_outcome).toBeNull();
  });

  it("locks status lookups after 5 invalid IDs (UR-ST-07)", async () => {
    for (let i = 0; i < 5; i++) {
      await expect(mock.getStatus(`NOPE-${i}`)).rejects.toMatchObject({ status: 404 });
    }
    await expect(mock.getStatus("RCS-7Q3M-K91X")).rejects.toMatchObject({ status: 429 });
  });

  it("requires a valid session and only shows an Auditor their own cases (AR-AS-01)", async () => {
    await expect(mock.getAuditorCases("not-a-token")).rejects.toMatchObject({ status: 401 });

    const token = await loginAs("auditor-1");
    const cases = await mock.getAuditorCases(token);
    expect(cases.length).toBeGreaterThan(0);
    expect(cases.map((c) => c.case_id)).not.toContain("RCS-7Q3M-K91X"); // auditor-2's case
    await expect(mock.getAuditorCaseDetail("RCS-7Q3M-K91X", token)).rejects.toMatchObject({ status: 404 });
  });

  it("rejects a staff login with the wrong password", async () => {
    await expect(mock.staffLogin("auditor-1", "wrong")).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects an override without a comment, and completes a case with one (AR-AI-07, MR-CR-06)", async () => {
    const token = await loginAs("auditor-1");
    await expect(mock.resolveCase("AR-2026-00417", token, "POLICY_VIOLATION_FOUND", 88)).rejects.toMatchObject({
      status: 400,
    });

    const resolved = await mock.resolveCase("AR-2026-00417", token, "POLICY_VIOLATION_FOUND", 88, "Weapon used.");
    expect(resolved.status).toBe("Complete");
    const stored = readDb().cases.find((c) => c.case_id === "AR-2026-00417")!;
    expect(stored).toMatchObject({ status: "COMPLETE", auditor_severity_score: 88, effective_severity_score: 71 });
  });

  it("locks staff login for 15 minutes after 5 wrong passwords (Figma 36:129)", async () => {
    for (let i = 0; i < 4; i++) {
      await expect(mock.staffLogin("auditor-1", "wrong")).rejects.toMatchObject({ status: 401 });
    }
    await expect(mock.staffLogin("auditor-1", "wrong")).rejects.toMatchObject({
      status: 429,
      message: "Too many attempts. Try again in 15 minutes.",
    });
    // Even the right password is refused while locked.
    await expect(mock.staffLogin("auditor-1", DEMO_PASSWORD)).rejects.toMatchObject({ status: 429 });
  });

  it("moves a case into review only after the content warning is acknowledged (AR-PV-08)", async () => {
    const token = await loginAs("auditor-1");
    await mock.acknowledgeContentWarning("AR-2026-00417", token);
    const db = readDb();
    expect(db.cases.find((c) => c.case_id === "AR-2026-00417")!.status).toBe("AUDITOR_REVIEW");
    expect(db.auditLog.some((e) => e.action === "CONTENT_WARNING_ACKNOWLEDGED")).toBe(true);
  });

  it("routes a declined case to the Manager, off the Auditor's queue, never reassigned (AR-DF-02)", async () => {
    const token = await loginAs("auditor-1");
    await mock.declineCase("AR-2026-00417", token, "OTHER", "  Too close to home.  ");
    const stored = readDb().cases.find((c) => c.case_id === "AR-2026-00417")!;
    expect(stored).toMatchObject({ assigned_auditor: null, manager_flag: "DECLINED" });
    expect(stored.decline).toMatchObject({
      reason: "OTHER",
      other_text: "Too close to home.",
      declined_by: "auditor-1",
    });
    expect((await mock.getAuditorCases(token)).map((c) => c.case_id)).not.toContain("AR-2026-00417");
  });

  it("counts measured playback towards the Auditor's daily exposure (AR-WB-01)", async () => {
    const token = await loginAs("auditor-1");
    await mock.recordExposure("AR-2026-00417", token, { active_seconds: 150, replay_seconds: 30 });
    expect((await mock.getMyWellbeing(token)).exposure_minutes_today).toBe(62 + 3);
    expect(readDb().cases.find((c) => c.case_id === "AR-2026-00417")!.exposure).toEqual({
      active_seconds: 150,
      replay_seconds: 30,
    });
  });

  it("SOS records the event, hands the case to the Manager and starts the S4 protocol (AR-WB-06, AR-WB-12)", async () => {
    const token = await loginAs("auditor-1");
    const seededEvents = readDb().sosEvents.length;
    const { cooldown } = await mock.triggerSos("AR-2026-00417", token);
    expect(cooldown).toMatchObject({ trigger: "SOS", requires_check_in: true });
    expect(Date.parse(cooldown.ends_at) - Date.now()).toBeGreaterThan(29 * 60_000);
    const db = readDb();
    expect(db.sosEvents).toHaveLength(seededEvents + 1);
    expect(db.cases.find((c) => c.case_id === "AR-2026-00417")!.manager_flag).toBe("SOS");
    // The cooldown blocks opening raw content, and it stays until the check-in, even after the time is up.
    await expect(mock.acknowledgeContentWarning("AR-2026-00419", token)).rejects.toMatchObject({ status: 409 });
    updateDb((d) => {
      d.staff.find((s) => s.staff_id === "auditor-1")!.cooldown!.ends_at = new Date(Date.now() - 1000).toISOString();
    });
    expect((await mock.getMyWellbeing(token)).cooldown).not.toBeNull();
  });

  it("applies AR-WB-12 cooldowns by the worse of the AI tier and the Auditor's rating", async () => {
    const token = await loginAs("auditor-1");
    // S1 case rated S1: no cooldown.
    expect((await mock.resolveCase("AR-2026-00419", token, "NO_VIOLATION_FOUND")).cooldown).toBeNull();
    // S3 case: 15 minutes, no mandatory check-in.
    const s3 = await mock.resolveCase("AR-2026-00417", token, "POLICY_VIOLATION_FOUND");
    expect(s3.cooldown).toMatchObject({ trigger: "S3", requires_check_in: false });
    // S4 by the AI: 30 minutes plus check-in.
    const s4 = await mock.resolveCase("AR-2026-00420", token, "POLICY_VIOLATION_FOUND");
    expect(s4.cooldown).toMatchObject({ trigger: "S4", requires_check_in: true });
  });

  it("gives an S2 case a cooldown only after sustained exposure", async () => {
    const token = await loginAs("auditor-2");
    updateDb((db) => {
      const c = db.cases.find((x) => x.case_id === "RCS-7Q3M-K91X")!;
      c.exposure = { active_seconds: 130, replay_seconds: 0 };
    });
    const result = await mock.resolveCase("RCS-7Q3M-K91X", token, "NO_VIOLATION_FOUND");
    expect(result.cooldown).toMatchObject({ trigger: "S2", requires_check_in: false });
  });

  it("fails the next submission like a dropped connection when the demo scenario asks", async () => {
    const token = await loginAs("auditor-1");
    updateDb((db) => {
      db.demo.failNextSubmission = true;
    });
    await expect(mock.resolveCase("AR-2026-00419", token, "NO_VIOLATION_FOUND")).rejects.toBeInstanceOf(TypeError);
    // Only once.
    await expect(mock.resolveCase("AR-2026-00419", token, "NO_VIOLATION_FOUND")).resolves.toMatchObject({
      status: "Complete",
    });
  });

  it("finishes simulated AI analysis once its time has passed", async () => {
    const token = await loginAs("auditor-1");
    updateDb((db) => {
      db.cases.find((c) => c.case_id === "AR-2026-00418")!.ai_ready_at = new Date(Date.now() - 1000).toISOString();
    });
    const detail = await mock.getAuditorCaseDetail("AR-2026-00418", token);
    expect(detail.status).toBe("READY_FOR_REVIEW");
    expect(detail.severity_tier).not.toBeNull();
  });
});
