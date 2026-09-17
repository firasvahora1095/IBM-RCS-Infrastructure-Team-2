import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ManagerOversightDashboardPage } from "./ManagerOversightDashboardPage";
import * as apiClient from "../../api/client";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/manager"]}>
      <ManagerOversightDashboardPage />
    </MemoryRouter>
  );
}

describe("ManagerOversightDashboardPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem("rcs_staff_token", "m1");
    sessionStorage.setItem("rcs_staff_role", "manager");
    sessionStorage.setItem("rcs_staff_id", "manager-1");
    vi.restoreAllMocks();
  });

  it("labels itself as a scaffold, per Task 96's honesty requirement", async () => {
    vi.spyOn(apiClient, "getManagerDashboard").mockResolvedValueOnce({ auditors: [], pending_declined_cases: 0 });
    renderPage();

    expect(screen.getByText("Scaffold — per-Auditor exposure tracking ships in Sprint 3")).toBeInTheDocument();
    expect(await screen.findByText(/No auditor workload data is available yet/)).toBeInTheDocument();
    expect(screen.getByText("Pending declined cases:")).toBeInTheDocument();
  });

  it("never shows invented exposure, cooldown or SOS figures", async () => {
    vi.spyOn(apiClient, "getManagerDashboard").mockResolvedValueOnce({ auditors: [], pending_declined_cases: 2 });
    renderPage();

    expect(await screen.findByText("2")).toBeInTheDocument();
    expect(screen.queryByText(/\/ 120 min/)).not.toBeInTheDocument();
    expect(screen.queryByText(/SOS alert/)).not.toBeInTheDocument();
    expect(screen.queryByText(/min left/)).not.toBeInTheDocument();
  });
});
