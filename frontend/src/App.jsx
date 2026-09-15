import { BrowserRouter, Route, Routes } from "react-router-dom";
import AuditorPage from "./pages/AuditorPage";
import ManagerPage from "./pages/ManagerPage";
import StaffLoginPage from "./pages/StaffLoginPage";
import StatusPage from "./pages/StatusPage";
import UploadPage from "./pages/UploadPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/staff/login" element={<StaffLoginPage />} />
        <Route path="/auditor" element={<AuditorPage />} />
        <Route path="/manager" element={<ManagerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
