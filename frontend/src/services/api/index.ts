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
  createReport: http.createReport,
  getStatus: http.getStatus,
  staffLogin: http.staffLogin,
  getAuditorCases: http.getAuditorCases,
  getAuditorCaseDetail: http.getAuditorCaseDetail,
  resolveCase: http.resolveCase,
  getManagerDashboard: http.getManagerDashboard,

  // Nice-to-have / not planned for MVP.
  createLinkReport: () => notConnected("createLinkReport"),
  createScreenshotReport: () => notConnected("createScreenshotReport"),
  addCaseInformation: () => notConnected("addCaseInformation"),
  requestStatusUpdates: () => notConnected("requestStatusUpdates"),

  // Auditor wellbeing (Sprint 3).
  getMyWellbeing: http.getMyWellbeing,
  acknowledgeContentWarning: http.acknowledgeContentWarning,
  declineCase: http.declineCase,
  recordExposure: http.recordExposure,
  triggerSos: http.triggerSos,
  reportUnexpectedExposure: http.reportUnexpectedExposure,
  requestWellbeingSupport: http.requestWellbeingSupport,

  // Manager (Sprint 3).
  getAuditorOverview: http.getAuditorOverview,
  getSosSummary: http.getSosSummary,
  getAuditorDetail: http.getAuditorDetail,
  setExposureLimit: http.setExposureLimit,
  approveBreakRequest: http.approveBreakRequest,
  getCaseOversight: http.getCaseOversight,
  listSosAlerts: http.listSosAlerts,
  getSosAlert: http.getSosAlert,
  acknowledgeSosAlert: http.acknowledgeSosAlert,
  logSosFollowUp: http.logSosFollowUp,
  listDeclinedCases: http.listDeclinedCases,
  getManagerCaseReview: http.getManagerCaseReview,
  getReassignmentContext: http.getReassignmentContext,
  reassignCase: http.reassignCase,
  closeWithoutReassignment: http.closeWithoutReassignment,
  getCaseForExceptionalAccess: http.getCaseForExceptionalAccess,
  recordExceptionalAccess: http.recordExceptionalAccess,
  getValidationSummary: http.getValidationSummary,
};
