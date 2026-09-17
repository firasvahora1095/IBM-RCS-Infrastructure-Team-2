import { NotImplementedError, type DataService } from "../types";
import * as http from "./httpClient";

/**
 * The `api` data source — the real backend.
 *
 * For Firas: this is the integration point for Aiden's API. Each operation
 * is either wired to an HTTP call in ./httpClient.ts or calls
 * `notConnected(...)`, which rejects with NotImplementedError until an
 * endpoint exists. docs/frontend/BACKEND-INTEGRATION.md lists every
 * operation, the shape the UI expects, and which Figma screen uses it.
 */
function notConnected(operation: keyof DataService): Promise<never> {
  return Promise.reject(new NotImplementedError(operation));
}

export const apiDataService: DataService = {
  // Wired to the Sprint 2 endpoints captured from the team's test harness.
  createReport: http.createReport,
  getStatus: http.getStatus,
  staffLogin: http.staffLogin,
  getAuditorCases: http.getAuditorCases,
  getAuditorCaseDetail: http.getAuditorCaseDetail,
  resolveCase: http.resolveCase,
  getManagerDashboard: http.getManagerDashboard,

  // No endpoint yet.
  createLinkReport: () => notConnected("createLinkReport"),
  createScreenshotReport: () => notConnected("createScreenshotReport"),
  addCaseInformation: () => notConnected("addCaseInformation"),
  requestStatusUpdates: () => notConnected("requestStatusUpdates"),
  getMyWellbeing: () => notConnected("getMyWellbeing"),
  acknowledgeContentWarning: () => notConnected("acknowledgeContentWarning"),
  declineCase: () => notConnected("declineCase"),
  recordExposure: () => notConnected("recordExposure"),
  triggerSos: () => notConnected("triggerSos"),
  requestWellbeingSupport: () => notConnected("requestWellbeingSupport"),

  // Manager — no endpoints yet.
  getAuditorOverview: () => notConnected("getAuditorOverview"),
  getSosSummary: () => notConnected("getSosSummary"),
  getAuditorDetail: () => notConnected("getAuditorDetail"),
  setExposureLimit: () => notConnected("setExposureLimit"),
  approveBreakRequest: () => notConnected("approveBreakRequest"),
  getCaseOversight: () => notConnected("getCaseOversight"),
  listSosAlerts: () => notConnected("listSosAlerts"),
  getSosAlert: () => notConnected("getSosAlert"),
  acknowledgeSosAlert: () => notConnected("acknowledgeSosAlert"),
  logSosFollowUp: () => notConnected("logSosFollowUp"),
  listDeclinedCases: () => notConnected("listDeclinedCases"),
  getManagerCaseReview: () => notConnected("getManagerCaseReview"),
  getReassignmentContext: () => notConnected("getReassignmentContext"),
  reassignCase: () => notConnected("reassignCase"),
  closeWithoutReassignment: () => notConnected("closeWithoutReassignment"),
  getCaseForExceptionalAccess: () => notConnected("getCaseForExceptionalAccess"),
  recordExceptionalAccess: () => notConnected("recordExceptionalAccess"),
  getValidationSummary: () => notConnected("getValidationSummary"),
};
