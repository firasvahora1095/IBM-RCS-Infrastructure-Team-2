import type { DataService } from "../types";
import * as http from "./httpClient";

/**
 * The `api` data source — the real backend.
 *
 * For Firas: this is the integration point for Aiden's API. Each function
 * below is either wired to an HTTP call in ./httpClient.ts or calls
 * `notConnected(...)`, which throws NotImplementedError until an endpoint
 * exists. docs/frontend/BACKEND-INTEGRATION.md lists every function, the
 * shape the UI expects, and which Figma screen uses it.
 */
export const apiDataService: DataService = {
  createReport: http.createReport,
  getStatus: http.getStatus,
  staffLogin: http.staffLogin,
  getAuditorCases: http.getAuditorCases,
  getAuditorCaseDetail: http.getAuditorCaseDetail,
  resolveCase: http.resolveCase,
  getManagerDashboard: http.getManagerDashboard,
};
