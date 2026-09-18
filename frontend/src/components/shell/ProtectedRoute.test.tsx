import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";

function renderProtected(startPath: string) {
  return render(
    <MemoryRouter initialEntries={[startPath]}>
      <Routes>
        <Route path="/staff/login" element={<div>Login page</div>} />
        <Route path="/manager" element={<div>Manager page</div>} />
        <Route
          path="/auditor"
          element={
            <ProtectedRoute allowedRole="auditor">
              <div>Auditor dashboard content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => sessionStorage.clear());

  it("redirects to login when not logged in", () => {
    renderProtected("/auditor");
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects a manager away from the auditor route", () => {
    sessionStorage.setItem("rcs_staff_token", "abc");
    sessionStorage.setItem("rcs_staff_role", "manager");
    renderProtected("/auditor");
    expect(screen.getByText("Manager page")).toBeInTheDocument();
  });

  it("shows the protected content for the correct role", () => {
    sessionStorage.setItem("rcs_staff_token", "abc");
    sessionStorage.setItem("rcs_staff_role", "auditor");
    renderProtected("/auditor");
    expect(screen.getByText("Auditor dashboard content")).toBeInTheDocument();
  });

  it("doesn't restore access after logout, e.g. when pressing Back", () => {
    sessionStorage.setItem("rcs_staff_token", "abc");
    sessionStorage.setItem("rcs_staff_role", "auditor");
    const { unmount } = renderProtected("/auditor");
    expect(screen.getByText("Auditor dashboard content")).toBeInTheDocument();
    unmount();

    // Logging out clears storage; Back re-mounts the protected route.
    sessionStorage.clear();
    renderProtected("/auditor");
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});
