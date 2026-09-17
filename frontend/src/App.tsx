import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppHeader } from "./components/shell/AppHeader";
import { UploadPage } from "./pages/normal-user/UploadPage";
import { StatusLookupPage } from "./pages/normal-user/StatusLookupPage";
import { StaffLoginPage } from "./pages/staff/StaffLoginPage";
import { AuditorDashboardPage } from "./pages/auditor/AuditorDashboardPage";
import { ManagerOversightDashboardPage } from "./pages/manager/ManagerOversightDashboardPage";

/**
 * Five routes, exactly as specified in Sprint 2 Task 58:
 *   "/"            — public upload (the default landing page — no account needed)
 *   "/status"      — public status lookup by Case ID
 *   "/staff/login" — shared login form for both Auditors and Managers
 *   "/auditor"     — Auditor dashboard (protected from Task 7 onward)
 *   "/manager"     — Manager dashboard (protected from Task 7 onward)
 *
 * The header is rendered once here, outside <Routes>, so it persists across
 * every page instead of remounting on each navigation.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AppHeader />
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/status" element={<StatusLookupPage />} />
        <Route path="/staff/login" element={<StaffLoginPage />} />
        <Route path="/auditor" element={<AuditorDashboardPage />} />
        <Route path="/manager" element={<ManagerOversightDashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}
