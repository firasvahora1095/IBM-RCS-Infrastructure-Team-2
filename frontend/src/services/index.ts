import type { DataService, FinalOutcome } from "./types";
import { mockDataService } from "./mock";
import { apiDataService } from "./api";

/**
 * The only module pages call for data.
 *
 * VITE_DATA_SOURCE chooses the implementation at build time:
 *   "mock" (default) — synthetic demo data, no backend needed; the UI shows
 *                      a "Demo data" badge so it's never mistaken for live data.
 *   "api"            — the real backend at VITE_API_BASE_URL.
 *
 * Each export is a thin wrapper rather than a re-export, so tests can
 * replace a single operation with vi.spyOn(services, "…").
 */
export type DataSource = "mock" | "api";

export const DATA_SOURCE: DataSource = import.meta.env.VITE_DATA_SOURCE === "api" ? "api" : "mock";

export const isMockData = DATA_SOURCE === "mock";

const active: DataService = DATA_SOURCE === "api" ? apiDataService : mockDataService;

export function createReport(videoFile: File) {
  return active.createReport(videoFile);
}

export function getStatus(caseId: string) {
  return active.getStatus(caseId);
}

export function staffLogin(staffId: string, password: string) {
  return active.staffLogin(staffId, password);
}

export function getAuditorCases(token: string) {
  return active.getAuditorCases(token);
}

export function getAuditorCaseDetail(caseId: string, token: string) {
  return active.getAuditorCaseDetail(caseId, token);
}

export function resolveCase(
  caseId: string,
  token: string,
  finalOutcome: FinalOutcome,
  auditorSeverityScore?: number,
  auditorComment?: string,
) {
  return active.resolveCase(caseId, token, finalOutcome, auditorSeverityScore, auditorComment);
}

export function getManagerDashboard() {
  return active.getManagerDashboard();
}
