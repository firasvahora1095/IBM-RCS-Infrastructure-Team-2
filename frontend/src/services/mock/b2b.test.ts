import { describe, it, expect, beforeEach } from "vitest";
import { mockDataService as mock } from "./index";
import { advanceDeliveries } from "./b2b";
import { readDb, resetDb, updateDb } from "./store";
import { DEMO_PASSWORD } from "./seed";
import { computeMetrics } from "./reportMetrics";

async function managerToken() {
  return (await mock.staffLogin("manager-1", DEMO_PASSWORD)).token;
}
async function auditorToken() {
  return (await mock.staffLogin("auditor-1", DEMO_PASSWORD)).token;
}
async function clientToken() {
  return (await mock.clientLogin("ch-user-17", DEMO_PASSWORD)).token;
}

/** Runs every automatic delivery attempt as if `ms` had passed. */
function fastForwardDeliveries(ms = 60_000) {
  updateDb((db) => advanceDeliveries(db, Date.now() + ms));
}

describe("mock B2B data source", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetDb();
  });

  describe("case result handoff", () => {
    it("hands a completed case to CommunityHub automatically, with no Manager approval", async () => {
      const token = await auditorToken();
      await mock.resolveCase("AR-2026-00417", token, "POLICY_VIOLATION_FOUND", 71);
      const created = readDb().deliveries.find((d) => d.case_id === "AR-2026-00417");
      expect(created?.delivery_status).toBe("PENDING");
      expect(created?.delivery_id).toBe("DEL-AR-2026-00417");

      fastForwardDeliveries();
      const manager = await managerToken();
      const delivery = await mock.getDelivery("DEL-AR-2026-00417", manager);
      expect(delivery.delivery_status).toBe("SUCCESS");
      expect(delivery.moderation_status).toBe("COMPLETE");
      expect(delivery.outcome).toBe("POLICY_VIOLATION_FOUND");
      expect(delivery.final_severity).toBe("S3");
    });

    it("keeps moderation complete when every automatic attempt fails, and needs the Manager after 3", async () => {
      updateDb((db) => (db.demo.failNextDelivery = true));
      await mock.resolveCase("AR-2026-00417", await auditorToken(), "NO_VIOLATION_FOUND", 71);
      fastForwardDeliveries();
      const manager = await managerToken();
      const delivery = await mock.getDelivery("DEL-AR-2026-00417", manager);
      expect(delivery.delivery_status).toBe("NEEDS_ATTENTION");
      expect(delivery.attempts.filter((a) => a.result === "FAILED")).toHaveLength(3);
      expect(delivery.moderation_status).toBe("COMPLETE");
      expect(readDb().cases.find((c) => c.case_id === "AR-2026-00417")?.status).toBe("COMPLETE");
    });

    it("retries with the same delivery ID and never sends a successful delivery twice", async () => {
      const manager = await managerToken();
      const retried = await mock.retryDelivery("DEL-AR-2026-00404", manager);
      expect(retried.delivery_status).toBe("SUCCESS");
      expect(retried.delivery_id).toBe("DEL-AR-2026-00404");
      expect(retried.attempts.at(-1)).toMatchObject({ result: "SUCCESS", manual: true });
      const again = await mock.retryDelivery("DEL-AR-2026-00404", manager);
      expect(again.attempts).toHaveLength(retried.attempts.length);
    });

    it("lists exceptions first and requires an escalation note", async () => {
      const manager = await managerToken();
      const list = await mock.listDeliveries(manager);
      expect(list[0].delivery_status).toBe("NEEDS_ATTENTION");
      await expect(mock.escalateDelivery(list[0].delivery_id, manager, " ")).rejects.toMatchObject({ status: 400 });
      await expect(mock.escalateDelivery(list[0].delivery_id, manager, "Endpoint down")).resolves.toEqual({
        escalated: true,
      });
    });

    it("is Manager-only", async () => {
      await expect(mock.listDeliveries(await auditorToken())).rejects.toMatchObject({ status: 403 });
    });

    it("only tells the Reporter CommunityHub was notified once delivery succeeded", async () => {
      await mock.resolveCase("AR-2026-00417", await auditorToken(), "POLICY_VIOLATION_FOUND", 71);
      expect((await mock.getStatus("AR-2026-00417")).public_delivery_confirmed).toBe(false);
      fastForwardDeliveries();
      expect((await mock.getStatus("AR-2026-00417")).public_delivery_confirmed).toBe(true);
    });

    it("keeps optional source details without requiring them", async () => {
      const video = new File(["x"], "clip.mp4", { type: "video/mp4" });
      const withSource = await mock.createReport(video, { url: "https://communityhub.example/post/4721" });
      const without = await mock.createReport(video);
      expect(readDb().caseSources[withSource.case_id]?.url).toBe("https://communityhub.example/post/4721");
      expect(readDb().caseSources[without.case_id]).toBeUndefined();
    });
  });

  describe("customer integration", () => {
    it("reports a ready connection and delivery health", async () => {
      const manager = await managerToken();
      const org = await mock.getCustomerIntegration("communityhub", manager);
      expect(org.status).toBe("READY");
      expect(org.health.needs_attention).toBeGreaterThanOrEqual(2);
      const test = await mock.testIntegration("COMMUNITYHUB", manager);
      expect(test.ok).toBe(true);
    });
  });

  describe("service reports", () => {
    it("generates a draft from stored records, then releases it read-only", async () => {
      const manager = await managerToken();
      const draft = await mock.generateReport(manager, "COMMUNITYHUB", "2026-01-01", "2026-01-15");
      expect(draft.status).toBe("DRAFT");
      expect(draft.report_id).toBe("RPT-CH-20260101-20260115");
      const db = readDb();
      expect(draft.metrics).toEqual(
        computeMetrics({ history: db.caseHistory, cases: db.cases, deliveries: db.deliveries }, "2026-01-01", "2026-01-15"),
      );
      await mock.updateReportNote(draft.report_id, manager, "Steady month.");
      const released = await mock.releaseReport(draft.report_id, manager);
      expect(released.status).toBe("RELEASED");
      expect(released.released_by).toBe("Alex Morgan");
      await expect(mock.updateReportNote(draft.report_id, manager, "Edit")).rejects.toMatchObject({ status: 409 });
    });

    it("rejects an invalid period", async () => {
      const manager = await managerToken();
      await expect(mock.generateReport(manager, "COMMUNITYHUB", "2026-02-10", "2026-02-01")).rejects.toMatchObject({
        status: 400,
      });
    });

    it("counts every completed case once and keeps figures consistent", async () => {
      const manager = await managerToken();
      const [draft] = (await mock.listReports(manager)).filter((r) => r.status === "DRAFT");
      const m = draft.metrics;
      const bySeverity = Object.values(m.severity_breakdown).reduce((a, b) => a + b, 0);
      expect(bySeverity).toBe(m.violation_count + m.no_violation_count);
      expect(m.violation_count + m.no_violation_count).toBeLessThanOrEqual(m.cases_completed);
      expect(m.override_rate).toBeGreaterThanOrEqual(0);
      expect(m.override_rate).toBeLessThanOrEqual(1);
    });
  });

  describe("CommunityHub authorised user", () => {
    it("signs in with its own account and rejects staff accounts", async () => {
      await expect(mock.clientLogin("manager-1", DEMO_PASSWORD)).rejects.toMatchObject({ status: 401 });
      const login = await mock.clientLogin("ch-user-17", DEMO_PASSWORD);
      expect(login.organisation_name).toBe("CommunityHub");
    });

    it("lists released reports only, without staff names", async () => {
      const reports = await mock.clientListReports(await clientToken());
      expect(reports.length).toBeGreaterThan(0);
      expect(reports.every((r) => r.status === "RELEASED" && r.released_by === "RCS")).toBe(true);
    });

    it("denies an unreleased report as 'not found' and logs the denial", async () => {
      const token = await clientToken();
      const draft = readDb().reports.find((r) => r.status === "DRAFT")!;
      await expect(mock.clientGetReport(draft.report_id, token)).rejects.toMatchObject({ status: 404 });
      const denial = readDb().reportAccess.at(-1);
      expect(denial).toMatchObject({ access_result: "DENIED", reason: "REPORT_NOT_RELEASED", action: "VIEW" });
    });

    it("logs successful views and downloads", async () => {
      const token = await clientToken();
      const [report] = await mock.clientListReports(token);
      await mock.clientGetReport(report.report_id, token);
      await mock.clientRecordDownload(report.report_id, token);
      const log = await mock.listReportAccess(report.report_id, await managerToken());
      expect(log[0]).toMatchObject({ action: "DOWNLOAD", access_result: "SUCCESS" });
      expect(log[1]).toMatchObject({ action: "VIEW", access_result: "SUCCESS" });
    });

    it("can't use a client token on staff operations", async () => {
      await expect(mock.listDeliveries(await clientToken())).rejects.toMatchObject({ status: 401 });
    });
  });

  describe("daily cap reached mid-case", () => {
    it("returns the case to the Manager as a limit decline", async () => {
      await mock.releaseCaseAtLimit("AR-2026-00417", await auditorToken());
      const c = readDb().cases.find((x) => x.case_id === "AR-2026-00417")!;
      expect(c.manager_flag).toBe("CAP_REACHED");
      expect(c.decline?.reason).toBe("EXPOSURE_CAP_REACHED");
      expect(c.assigned_auditor).toBeNull();
    });
  });

  describe("governance log", () => {
    it("is flagged placeholder and aggregates override patterns without Auditor names", async () => {
      const summary = await mock.getGovernanceSummary(await managerToken());
      expect(summary.is_placeholder).toBe(true);
      expect(summary.rows.length).toBe(summary.total_calls);
      expect(summary.override_patterns.every((p) => p.from !== p.to)).toBe(true);
      expect(JSON.stringify(summary.override_patterns)).not.toMatch(/auditor/i);
    });
  });
});
