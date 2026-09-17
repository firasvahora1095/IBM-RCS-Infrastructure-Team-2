import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { AppHeader } from "./components/shell/AppHeader";
import { ProtectedRoute } from "./components/shell/ProtectedRoute";
import { UploadPage } from "./pages/normal-user/UploadPage";
import { CaseIdConfirmationPage } from "./pages/normal-user/CaseIdConfirmationPage";
import { StatusLookupPage } from "./pages/normal-user/StatusLookupPage";
import { StaffLoginPage } from "./pages/staff/StaffLoginPage";
import { AuditorDashboardPage } from "./pages/auditor/AuditorDashboardPage";
import { AuditorCaseDetailPage } from "./pages/auditor/AuditorCaseDetailPage";
import { CooldownPage } from "./pages/auditor/CooldownPage";
import { ManagerOversightDashboardPage } from "./pages/manager/ManagerOversightDashboardPage";
import { ManagerCaseOversightPage } from "./pages/manager/ManagerCaseOversightPage";
import { ManagerAuditorDetailPage } from "./pages/manager/ManagerAuditorDetailPage";
import { ManagerSosInboxPage } from "./pages/manager/ManagerSosInboxPage";
import { ManagerSosAlertPage } from "./pages/manager/ManagerSosAlertPage";
import { ManagerSosFollowUpPage } from "./pages/manager/ManagerSosFollowUpPage";
import { ManagerDeclinedQueuePage } from "./pages/manager/ManagerDeclinedQueuePage";
import { ManagerCaseReviewPage } from "./pages/manager/ManagerCaseReviewPage";
import { ManagerReassignmentPage } from "./pages/manager/ManagerReassignmentPage";
import { ManagerExceptionalAccessPage } from "./pages/manager/ManagerExceptionalAccessPage";
import { ManagerValidationPage } from "./pages/manager/ManagerValidationPage";

/**
 * Public pages share the IBM Content Safety Reporting header through this
 * layout route. It stays mounted while moving between public pages, so the
 * header doesn't flicker on navigation.
 */
function PublicLayout() {
  return (
    <>
      <AppHeader />
      <Outlet />
    </>
  );
}

/**
 * Routes for the Sprint 2 P0 scope (Task 58's five, plus the flow's own
 * confirmation step):
 *   "/"                  — public upload (no account needed)
 *   "/case-confirmation" — public case ID confirmation after an upload
 *   "/status"            — public status lookup by Case ID
 *   "/staff/login"       — shared staff login; no header, matching Figma
 *   "/auditor"           — Auditor dashboard (auditor role only)
 *   "/auditor/cases/:id" — Auditor case review: content warning → summary → workspace → severity → confirmation
 *   "/auditor/cooldown"  — Auditor cooldown after a high-severity case or SOS
 *   "/manager"                          — Oversight Dashboard (manager role only, as are all below)
 *   "/manager/auditors/:auditorId"      — Auditor Detail / exposure limit / check-ins
 *   "/manager/cases"                    — Consolidated Case Oversight
 *   "/manager/cases/:caseId/review"     — Case Review Detail
 *   "/manager/cases/:caseId/reassign"   — Reassignment decision
 *   "/manager/cases/:caseId/raw"        — Exceptional raw-content access
 *   "/manager/sos", "/manager/sos/:alertId", "/manager/sos/:alertId/follow-up" — SOS Inbox, detail, follow-up
 *   "/manager/reassignment"             — Declined / Reassignment Queue
 *   "/manager/validation"               — Validation View (placeholder data)
 *
 * Staff pages render their own header (Auditor/Manager variants), because
 * it needs the logged-in staff ID and sign-out, which public pages must
 * never have.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<UploadPage />} />
        <Route path="/case-confirmation" element={<CaseIdConfirmationPage />} />
        <Route path="/status" element={<StatusLookupPage />} />
      </Route>
      <Route path="/staff/login" element={<StaffLoginPage />} />
      <Route
        path="/auditor"
        element={
          <ProtectedRoute allowedRole="auditor">
            <AuditorDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/auditor/cases/:caseId"
        element={
          <ProtectedRoute allowedRole="auditor">
            <AuditorCaseDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/auditor/cooldown"
        element={
          <ProtectedRoute allowedRole="auditor">
            <CooldownPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerOversightDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/auditors/:auditorId"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerAuditorDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/cases"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerCaseOversightPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/cases/:caseId/review"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerCaseReviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/cases/:caseId/reassign"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerReassignmentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/cases/:caseId/raw"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerExceptionalAccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/sos"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerSosInboxPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/sos/:alertId"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerSosAlertPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/sos/:alertId/follow-up"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerSosFollowUpPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/reassignment"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerDeclinedQueuePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/validation"
        element={
          <ProtectedRoute allowedRole="manager">
            <ManagerValidationPage />
          </ProtectedRoute>
        }
      />
      {/* An unknown URL (e.g. a mistyped link) lands on the public start
            page instead of rendering a blank screen. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** The app: every route, in the browser router. Tests render AppRoutes in a MemoryRouter instead. */
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
