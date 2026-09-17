import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditorCaseDetailPage } from "./AuditorCaseDetailPage";
import * as services from "../../services";
import { ApiError, type AuditorCaseDetail } from "../../services/types";

const MOCK_CASE: AuditorCaseDetail = {
  case_id: "AR-2026-00417",
  status: "READY_FOR_REVIEW",
  watson_severity_score: 71,
  effective_severity_score: 71,
  severity_tier: "S3",
  narrative_summary: "The video shows a physical altercation between two individuals beginning at 00:42.",
  incident_timeline: [{ start: 42, end: 75, severity_tier: "S3", tag: "weapon_present" }],
  flag_reason: "Graphic violence",
};

const AI_FAILED_CASE: AuditorCaseDetail = {
  ...MOCK_CASE,
  case_id: "AR-2026-00421",
  watson_severity_score: null,
  effective_severity_score: null,
  severity_tier: null,
  narrative_summary: null,
  incident_timeline: null,
  ai_failure: "vision",
  flag_reason: null,
};

function renderPage(caseId = "AR-2026-00417") {
  return render(
    <MemoryRouter initialEntries={[`/auditor/cases/${caseId}`]}>
      <Routes>
        <Route path="/auditor/cases/:caseId" element={<AuditorCaseDetailPage />} />
        <Route path="/auditor" element={<div>Case queue page</div>} />
        <Route path="/auditor/cooldown" element={<div>Cooldown page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Carbon's Slider pairs its track with a number input; typing there is how a user sets an exact rating. */
function setRating(value: number) {
  const input = screen.getByRole("spinbutton", { name: /CVI rating/ });
  fireEvent.change(input, { target: { value: String(value) } });
  fireEvent.blur(input);
}

/** The content warning (Figma 16:19): consent, then Proceed. */
async function passContentWarning() {
  fireEvent.click(await screen.findByLabelText(/I understand this content may be disturbing/));
  fireEvent.click(screen.getByRole("button", { name: "Proceed" }));
}

async function openWorkspace() {
  await passContentWarning();
  await screen.findByText(/physical altercation between two individuals/);
  fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
  await screen.findByRole("button", { name: /^SOS/ });
}

async function goToSeverityStep() {
  await openWorkspace();
  fireEvent.click(screen.getByRole("button", { name: "Continue to severity & comment" }));
  await screen.findByRole("heading", { name: "Severity & comment" });
}

describe("AuditorCaseDetailPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem("rcs_staff_token", "abc123");
    sessionStorage.setItem("rcs_staff_role", "auditor");
    sessionStorage.setItem("rcs_staff_id", "auditor-1");
    vi.restoreAllMocks();
    vi.spyOn(services, "acknowledgeContentWarning").mockResolvedValue({ acknowledged: true });
    vi.spyOn(services, "recordExposure").mockResolvedValue({ recorded: true });
    vi.spyOn(services, "getMyWellbeing").mockResolvedValue({
      exposure_minutes_today: 62,
      exposure_limit_minutes: 120,
      cooldown: null,
    });
  });

  it("shows the content warning before anything from the case, with Proceed gated by consent (AR-PV-01/08)", async () => {
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValueOnce(MOCK_CASE);
    renderPage();

    expect(await screen.findByText("Graphic violence")).toBeInTheDocument();
    expect(screen.getByText("weapon_present")).toBeInTheDocument();
    expect(screen.queryByText(/physical altercation between two individuals/)).not.toBeInTheDocument();

    const proceed = screen.getByRole("button", { name: "Proceed" });
    expect(proceed).toBeDisabled();
    // Declining never needs consent.
    expect(screen.getByRole("button", { name: "Decline" })).toBeEnabled();

    await passContentWarning();
    expect(await screen.findByText(/physical altercation between two individuals/)).toBeInTheDocument();
    expect(services.acknowledgeContentWarning).toHaveBeenCalledWith("AR-2026-00417", "abc123");
  });

  it("shows the severity, narrative summary and timeline from the real API shape", async () => {
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValueOnce(MOCK_CASE);
    renderPage();
    await passContentWarning();

    expect(await screen.findByText(/physical altercation between two individuals/)).toBeInTheDocument();
    expect(screen.getByText("CVI 71 / 100")).toBeInTheDocument();
    expect(screen.getAllByText("S3 · High").length).toBeGreaterThan(0);
    expect(screen.getByText("00:42–01:15")).toBeInTheDocument();
    expect(services.getAuditorCaseDetail).toHaveBeenCalledWith("AR-2026-00417", "abc123");
  });

  it("doesn't offer a review while AI analysis is still running", async () => {
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValueOnce({
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
    expect(screen.queryByRole("button", { name: "Proceed" })).not.toBeInTheDocument();
  });

  it("declines with a structured reason and routes the case to the Manager (Figma 25:137 → 25:353)", async () => {
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValueOnce(MOCK_CASE);
    const decline = vi.spyOn(services, "declineCase").mockResolvedValueOnce({ declined: true });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Decline" }));
    const submit = await screen.findByRole("button", { name: "Submit decline" });
    // AR-DF-03: nothing pre-selected.
    expect(submit).toBeDisabled();
    const reasons = screen.getAllByRole("radio").map((r) => r.closest("div")?.textContent);
    expect(reasons).toEqual([
      "Content more severe than AI indicated",
      "Near my exposure limit",
      "Personal Trigger",
      "Other",
    ]);

    fireEvent.click(screen.getByLabelText("Personal Trigger"));
    fireEvent.click(submit);

    expect(await screen.findByText("Case declined:")).toBeInTheDocument();
    expect(decline).toHaveBeenCalledWith("AR-2026-00417", "abc123", "PERSONAL_TRIGGER", "");
    expect(screen.queryByText(/physical altercation/)).not.toBeInTheDocument();
    expect(services.acknowledgeContentWarning).not.toHaveBeenCalled();
  });

  it("opens an AI-failure case at maximum blur with no summary, and needs the Auditor's own rating (AR-AI-10)", async () => {
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValueOnce(AI_FAILED_CASE);
    renderPage("AR-2026-00421");

    expect(await screen.findByText("Severity unknown — AI analysis unavailable for this case")).toBeInTheDocument();
    await passContentWarning();

    // Straight into the workspace: no summary, no way back to one.
    expect(await screen.findByRole("slider", { name: "Blur intensity" })).toHaveAttribute("aria-valuenow", "100");
    expect(screen.queryByRole("button", { name: /Back to AI Analysis Summary/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue to severity & comment" }));
    fireEvent.click(await screen.findByLabelText("No Violation Found"));
    expect(screen.getByText("Set your CVI rating to continue.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to submit" })).toBeDisabled();

    setRating(30);
    expect(screen.getByRole("button", { name: "Continue to submit" })).toBeEnabled();
  });

  it("hides the content immediately on SOS, then confirms the manager was notified (AR-WB-09, Figma 31:257)", async () => {
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValueOnce(MOCK_CASE);
    let resolveSos: (value: Awaited<ReturnType<typeof services.triggerSos>>) => void = () => {};
    vi.spyOn(services, "triggerSos").mockReturnValueOnce(new Promise((resolve) => (resolveSos = resolve)));
    renderPage();
    await openWorkspace();

    fireEvent.click(screen.getByRole("button", { name: /^SOS/ }));
    // Protected state before the network has answered.
    expect(screen.getByText("Case paused — content hidden")).toBeInTheDocument();
    expect(screen.queryByRole("slider", { name: "Blur intensity" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

    resolveSos({
      cooldown: { ends_at: new Date(Date.now() + 30 * 60_000).toISOString(), trigger: "SOS", requires_check_in: true },
    });
    expect(await screen.findByText("We’ve paused this case and notified your manager.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Cooldown page")).toBeInTheDocument();
  });

  it("requires an explicit outcome, and a comment only when the rating differs from the AI's", async () => {
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValueOnce(MOCK_CASE);
    renderPage();
    await goToSeverityStep();

    const submit = () => screen.getByRole("button", { name: "Continue to submit" });

    expect(submit()).toBeDisabled();
    expect(screen.getByText("Choose a final case outcome to continue.")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Policy Violation Found"));
    expect(submit()).toBeEnabled();

    setRating(88);
    expect(screen.getByText("Your rating: 88 / 100")).toBeInTheDocument();
    expect(screen.getByText("S4 · Critical")).toBeInTheDocument();
    expect(submit()).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/required — you changed the AI/), {
      target: { value: "Weapon clearly used to threaten, not just present." },
    });
    expect(submit()).toBeEnabled();
  });

  it("sends the RT-01 outcome value and shows the confirmation copy", async () => {
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValueOnce(MOCK_CASE);
    vi.spyOn(services, "resolveCase").mockResolvedValueOnce({
      case_id: "AR-2026-00417",
      status: "Complete",
      final_outcome: "POLICY_VIOLATION_FOUND",
    });
    renderPage();
    await goToSeverityStep();

    fireEvent.click(screen.getByLabelText("Policy Violation Found"));
    fireEvent.click(screen.getByRole("button", { name: "Continue to submit" }));

    expect(await screen.findByText("This case has been marked Complete.")).toBeInTheDocument();
    expect(services.resolveCase).toHaveBeenCalledWith(
      "AR-2026-00417",
      "abc123",
      "POLICY_VIOLATION_FOUND",
      undefined, // rating unchanged, so no override score is sent
      undefined, // and no comment
    );
    expect(screen.getByText("Final case outcome selected: Policy Violation Found")).toBeInTheDocument();
    expect(screen.getByText("Comment attached: no")).toBeInTheDocument();
    expect(screen.queryByText("A cooldown starts now.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Case queue page")).toBeInTheDocument();
  });

  it("sends a high-severity submission on to its cooldown (AR-WB-12)", async () => {
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValueOnce(MOCK_CASE);
    vi.spyOn(services, "resolveCase").mockResolvedValueOnce({
      case_id: "AR-2026-00417",
      status: "Complete",
      final_outcome: "POLICY_VIOLATION_FOUND",
      cooldown: { ends_at: new Date(Date.now() + 15 * 60_000).toISOString(), trigger: "S3", requires_check_in: false },
    });
    renderPage();
    await goToSeverityStep();

    fireEvent.click(screen.getByLabelText("Policy Violation Found"));
    fireEvent.click(screen.getByRole("button", { name: "Continue to submit" }));

    expect(await screen.findByText("A cooldown starts now.")).toBeInTheDocument();
    expect(screen.getByText(/a 15-minute cooldown applies/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Cooldown page")).toBeInTheDocument();
  });

  it("sends the override score and comment together when the rating was changed", async () => {
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValueOnce(MOCK_CASE);
    vi.spyOn(services, "resolveCase").mockResolvedValueOnce({
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
      expect(services.resolveCase).toHaveBeenCalledWith(
        "AR-2026-00417",
        "abc123",
        "POLICY_VIOLATION_FOUND",
        88,
        "Weapon used to threaten.",
      ),
    );
  });

  it("shows the backend's reason if a submission is rejected", async () => {
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValueOnce(MOCK_CASE);
    vi.spyOn(services, "resolveCase").mockRejectedValueOnce(
      new ApiError("A comment is required when overriding the AI severity score", 400),
    );
    renderPage();
    await goToSeverityStep();

    fireEvent.click(screen.getByLabelText("No Violation Found"));
    fireEvent.click(screen.getByRole("button", { name: "Continue to submit" }));

    expect(await screen.findByText("A comment is required when overriding the AI severity score")).toBeInTheDocument();
  });

  it("keeps the form filled in and offers Retry submit when sending fails (Figma 42:405)", async () => {
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValueOnce(MOCK_CASE);
    vi.spyOn(services, "resolveCase").mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderPage();
    await goToSeverityStep();

    setRating(88);
    fireEvent.change(screen.getByLabelText(/required — you changed the AI/), { target: { value: "Weapon used." } });
    fireEvent.click(screen.getByLabelText("Policy Violation Found"));
    fireEvent.click(screen.getByRole("button", { name: "Continue to submit" }));

    expect(await screen.findByText("Couldn't submit — check your connection and try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry submit" })).toBeEnabled();
    expect(screen.getByLabelText(/required — you changed the AI/)).toHaveValue("Weapon used.");
    expect(screen.getByText("Your rating: 88 / 100")).toBeInTheDocument();
  });

  it("re-authenticates in place when the session times out, keeping the review (Figma 36:235)", async () => {
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValueOnce(MOCK_CASE);
    vi.spyOn(services, "resolveCase").mockRejectedValueOnce(new ApiError("Not authenticated", 401));
    const login = vi.spyOn(services, "staffLogin").mockResolvedValueOnce({ token: "fresh-token", role: "auditor" });
    renderPage();
    await goToSeverityStep();

    fireEvent.change(screen.getByLabelText("Comment (optional)"), { target: { value: "Consistent with AI." } });
    fireEvent.click(screen.getByLabelText("No Violation Found"));
    fireEvent.click(screen.getByRole("button", { name: "Continue to submit" }));

    const dialog = await screen.findByRole("dialog", { name: "Your session has timed out" });
    fireEvent.change(within(dialog).getByLabelText("Password"), { target: { value: "testpassword123" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Log in to continue" }));

    await waitFor(() => expect(login).toHaveBeenCalledWith("auditor-1", "testpassword123"));
    await waitFor(() => expect(sessionStorage.getItem("rcs_staff_token")).toBe("fresh-token"));
    expect(screen.getByLabelText("Comment (optional)")).toHaveValue("Consistent with AI.");
    expect(screen.getByLabelText("No Violation Found")).toBeChecked();
  });

  it("survives a round-trip to another screen and back, behind the content warning again (Task 102, AR-PV-08)", async () => {
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValue(MOCK_CASE);

    const { unmount } = renderPage();
    await goToSeverityStep();
    setRating(88);
    fireEvent.change(screen.getByLabelText(/required — you changed the AI/), {
      target: { value: "Weapon clearly used to threaten, not just present." },
    });
    fireEvent.click(screen.getByLabelText("Policy Violation Found"));

    unmount();
    renderPage();

    // The warning comes first again, then the saved step with everything restored.
    await passContentWarning();
    expect(await screen.findByText("Your rating: 88 / 100")).toBeInTheDocument();
    expect(screen.getByLabelText(/required — you changed the AI/)).toHaveValue(
      "Weapon clearly used to threaten, not just present.",
    );
    expect(screen.getByLabelText("Policy Violation Found")).toBeChecked();
  });

  it("doesn't keep a draft once the case has been submitted", async () => {
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValue(MOCK_CASE);
    vi.spyOn(services, "resolveCase").mockResolvedValueOnce({
      case_id: "AR-2026-00417",
      status: "Complete",
      final_outcome: "NO_VIOLATION_FOUND",
    });

    renderPage();
    await goToSeverityStep();
    fireEvent.click(screen.getByLabelText("No Violation Found"));
    fireEvent.click(screen.getByRole("button", { name: "Continue to submit" }));
    await screen.findByText("This case has been marked Complete.");

    expect(sessionStorage.getItem("rcs_draft_resolution_AR-2026-00417")).toBeNull();
  });

  it("keeps the slider and the recorded rating in sync while a rating is typed key by key", async () => {
    // Guards key-by-key entry of a rating. In a real browser, typing "90" once
    // left the slider at 9 while the page recorded 90; jsdom doesn't reproduce
    // that timing race (the fix was verified in Chrome), but this still catches
    // a broken or disconnected slider-to-page update path.
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValueOnce(MOCK_CASE);
    const user = userEvent.setup();
    renderPage();
    await goToSeverityStep();

    const input = screen.getByRole("spinbutton", { name: /CVI rating/ });
    await user.clear(input);
    await user.type(input, "90");
    await user.tab();

    await waitFor(() => expect(screen.getByText("Your rating: 90 / 100")).toBeInTheDocument());
    expect(screen.getByRole("slider", { name: /CVI rating/ })).toHaveAttribute("aria-valuenow", "90");
    expect(input).toHaveValue(90);
  });
});
