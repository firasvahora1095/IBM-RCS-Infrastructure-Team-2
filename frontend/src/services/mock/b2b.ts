import { ApiError } from "../types";
import type {
  ClientLoginResponse,
  CustomerIntegration,
  DataService,
  Delivery,
  GovernanceSummary,
  IntegrationTestResult,
  ReportAccessEntry,
  ServiceReport,
  SeverityTier,
} from "../types";
import {
  COMMUNITYHUB_ID,
  DELIVERY_MAX_AUTO_ATTEMPTS,
  DELIVERY_RETRY_GAP_MS,
  DELIVERY_TIMEOUT_REASON,
  DELIVERY_UNAVAILABLE_REASON,
  reportIdFor,
} from "./b2bSeed";
import { computeMetrics, deliveryHealth, finalTierOf } from "./reportMetrics";
import { readDb, updateDb, type MockCase, type MockDb, type MockDelivery } from "./store";

/**
 * Mock B2B operations (docs/ux/b2b-end-to-end-flow-spec.md): the customer
 * integration, automatic case result handoff with retries, Manager-approved
 * service reports, the CommunityHub authorised-user surface and the
 * simplified governance log. Same rules the real backend must follow.
 */

const LATENCY_MS = import.meta.env.MODE === "test" ? 0 : 250;
const delay = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

/** First automatic attempt after a case completes. */
const FIRST_ATTEMPT_DELAY_MS = 4_000;

const MAX_NOTE_LENGTH = 600;
const LOGIN_MAX_FAILURES = 5;
const LOGIN_WINDOW_MS = 10 * 60_000;
const LOGIN_LOCKOUT_MS = 15 * 60_000;

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

function requireManager(db: MockDb, token: string) {
  const session = db.sessions[token];
  if (!session) throw new ApiError("Not authenticated", 401);
  if (session.role !== "manager") throw new ApiError("Not authorised for this action", 403);
  return session;
}

function requireClient(db: MockDb, token: string) {
  const session = db.clientSessions[token];
  if (!session) throw new ApiError("Not authenticated", 401);
  return session;
}

function managerName(db: MockDb, staffId: string): string {
  return db.staff.find((s) => s.staff_id === staffId)?.display_name ?? staffId;
}

function audit(db: MockDb, actor: string, action: string, caseId: string | null, detail: string | null = null): void {
  db.auditLog.push({ at: new Date().toISOString(), actor, case_id: caseId, action, detail });
}

// ---- Case result handoff ----

/**
 * Called when a standard case completes (Auditor final decision). Creates the
 * delivery as PENDING; the first automatic attempt runs a few seconds later.
 * The Manager never approves it (extras §4.1).
 */
export function createDeliveryForCase(db: MockDb, c: MockCase): void {
  if (c.final_outcome !== "POLICY_VIOLATION_FOUND" && c.final_outcome !== "NO_VIOLATION_FOUND") return;
  if (db.deliveries.some((d) => d.case_id === c.case_id)) return; // idempotent: one delivery per case
  const failThisOne = db.demo.failNextDelivery;
  db.demo.failNextDelivery = false;
  const now = Date.now();
  db.deliveries.push({
    delivery_id: `DEL-${c.case_id}`,
    case_id: c.case_id,
    organisation_id: COMMUNITYHUB_ID,
    outcome: c.final_outcome,
    final_severity: finalTierOf(c) ?? "S1",
    completed_at: c.completed_at ?? new Date(now).toISOString(),
    delivery_status: "PENDING",
    attempts: [],
    failure_reason: null,
    next_attempt_at: new Date(now + FIRST_ATTEMPT_DELAY_MS).toISOString(),
    escalated_at: null,
    escalation_note: null,
    source_url: db.caseSources[c.case_id]?.url ?? null,
    simulate_failure: failThisOne,
  });
}

function autoAttempts(d: MockDelivery): number {
  return d.attempts.filter((a) => !a.manual).length;
}

/**
 * Runs every automatic attempt that has fallen due. Like the simulated AI,
 * the mock advances on read, so a page refresh shows real progress.
 */
export function advanceDeliveries(db: MockDb, now = Date.now()): void {
  for (const d of db.deliveries) {
    while (
      (d.delivery_status === "PENDING" || d.delivery_status === "RETRYING") &&
      d.next_attempt_at &&
      Date.parse(d.next_attempt_at) <= now
    ) {
      const at = d.next_attempt_at;
      const fails = d.simulate_failure || db.organisation.status === "ERROR";
      const reason = d.simulate_failure ? DELIVERY_TIMEOUT_REASON : DELIVERY_UNAVAILABLE_REASON;
      d.attempts.push({
        attempt: d.attempts.length + 1,
        at,
        result: fails ? "FAILED" : "SUCCESS",
        reason: fails ? reason : null,
        manual: false,
      });
      if (!fails) {
        d.delivery_status = "SUCCESS";
        d.next_attempt_at = null;
        d.failure_reason = null;
      } else if (autoAttempts(d) >= DELIVERY_MAX_AUTO_ATTEMPTS) {
        d.delivery_status = "NEEDS_ATTENTION";
        d.next_attempt_at = null;
        d.failure_reason = reason;
      } else {
        d.delivery_status = "RETRYING";
        d.next_attempt_at = new Date(Date.parse(at) + DELIVERY_RETRY_GAP_MS).toISOString();
        d.failure_reason = reason;
      }
    }
  }
}

/** The one delivery fact the public status page may use (B2B spec S4). */
export function publicDeliveryConfirmed(db: MockDb, caseId: string): boolean {
  return db.deliveries.some((d) => d.case_id === caseId && d.delivery_status === "SUCCESS");
}

function toDelivery(db: MockDb, d: MockDelivery): Delivery {
  return {
    delivery_id: d.delivery_id,
    case_id: d.case_id,
    organisation_id: d.organisation_id,
    outcome: d.outcome,
    final_severity: d.final_severity,
    completed_at: d.completed_at,
    moderation_status: "COMPLETE",
    delivery_status: d.delivery_status,
    attempts: d.attempts.map((a) => ({ ...a })),
    failure_reason: d.failure_reason,
    next_attempt_at: d.next_attempt_at,
    escalated_at: d.escalated_at,
    source_url: d.source_url,
    case_available: db.cases.some((c) => c.case_id === d.case_id),
  };
}

const DELIVERY_RANK = { NEEDS_ATTENTION: 0, RETRYING: 1, PENDING: 2, SUCCESS: 3 } as const;

function findDelivery(db: MockDb, deliveryId: string): MockDelivery {
  const found = db.deliveries.find((d) => d.delivery_id === deliveryId);
  if (!found) throw new ApiError("Delivery not found", 404);
  return found;
}

// ---- Reports ----

function findReport(db: MockDb, reportId: string): Mutable<ServiceReport> {
  const found = db.reports.find((r) => r.report_id === reportId);
  if (!found) throw new ApiError("Report not found", 404);
  return found;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** What a client is allowed to see of a released report: no staff names. */
function forClient(r: ServiceReport): ServiceReport {
  return { ...r, released_by: "RCS" };
}

/**
 * Logs one client access. React StrictMode runs effects twice in
 * development, so an identical entry within two seconds is not repeated.
 */
function logAccess(db: MockDb, entry: Omit<ReportAccessEntry, "at">): void {
  const now = Date.now();
  const duplicate = db.reportAccess.some(
    (e) =>
      e.report_id === entry.report_id &&
      e.user_id === entry.user_id &&
      e.action === entry.action &&
      e.access_result === entry.access_result &&
      now - Date.parse(e.at) < 2_000,
  );
  if (!duplicate) db.reportAccess.push({ ...entry, at: new Date(now).toISOString() });
}

/**
 * Deny by default (OWASP authorisation): the report must exist, be released
 * and belong to the client's organisation. Every refusal is logged and looks
 * the same from outside, so it reveals nothing about other reports.
 */
function authoriseClientReport(
  db: MockDb,
  token: string,
  reportId: string,
  action: ReportAccessEntry["action"],
): ServiceReport {
  const session = requireClient(db, token);
  const report = db.reports.find((r) => r.report_id === reportId);
  const deny = (reason: string) => {
    logAccess(db, {
      report_id: reportId,
      user_id: session.userId,
      organisation_id: session.organisationId,
      action,
      access_result: "DENIED",
      reason,
    });
    return new ApiError("Report not found", 404);
  };
  if (!report) throw deny("REPORT_NOT_FOUND");
  if (report.organisation_id !== session.organisationId) throw deny("WRONG_ORGANISATION");
  if (report.status !== "RELEASED") throw deny("REPORT_NOT_RELEASED");
  logAccess(db, {
    report_id: reportId,
    user_id: session.userId,
    organisation_id: session.organisationId,
    action,
    access_result: "SUCCESS",
    reason: null,
  });
  return forClient(report);
}

// ---- Governance ----

function overridePatterns(db: MockDb): { patterns: GovernanceSummary["override_patterns"]; compared: number } {
  const pairs: [SeverityTier, SeverityTier][] = [
    ...db.caseHistory.map((h) => [h.ai_tier, h.final_tier] as [SeverityTier, SeverityTier]),
    ...db.cases
      .filter((c) => c.status === "COMPLETE" && c.severity_tier && finalTierOf(c))
      .map((c) => [c.severity_tier!, finalTierOf(c)!] as [SeverityTier, SeverityTier]),
  ];
  const counts = new Map<string, number>();
  for (const [from, to] of pairs) {
    if (from === to) continue;
    counts.set(`${from}>${to}`, (counts.get(`${from}>${to}`) ?? 0) + 1);
  }
  const patterns = [...counts.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split(">") as [SeverityTier, SeverityTier];
      return { from, to, count };
    })
    .sort((a, b) => b.count - a.count);
  return { patterns, compared: pairs.length };
}

function average(values: number[]): number {
  return values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : 0;
}

export const b2bMockOps: Pick<
  DataService,
  | "getCustomerIntegration"
  | "testIntegration"
  | "listDeliveries"
  | "getDelivery"
  | "retryDelivery"
  | "escalateDelivery"
  | "listReports"
  | "generateReport"
  | "getReport"
  | "updateReportNote"
  | "releaseReport"
  | "listReportAccess"
  | "getGovernanceSummary"
  | "clientLogin"
  | "clientListReports"
  | "clientGetReport"
  | "clientRecordDownload"
> = {
  async getCustomerIntegration(organisationId: string, token: string): Promise<CustomerIntegration> {
    await delay();
    return updateDb((db) => {
      requireManager(db, token);
      advanceDeliveries(db);
      const org = db.organisation;
      if (organisationId.toUpperCase() !== org.organisation_id) throw new ApiError("Customer not found", 404);
      const lastSuccess = db.deliveries
        .flatMap((d) => d.attempts.filter((a) => a.result === "SUCCESS").map((a) => Date.parse(a.at)))
        .reduce((max, t) => Math.max(max, t), 0);
      return {
        organisation_id: org.organisation_id,
        name: org.name,
        description: org.description,
        status: org.status,
        destination_masked: org.destination_masked,
        method: "Signed HTTPS callback (JSON)",
        auth_method: "Shared secret, rotated every 30 days",
        retry_policy: `${DELIVERY_MAX_AUTO_ATTEMPTS} automatic attempts, then Manager review`,
        idempotency: "One stable delivery ID per case, reused on every retry",
        last_tested_at: org.last_tested_at,
        last_delivery_at: lastSuccess ? new Date(lastSuccess).toISOString() : null,
        health: deliveryHealth(db.deliveries),
      };
    });
  },

  async testIntegration(organisationId: string, token: string): Promise<IntegrationTestResult> {
    await delay(import.meta.env.MODE === "test" ? 0 : 700);
    return updateDb((db) => {
      const session = requireManager(db, token);
      if (organisationId.toUpperCase() !== db.organisation.organisation_id) {
        throw new ApiError("Customer not found", 404);
      }
      const testedAt = new Date().toISOString();
      db.organisation.last_tested_at = testedAt;
      const ok = db.organisation.status === "READY";
      audit(db, session.staffId, "INTEGRATION_TESTED", null, ok ? "ok" : "failed");
      return {
        ok,
        latency_ms: ok ? 120 + Math.round(Math.random() * 60) : 0,
        tested_at: testedAt,
        message: ok ? "Test delivery accepted" : "CommunityHub's endpoint didn't accept the test delivery",
      };
    });
  },

  async listDeliveries(token: string): Promise<Delivery[]> {
    await delay();
    return updateDb((db) => {
      requireManager(db, token);
      advanceDeliveries(db);
      return [...db.deliveries]
        .sort(
          (a, b) =>
            DELIVERY_RANK[a.delivery_status] - DELIVERY_RANK[b.delivery_status] ||
            Date.parse(b.completed_at) - Date.parse(a.completed_at),
        )
        .map((d) => toDelivery(db, d));
    });
  },

  async getDelivery(deliveryId: string, token: string): Promise<Delivery> {
    await delay();
    return updateDb((db) => {
      requireManager(db, token);
      advanceDeliveries(db);
      return toDelivery(db, findDelivery(db, deliveryId));
    });
  },

  async retryDelivery(deliveryId: string, token: string): Promise<Delivery> {
    await delay(import.meta.env.MODE === "test" ? 0 : 900);
    return updateDb((db) => {
      const session = requireManager(db, token);
      advanceDeliveries(db);
      const d = findDelivery(db, deliveryId);
      // Idempotent: a delivery that already succeeded is never sent twice.
      if (d.delivery_status === "SUCCESS") return toDelivery(db, d);
      const ok = db.organisation.status === "READY";
      d.attempts.push({
        attempt: d.attempts.length + 1,
        at: new Date().toISOString(),
        result: ok ? "SUCCESS" : "FAILED",
        reason: ok ? null : DELIVERY_UNAVAILABLE_REASON,
        manual: true,
      });
      if (ok) {
        d.delivery_status = "SUCCESS";
        d.failure_reason = null;
        d.next_attempt_at = null;
        d.simulate_failure = false;
      } else {
        d.delivery_status = "NEEDS_ATTENTION";
        d.failure_reason = DELIVERY_UNAVAILABLE_REASON;
      }
      audit(db, session.staffId, "DELIVERY_RETRIED", d.case_id, `${d.delivery_id}:${ok ? "success" : "failed"}`);
      return toDelivery(db, d);
    });
  },

  async escalateDelivery(deliveryId: string, token: string, note: string): Promise<{ escalated: true }> {
    await delay();
    if (!note.trim()) throw new ApiError("Add a short note so the integration owner knows what to check.", 400);
    return updateDb((db) => {
      const session = requireManager(db, token);
      const d = findDelivery(db, deliveryId);
      d.escalated_at = new Date().toISOString();
      d.escalation_note = note.trim();
      audit(db, session.staffId, "DELIVERY_ESCALATED", d.case_id, d.delivery_id);
      return { escalated: true as const };
    });
  },

  async listReports(token: string): Promise<ServiceReport[]> {
    await delay();
    return updateDb((db) => {
      requireManager(db, token);
      return [...db.reports]
        .sort((a, b) => b.period_start.localeCompare(a.period_start) || b.version - a.version)
        .map((r) => ({ ...r }));
    });
  },

  async generateReport(
    token: string,
    organisationId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<ServiceReport> {
    await delay(import.meta.env.MODE === "test" ? 0 : 900);
    if (!ISO_DATE.test(periodStart) || !ISO_DATE.test(periodEnd) || periodStart > periodEnd) {
      throw new ApiError("Choose a valid reporting period.", 400);
    }
    return updateDb((db) => {
      const session = requireManager(db, token);
      if (organisationId.toUpperCase() !== db.organisation.organisation_id) {
        throw new ApiError("Customer not found", 404);
      }
      advanceDeliveries(db);
      const metrics = computeMetrics(
        { history: db.caseHistory, cases: db.cases, deliveries: db.deliveries },
        periodStart,
        periodEnd,
      );
      const samePeriod = db.reports.filter((r) => r.period_start === periodStart && r.period_end === periodEnd);
      const existingDraft = samePeriod.find((r) => r.status === "DRAFT");
      const now = new Date().toISOString();
      if (existingDraft) {
        // Regenerating a draft refreshes its figures; the Manager's note stays.
        Object.assign(existingDraft, { metrics, generated_at: now });
        audit(db, session.staffId, "REPORT_REGENERATED", null, existingDraft.report_id);
        return { ...existingDraft };
      }
      const version = samePeriod.reduce((max, r) => Math.max(max, r.version), 0) + 1;
      const report: ServiceReport = {
        report_id: reportIdFor(periodStart, periodEnd, version),
        organisation_id: db.organisation.organisation_id,
        organisation_name: db.organisation.name,
        period_start: periodStart,
        period_end: periodEnd,
        status: "DRAFT",
        version,
        generated_at: now,
        released_at: null,
        released_by: null,
        manager_note: null,
        metrics,
      };
      db.reports.push(report);
      audit(db, session.staffId, "REPORT_GENERATED", null, report.report_id);
      return { ...report };
    });
  },

  async getReport(reportId: string, token: string): Promise<ServiceReport> {
    await delay();
    return updateDb((db) => {
      requireManager(db, token);
      return { ...findReport(db, reportId) };
    });
  },

  async updateReportNote(reportId: string, token: string, note: string): Promise<ServiceReport> {
    await delay();
    if (note.length > MAX_NOTE_LENGTH) throw new ApiError(`Keep the note under ${MAX_NOTE_LENGTH} characters.`, 400);
    return updateDb((db) => {
      requireManager(db, token);
      const report = findReport(db, reportId);
      if (report.status !== "DRAFT") throw new ApiError("A released report can't be edited.", 409);
      report.manager_note = note.trim() || null;
      return { ...report };
    });
  },

  async releaseReport(reportId: string, token: string): Promise<ServiceReport> {
    await delay(import.meta.env.MODE === "test" ? 0 : 900);
    return updateDb((db) => {
      const session = requireManager(db, token);
      const report = findReport(db, reportId);
      if (report.status === "RELEASED") return { ...report };
      report.status = "RELEASED";
      report.released_at = new Date().toISOString();
      report.released_by = managerName(db, session.staffId);
      audit(db, session.staffId, "REPORT_RELEASED", null, report.report_id);
      return { ...report };
    });
  },

  async listReportAccess(reportId: string, token: string): Promise<ReportAccessEntry[]> {
    await delay();
    return updateDb((db) => {
      requireManager(db, token);
      findReport(db, reportId);
      return db.reportAccess
        .filter((e) => e.report_id === reportId)
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
        .map((e) => ({ ...e }));
    });
  },

  async getGovernanceSummary(token: string): Promise<GovernanceSummary> {
    await delay();
    return updateDb((db) => {
      requireManager(db, token);
      const rows = [...db.governanceLog].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      const ok = rows.filter((r) => r.success);
      const { patterns, compared } = overridePatterns(db);
      return {
        is_placeholder: true,
        rows,
        averages: {
          prompt_leakage: average(ok.map((r) => r.prompt_leakage)),
          source_attribution: average(ok.map((r) => r.source_attribution)),
          accumulated_score: average(ok.map((r) => r.accumulated_score)),
        },
        total_calls: rows.length,
        failed_calls: rows.length - ok.length,
        override_patterns: patterns,
        compared_cases: compared,
      };
    });
  },

  async clientLogin(userId: string, password: string): Promise<ClientLoginResponse> {
    await delay();
    return updateDb((db) => {
      const key = `client:${userId.trim().toLowerCase()}`;
      const now = Date.now();
      const attempts = (db.loginAttempts[key] ??= { failureTimes: [], lockedUntil: null });
      if (attempts.lockedUntil && now < attempts.lockedUntil) {
        throw new ApiError("Too many attempts. Try again in 15 minutes.", 429);
      }
      // A staff account can't sign in here, and gets the same generic answer as a wrong password.
      const user = db.clients.find((u) => u.user_id === userId.trim().toLowerCase());
      if (!user || user.password !== password) {
        attempts.failureTimes = [...attempts.failureTimes.filter((t) => now - t < LOGIN_WINDOW_MS), now];
        if (attempts.failureTimes.length >= LOGIN_MAX_FAILURES) {
          attempts.lockedUntil = now + LOGIN_LOCKOUT_MS;
          attempts.failureTimes = [];
          throw new ApiError("Too many attempts. Try again in 15 minutes.", 429);
        }
        throw new ApiError("Invalid credentials", 401);
      }
      delete db.loginAttempts[key];
      const token = `client-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      db.clientSessions[token] = { userId: user.user_id, organisationId: user.organisation_id };
      return {
        token,
        user_id: user.user_id,
        display_name: user.display_name,
        organisation_id: user.organisation_id,
        organisation_name: db.organisation.name,
      };
    });
  },

  async clientListReports(token: string): Promise<ServiceReport[]> {
    await delay();
    return updateDb((db) => {
      const session = requireClient(db, token);
      return db.reports
        .filter((r) => r.status === "RELEASED" && r.organisation_id === session.organisationId)
        .sort((a, b) => b.period_start.localeCompare(a.period_start) || b.version - a.version)
        .map(forClient);
    });
  },

  async clientGetReport(reportId: string, token: string): Promise<ServiceReport> {
    await delay();
    return updateDb((db) => authoriseClientReport(db, token, reportId, "VIEW"));
  },

  async clientRecordDownload(reportId: string, token: string): Promise<{ recorded: true }> {
    await delay();
    return updateDb((db) => {
      authoriseClientReport(db, token, reportId, "DOWNLOAD");
      return { recorded: true as const };
    });
  },
};

/** For tests: the current delivery list without a session. */
export function peekDeliveries(): MockDelivery[] {
  return readDb().deliveries;
}
