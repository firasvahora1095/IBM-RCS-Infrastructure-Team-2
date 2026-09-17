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
 *   "/manager"           — Manager dashboard scaffold (manager role only)
 *   "/manager/cases"     — Manager case oversight scaffold (manager role only)
 *
 * Staff pages render their own header (Auditor/Manager variants), because
 * it needs the logged-in staff ID and sign-out, which public pages must
 * never have.
 */
export default function App() {
  return (
    <BrowserRouter>
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
          path="/manager/cases"
          element={
            <ProtectedRoute allowedRole="manager">
              <ManagerCaseOversightPage />
            </ProtectedRoute>
          }
        />
        {/* An unknown URL (e.g. a mistyped link) lands on the public start
            page instead of rendering a blank screen. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
