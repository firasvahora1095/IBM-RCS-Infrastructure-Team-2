import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditorDashboardPage } from "./AuditorDashboardPage";
import * as services from "../../services";
import { ApiError } from "../../services/types";

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
    vi.spyOn(services, "getAuditorCases").mockResolvedValueOnce([
      { case_id: "AR-2026-00417", status: "READY_FOR_REVIEW", severity_tier: "S3" },
      { case_id: "AR-2026-00418", status: "AI_PROCESSING", severity_tier: null },
    ]);
    renderPage();

    expect(await screen.findByText("AR-2026-00417")).toBeInTheDocument();
    expect(screen.getByText("S3 · High")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ready for review" })).toBeInTheDocument();
    expect(screen.getByText("AI analysis in progress")).toBeInTheDocument();
    expect(services.getAuditorCases).toHaveBeenCalledWith("abc123");
  });

  it("only lets the Auditor open cases the AI has finished analysing", async () => {
    vi.spyOn(services, "getAuditorCases").mockResolvedValueOnce([
      { case_id: "AR-2026-00418", status: "AI_PROCESSING", severity_tier: null },
    ]);
    renderPage();

    fireEvent.click(await screen.findByText("AR-2026-00418"));
    expect(screen.queryByText("Case detail page")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "AI analysis in progress" })).not.toBeInTheDocument();
  });

  it("says Unknown for a case whose AI analysis failed, never a blank severity (AR-AI-10)", async () => {
    vi.spyOn(services, "getAuditorCases").mockResolvedValueOnce([
      { case_id: "AR-2026-00421", status: "READY_FOR_REVIEW", severity_tier: null },
      { case_id: "AR-2026-00418", status: "AI_PROCESSING", severity_tier: null },
    ]);
    renderPage();

    expect(await screen.findByText("AR-2026-00421")).toBeInTheDocument();
    // Only the failed case says Unknown; a case still processing has no severity yet.
    expect(screen.getAllByText("Unknown")).toHaveLength(1);
    expect(screen.getByText("No severity yet")).toBeInTheDocument();
  });

  it("opens a ready case from its row", async () => {
    vi.spyOn(services, "getAuditorCases").mockResolvedValueOnce([
      { case_id: "AR-2026-00417", status: "READY_FOR_REVIEW", severity_tier: "S3" },
    ]);
    renderPage();

    fireEvent.click(await screen.findByText("AR-2026-00417"));
    expect(screen.getByText("Case detail page")).toBeInTheDocument();
  });

  it("shows the Figma empty state when there are no assigned cases (36:146)", async () => {
    vi.spyOn(services, "getAuditorCases").mockResolvedValueOnce([]);
    renderPage();
    expect(
      await screen.findByText("No cases assigned right now — new cases are assigned automatically as they come in."),
    ).toBeInTheDocument();
  });

  it("shows how long ago each case was assigned, when the data source provides it", async () => {
    vi.spyOn(services, "getAuditorCases").mockResolvedValueOnce([
      {
        case_id: "AR-2026-00417",
        status: "READY_FOR_REVIEW",
        severity_tier: "S3",
        assigned_at: new Date(Date.now() - 9 * 60_000).toISOString(),
      },
    ]);
    renderPage();
    expect(await screen.findByText("9 min ago")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Assigned" })).toBeInTheDocument();
  });

  it("locks reviewable cases and pauses assignments during a cooldown (36:189)", async () => {
    vi.spyOn(services, "getMyWellbeing").mockResolvedValue({
      exposure_minutes_today: 62,
      exposure_limit_minutes: 120,
      cooldown: { ends_at: new Date(Date.now() + 10 * 60_000).toISOString(), trigger: "S3", requires_check_in: false },
    });
    vi.spyOn(services, "getAuditorCases").mockResolvedValueOnce([
      { case_id: "AR-2026-00417", status: "READY_FOR_REVIEW", severity_tier: "S3" },
    ]);
    renderPage();

    expect(await screen.findByText("Cooldown in progress — new assignments paused.")).toBeInTheDocument();
    expect(await screen.findByText("Locked during cooldown")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ready for review" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("AR-2026-00417"));
    expect(screen.queryByText("Case detail page")).not.toBeInTheDocument();
  });

  it("shows the non-punitive limit banner at the daily exposure limit (34:121)", async () => {
    vi.spyOn(services, "getMyWellbeing").mockResolvedValue({
      exposure_minutes_today: 120,
      exposure_limit_minutes: 120,
      cooldown: null,
    });
    vi.spyOn(services, "getAuditorCases").mockResolvedValueOnce([]);
    renderPage();

    expect(await screen.findByText("You've reached today's exposure limit.")).toBeInTheDocument();
    expect(screen.getAllByText("120 / 120 min today").length).toBeGreaterThan(0);
  });

  it("returns to login when the backend no longer recognises the session", async () => {
    vi.spyOn(services, "getAuditorCases").mockRejectedValueOnce(new ApiError("Not authenticated", 401));
    renderPage();
    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(sessionStorage.getItem("rcs_staff_token")).toBeNull();
  });
});
