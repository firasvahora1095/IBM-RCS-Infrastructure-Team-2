import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditorCaseDetailPage } from "./AuditorCaseDetailPage";
import * as apiClient from "../../api/client";
import type { AuditorCaseDetail } from "../../api/types";

const MOCK_CASE: AuditorCaseDetail = {
  case_id: "AR-2026-00417",
  status: "READY_FOR_REVIEW",
  watson_severity_score: 71,
  effective_severity_score: 71,
  severity_tier: "S3",
  narrative_summary: "The video shows a physical altercation between two individuals beginning at 00:42.",
  incident_timeline: [{ start: 42, end: 75, severity_tier: "S3" }],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/auditor/cases/AR-2026-00417"]}>
      <Routes>
        <Route path="/auditor/cases/:caseId" element={<AuditorCaseDetailPage />} />
        <Route path="/auditor" element={<div>Case queue page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

/** Carbon's Slider pairs its track with a number input; typing there is how a user sets an exact rating. */
function setRating(value: number) {
  const input = screen.getByRole("spinbutton");
  fireEvent.change(input, { target: { value: String(value) } });
  fireEvent.blur(input);
}

async function goToSeverityStep() {
  await screen.findByText(/physical altercation between two individuals/);
  fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
}

describe("AuditorCaseDetailPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem("rcs_staff_token", "abc123");
    sessionStorage.setItem("rcs_staff_role", "auditor");
    sessionStorage.setItem("rcs_staff_id", "auditor-1");
    vi.restoreAllMocks();
  });

  it("shows the severity, narrative summary and timeline from the real API shape", async () => {
    vi.spyOn(apiClient, "getAuditorCaseDetail").mockResolvedValueOnce(MOCK_CASE);
    renderPage();

    expect(await screen.findByText(/physical altercation between two individuals/)).toBeInTheDocument();
    expect(screen.getByText("CVI 71 / 100")).toBeInTheDocument();
    expect(screen.getAllByText("S3 · High").length).toBeGreaterThan(0);
    expect(screen.getByText("00:42–01:15")).toBeInTheDocument();
    expect(apiClient.getAuditorCaseDetail).toHaveBeenCalledWith("AR-2026-00417", "abc123");
  });

  it("doesn't offer a review while AI analysis is still running", async () => {
    vi.spyOn(apiClient, "getAuditorCaseDetail").mockResolvedValueOnce({
      ...MOCK_CASE,
      status: "AI_PROCESSING",
      effective_severity_score: null,
      watson_severity_score: null,
      severity_tier: null,
      narrative_summary: null,
      incident_timeline: null,
    });
    renderPage();

    expect(await screen.findByText("AI analysis is still in progress.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue to review" })).not.toBeInTheDocument();
  });

  it("requires an explicit outcome, and a comment only when the rating differs from the AI's", async () => {
    vi.spyOn(apiClient, "getAuditorCaseDetail").mockResolvedValueOnce(MOCK_CASE);
    renderPage();
    await goToSeverityStep();

    const submit = () => screen.getByRole("button", { name: "Continue to submit" });

    // Nothing is pre-selected, so an outcome must be chosen first.
    expect(submit()).toBeDisabled();
    expect(screen.getByText("Choose a final case outcome to continue.")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Policy Violation Found"));
    expect(submit()).toBeEnabled();

    // Override the AI's 71 — now a comment is required (UAT check #5).
    setRating(88);
    expect(screen.getByText("Your rating: 88 / 100")).toBeInTheDocument();
    expect(screen.getByText("S4 · Critical")).toBeInTheDocument();
    expect(submit()).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/required — you changed the AI/), {
      target: { value: "Weapon clearly used to threaten, not just present." },
    });
    expect(submit()).toBeEnabled();
  });

  it("sends the RT-01 outcome value and shows the Sprint 2 confirmation copy", async () => {
    vi.spyOn(apiClient, "getAuditorCaseDetail").mockResolvedValueOnce(MOCK_CASE);
    vi.spyOn(apiClient, "resolveCase").mockResolvedValueOnce({
      case_id: "AR-2026-00417",
      status: "Complete",
      final_outcome: "POLICY_VIOLATION_FOUND",
    });
    renderPage();
    await goToSeverityStep();

    fireEvent.click(screen.getByLabelText("Policy Violation Found"));
    fireEvent.click(screen.getByRole("button", { name: "Continue to submit" }));

    expect(await screen.findByText("This case has been marked Complete.")).toBeInTheDocument();
    expect(apiClient.resolveCase).toHaveBeenCalledWith(
      "AR-2026-00417",
      "abc123",
      "POLICY_VIOLATION_FOUND",
      undefined, // rating unchanged, so no override score is sent
      undefined // and no comment
    );
    expect(screen.getByText("Final case outcome selected: Policy Violation Found")).toBeInTheDocument();
    expect(screen.getByText("Comment attached: no")).toBeInTheDocument();
    // Sprint 2 behaviour: straight to Complete, no manager review queue.
    expect(screen.queryByText(/manager's review queue/)).not.toBeInTheDocument();
  });

  it("sends the override score and comment together when the rating was changed", async () => {
    vi.spyOn(apiClient, "getAuditorCaseDetail").mockResolvedValueOnce(MOCK_CASE);
    vi.spyOn(apiClient, "resolveCase").mockResolvedValueOnce({
      case_id: "AR-2026-00417",
      status: "Complete",
      final_outcome: "POLICY_VIOLATION_FOUND",
    });
    renderPage();
    await goToSeverityStep();

    setRating(88);
    fireEvent.change(screen.getByLabelText(/required — you changed the AI/), {
      target: { value: "  Weapon used to threaten.  " },
    });
    fireEvent.click(screen.getByLabelText("Policy Violation Found"));
    fireEvent.click(screen.getByRole("button", { name: "Continue to submit" }));

    await waitFor(() =>
      expect(apiClient.resolveCase).toHaveBeenCalledWith(
        "AR-2026-00417",
        "abc123",
        "POLICY_VIOLATION_FOUND",
        88,
        "Weapon used to threaten."
      )
    );
  });

  it("shows the backend's reason if a submission is rejected", async () => {
    vi.spyOn(apiClient, "getAuditorCaseDetail").mockResolvedValueOnce(MOCK_CASE);
    vi.spyOn(apiClient, "resolveCase").mockRejectedValueOnce(
      new (await import("../../api/types")).ApiError("A comment is required when overriding the AI severity score", 400)
    );
    renderPage();
    await goToSeverityStep();

    fireEvent.click(screen.getByLabelText("No Violation Found"));
    fireEvent.click(screen.getByRole("button", { name: "Continue to submit" }));

    expect(
      await screen.findByText("A comment is required when overriding the AI severity score")
    ).toBeInTheDocument();
  });
});
