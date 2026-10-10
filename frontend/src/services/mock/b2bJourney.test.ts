import { beforeEach, describe, expect, it } from "vitest";
import { mockDataService as mock } from "./index";
import { advanceDeliveries } from "./b2b";
import { readDb, resetDb, updateDb } from "./store";
import { DEMO_PASSWORD } from "./seed";
import { periodFor } from "../../utils/periods";

/**
 * The whole B2B journey in one pass, through every person's hand-off, so a gap
 * between two screens shows up as a failing step here (B2B high-level flow §1):
 *
 *   Reporter → AI pre-screen → Auditor → result delivered → Manager report →
 *   Client views the released report
 */
describe("B2B journey, end to end", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetDb();
  });

  it("carries one report from the Reporter to a released report the Client can read", async () => {
    // 1. Reporter submits a video from CommunityHub, with the post link.
    const clip = new File(["frames"], "clip.mp4", { type: "video/mp4" });
    const created = await mock.createReport(clip, { url: "https://communityhub.example/post/4721" });
    const caseId = created.case_id;
    expect((await mock.getStatus(caseId)).status).not.toBe("Complete");

    // 2. The AI pre-screen finishes and the case reaches its assigned Auditor.
    const assigned = readDb().cases.find((c) => c.case_id === caseId)!.assigned_auditor!;
    expect(assigned).toBeTruthy();
    updateDb((db) => {
      db.cases.find((c) => c.case_id === caseId)!.ai_ready_at = new Date(Date.now() - 1000).toISOString();
    });
    const auditor = (await mock.staffLogin(assigned, DEMO_PASSWORD)).token;
    const queue = await mock.getAuditorCases(auditor);
    expect(queue.find((c) => c.case_id === caseId)?.status).toBe("READY_FOR_REVIEW");

    // 3. The Auditor reviews behind the content warning and makes the final decision.
    await mock.acknowledgeContentWarning(caseId, auditor);
    await mock.resolveCase(caseId, auditor, "POLICY_VIOLATION_FOUND");

    // 4. The Reporter sees Complete, but isn't told CommunityHub was notified until it was.
    let status = await mock.getStatus(caseId);
    expect(status.status).toBe("Complete");
    expect(status.public_delivery_confirmed).toBe(false);

    // 5. The result reaches CommunityHub automatically; the Reporter can now be told.
    updateDb((db) => advanceDeliveries(db, Date.now() + 60_000));
    status = await mock.getStatus(caseId);
    expect(status.public_delivery_confirmed).toBe(true);

    // 6. The Manager sees the delivery, kept separate from the moderation status, with the post link.
    const manager = (await mock.staffLogin("manager-1", DEMO_PASSWORD)).token;
    const delivery = (await mock.listDeliveries(manager)).find((d) => d.case_id === caseId)!;
    expect(delivery).toMatchObject({
      moderation_status: "COMPLETE",
      delivery_status: "SUCCESS",
      outcome: "POLICY_VIOLATION_FOUND",
      source_url: "https://communityhub.example/post/4721",
    });

    // 7. The dashboard counts the case, and a report generated from it lists it as evidence.
    const { start, end } = periodFor("today", new Date());
    const dashboard = await mock.getManagerIntelligence(manager, {
      organisationId: "COMMUNITYHUB",
      periodStart: start,
      periodEnd: end,
    });
    expect(dashboard.evidence.completed.case_ids).toContain(caseId);
    const draft = await mock.generateReport(manager, "COMMUNITYHUB", start, end);
    expect(draft.metrics.evidence?.cases_completed.case_ids).toContain(caseId);

    // 8. The Client can't see the draft, and sees the released report with no case IDs.
    const client = (await mock.clientLogin("ch-user-17", DEMO_PASSWORD)).token;
    await expect(mock.clientGetReport(draft.report_id, client)).rejects.toMatchObject({ status: 404 });
    await mock.releaseReport(draft.report_id, manager);
    const released = await mock.clientGetReport(draft.report_id, client);
    expect(released.status).toBe("RELEASED");
    expect(released.metrics.cases_completed).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(released)).not.toContain(caseId);
    expect((await mock.clientListReports(client)).map((r) => r.report_id)).toContain(draft.report_id);
  });
});
