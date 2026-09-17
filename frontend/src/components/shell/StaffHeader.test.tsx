import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import { StaffHeader } from "./StaffHeader";

describe("StaffHeader", () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem("rcs_staff_token", "abc");
    sessionStorage.setItem("rcs_staff_role", "auditor");
    sessionStorage.setItem("rcs_staff_id", "auditor-1");
  });

  it("shows the role and the logged-in staff ID", () => {
    render(
      <MemoryRouter>
        <StaffHeader role="auditor" />
      </MemoryRouter>,
    );
    expect(screen.getByText("RCS — Auditor")).toBeInTheDocument();
    expect(screen.getByText("Auditor: auditor-1")).toBeInTheDocument();
  });

  it("clears the session and returns to login on Sign out", () => {
    render(
      <MemoryRouter initialEntries={["/auditor"]}>
        <Routes>
          <Route path="/auditor" element={<StaffHeader role="auditor" />} />
          <Route path="/staff/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(sessionStorage.getItem("rcs_staff_token")).toBeNull();
  });
});
