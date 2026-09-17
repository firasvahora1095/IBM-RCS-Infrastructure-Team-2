import type { DataService } from "./types";
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
 * Each export is a separate delegating function rather than a re-export of
 * one object, so tests can replace a single operation with
 * vi.spyOn(services, "…").
 */
export type DataSource = "mock" | "api";

export const DATA_SOURCE: DataSource = import.meta.env.VITE_DATA_SOURCE === "api" ? "api" : "mock";

export const isMockData = DATA_SOURCE === "mock";

const active: DataService = DATA_SOURCE === "api" ? apiDataService : mockDataService;

/** Forwards a call to the same-named operation on the active data source. */
function delegate<K extends keyof DataService>(operation: K): DataService[K] {
  const forward = (...args: unknown[]) => (active[operation] as (...a: unknown[]) => unknown)(...args);
  return forward as DataService[K];
}

// Public reporting
export const createReport = delegate("createReport");
export const createLinkReport = delegate("createLinkReport");
export const createScreenshotReport = delegate("createScreenshotReport");
export const addCaseInformation = delegate("addCaseInformation");
export const getStatus = delegate("getStatus");
export const requestStatusUpdates = delegate("requestStatusUpdates");

// Staff sign-in
export const staffLogin = delegate("staffLogin");

// Auditor review
export const getAuditorCases = delegate("getAuditorCases");
export const getAuditorCaseDetail = delegate("getAuditorCaseDetail");
export const resolveCase = delegate("resolveCase");

// Auditor wellbeing
export const getMyWellbeing = delegate("getMyWellbeing");

// Manager oversight
export const getManagerDashboard = delegate("getManagerDashboard");
