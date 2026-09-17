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
    // Seed: auditor-1 62 min / 3 cases (0.49), auditor-2 68 min / 2 cases (0.42),
    // auditor-3 120 min = at limit (excluded).
    const result = await mock.createReport(video());
    expect(result.assigned_auditor).toBe("auditor-2");
    expect(readDb().cases.some((c) => c.assigned_auditor === "auditor-3" && c.case_id === result.case_id)).toBe(false);
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
