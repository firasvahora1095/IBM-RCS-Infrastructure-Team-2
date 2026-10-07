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
export const acknowledgeContentWarning = delegate("acknowledgeContentWarning");
export const declineCase = delegate("declineCase");
export const recordExposure = delegate("recordExposure");
export const triggerSos = delegate("triggerSos");
export const reportUnexpectedExposure = delegate("reportUnexpectedExposure");
export const requestWellbeingSupport = delegate("requestWellbeingSupport");

// Manager oversight
export const getAuditHistory = delegate("getAuditHistory");
export const getManagerDashboard = delegate("getManagerDashboard");
export const getAuditorOverview = delegate("getAuditorOverview");
export const getSosSummary = delegate("getSosSummary");
export const getAuditorDetail = delegate("getAuditorDetail");
export const setExposureLimit = delegate("setExposureLimit");
export const approveBreakRequest = delegate("approveBreakRequest");
export const getCaseOversight = delegate("getCaseOversight");
export const listSosAlerts = delegate("listSosAlerts");
export const getSosAlert = delegate("getSosAlert");
export const acknowledgeSosAlert = delegate("acknowledgeSosAlert");
export const logSosFollowUp = delegate("logSosFollowUp");
export const listDeclinedCases = delegate("listDeclinedCases");
export const getManagerCaseReview = delegate("getManagerCaseReview");
export const getReassignmentContext = delegate("getReassignmentContext");
export const reassignCase = delegate("reassignCase");
export const closeWithoutReassignment = delegate("closeWithoutReassignment");
export const getCaseForExceptionalAccess = delegate("getCaseForExceptionalAccess");
export const recordExceptionalAccess = delegate("recordExceptionalAccess");
export const getValidationSummary = delegate("getValidationSummary");
export const releaseCaseAtLimit = delegate("releaseCaseAtLimit");
export const releaseAllCasesAtLimit = delegate("releaseAllCasesAtLimit");

// B2B — Manager: customer integration, case result handoff, reports, governance
export const getCustomerIntegration = delegate("getCustomerIntegration");
export const testIntegration = delegate("testIntegration");
export const listDeliveries = delegate("listDeliveries");
export const getDelivery = delegate("getDelivery");
export const retryDelivery = delegate("retryDelivery");
export const escalateDelivery = delegate("escalateDelivery");
export const listReports = delegate("listReports");
export const generateReport = delegate("generateReport");
export const getReport = delegate("getReport");
export const updateReportNote = delegate("updateReportNote");
export const releaseReport = delegate("releaseReport");
export const listReportAccess = delegate("listReportAccess");
export const getGovernanceSummary = delegate("getGovernanceSummary");

// B2B — CommunityHub authorised user
export const clientLogin = delegate("clientLogin");
export const clientListReports = delegate("clientListReports");
export const clientGetReport = delegate("clientGetReport");
export const clientRecordDownload = delegate("clientRecordDownload");
