import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditorDashboardPage } from "./AuditorDashboardPage";
import * as apiClient from "../../api/client";
import { ApiError } from "../../api/types";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/auditor"]}>
      <Routes>
        <Route path="/auditor" element={<AuditorDashboardPage />} />
        <Route path="/auditor/cases/:caseId" element={<div>Case detail page</div>} />
        <Route path="/staff/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AuditorDashboardPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem("rcs_staff_token", "abc123");
    sessionStorage.setItem("rcs_staff_role", "auditor");
    sessionStorage.setItem("rcs_staff_id", "auditor-1");
    vi.restoreAllMocks();
  });

  it("shows each case's severity tag and the Figma status copy", async () => {
    vi.spyOn(apiClient, "getAuditorCases").mockResolvedValueOnce([
      { case_id: "AR-2026-00417", status: "READY_FOR_REVIEW", severity_tier: "S3" },
      { case_id: "AR-2026-00418", status: "AI_PROCESSING", severity_tier: null },
    ]);
    renderPage();

    expect(await screen.findByText("AR-2026-00417")).toBeInTheDocument();
    expect(screen.getByText("S3 · High")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ready for review" })).toBeInTheDocument();
    expect(screen.getByText("AI analysis in progress")).toBeInTheDocument();
    expect(apiClient.getAuditorCases).toHaveBeenCalledWith("abc123");
  });

  it("only lets the Auditor open cases the AI has finished analysing", async () => {
    vi.spyOn(apiClient, "getAuditorCases").mockResolvedValueOnce([
      { case_id: "AR-2026-00418", status: "AI_PROCESSING", severity_tier: null },
    ]);
    renderPage();

    fireEvent.click(await screen.findByText("AR-2026-00418"));
    expect(screen.queryByText("Case detail page")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "AI analysis in progress" })).not.toBeInTheDocument();
  });

  it("opens a ready case from its row", async () => {
    vi.spyOn(apiClient, "getAuditorCases").mockResolvedValueOnce([
      { case_id: "AR-2026-00417", status: "READY_FOR_REVIEW", severity_tier: "S3" },
    ]);
    renderPage();

    fireEvent.click(await screen.findByText("AR-2026-00417"));
    expect(screen.getByText("Case detail page")).toBeInTheDocument();
  });

  it("shows an empty-state message when there are no assigned cases", async () => {
    vi.spyOn(apiClient, "getAuditorCases").mockResolvedValueOnce([]);
    renderPage();
    expect(await screen.findByText("You have no cases assigned right now.")).toBeInTheDocument();
  });

  it("returns to login when the backend no longer recognises the session", async () => {
    vi.spyOn(apiClient, "getAuditorCases").mockRejectedValueOnce(new ApiError("Not authenticated", 401));
    renderPage();
    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(sessionStorage.getItem("rcs_staff_token")).toBeNull();
  });
});
