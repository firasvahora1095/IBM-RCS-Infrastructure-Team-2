import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AppHeader } from "./components/shell/AppHeader";
import { ProtectedRoute } from "./components/shell/ProtectedRoute";
import { UploadPage } from "./pages/normal-user/UploadPage";
import { CaseIdConfirmationPage } from "./pages/normal-user/CaseIdConfirmationPage";
import { StatusLookupPage } from "./pages/normal-user/StatusLookupPage";
import { StaffLoginPage } from "./pages/staff/StaffLoginPage";
import { AuditorDashboardPage } from "./pages/auditor/AuditorDashboardPage";
import { ManagerOversightDashboardPage } from "./pages/manager/ManagerOversightDashboardPage";

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
 *   "/manager"           — Manager dashboard (manager role only)
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
          path="/manager"
          element={
            <ProtectedRoute allowedRole="manager">
              <ManagerOversightDashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
