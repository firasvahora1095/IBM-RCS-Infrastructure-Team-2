import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StaffLoginPage } from "./StaffLoginPage";
import * as services from "../../services";
import { ApiError } from "../../services/types";

function renderPage(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/staff/login", state }]}>
      <Routes>
        <Route path="/staff/login" element={<StaffLoginPage />} />
        <Route path="/auditor" element={<div>Auditor view</div>} />
        <Route path="/manager" element={<div>Manager view</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function submit(staffId: string, password: string) {
  fireEvent.change(screen.getByLabelText("Staff ID"), { target: { value: staffId } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Log in" }));
}

describe("StaffLoginPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows the Figma error copy on invalid credentials instead of the raw API message", async () => {
    vi.spyOn(services, "staffLogin").mockRejectedValueOnce(new ApiError("Invalid credentials", 401));
    renderPage();
    submit("auditor-1", "wrong-password");

    expect(await screen.findByText("Incorrect staff ID or password.")).toBeInTheDocument();
    expect(screen.queryByText("Invalid credentials")).not.toBeInTheDocument();
  });

  it("logs an auditor in and redirects to the auditor view", async () => {
    vi.spyOn(services, "staffLogin").mockResolvedValueOnce({ token: "abc123", role: "auditor" });
    renderPage();
    submit("auditor-1", "testpassword123");

    expect(await screen.findByText("Auditor view")).toBeInTheDocument();
    expect(services.staffLogin).toHaveBeenCalledWith("auditor-1", "testpassword123");
  });

  it("redirects a manager to the manager view", async () => {
    vi.spyOn(services, "staffLogin").mockResolvedValueOnce({ token: "m1", role: "manager" });
    renderPage();
    submit("manager-1", "pw");

    expect(await screen.findByText("Manager view")).toBeInTheDocument();
  });

  it("explains why the user is back on login after their session was rejected", () => {
    renderPage({ sessionEnded: true });
    expect(screen.getByText("Your session has ended.")).toBeInTheDocument();
  });

  it("has no signup path", () => {
    renderPage();
    expect(screen.queryByText(/sign up|create account|register/i)).not.toBeInTheDocument();
  });
});
