import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ContentWarningModal } from "./ContentWarningModal";
import type { AuditorCaseDetail } from "../../services/types";

const CASE: AuditorCaseDetail = {
  case_id: "AR-2026-00417",
  status: "READY_FOR_REVIEW",
  watson_severity_score: 48,
  effective_severity_score: 48,
  severity_tier: "S2",
  narrative_summary: "x",
  incident_timeline: [],
  flag_reason: "Graphic violence",
  video_duration_seconds: 96,
};

function setup() {
  const onProceed = vi.fn();
  const onDecline = vi.fn();
  const onClose = vi.fn();
  render(<ContentWarningModal open caseDetail={CASE} onProceed={onProceed} onDecline={onDecline} onClose={onClose} />);
  return { onProceed, onDecline, onClose, user: userEvent.setup() };
}

describe("ContentWarningModal", () => {
  it("starts unticked, with Proceed disabled until the person consents", async () => {
    const { user, onProceed } = setup();
    const box = screen.getByLabelText(/I understand this content may be disturbing/);
    expect(box).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Proceed" })).toBeDisabled();
    await user.click(box);
    expect(screen.getByRole("button", { name: "Proceed" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Proceed" }));
    expect(onProceed).toHaveBeenCalled();
  });

  it("says where a declined case goes, and how long the content is", () => {
    setup();
    expect(screen.getByText("Declining sends the case to the Manager to decide. It isn't reassigned automatically.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
    // The length, and what is left today; never a forecast of what the case will use.
    expect(screen.getByText("Video length")).toBeInTheDocument();
    expect(screen.getByText("1:36")).toBeInTheDocument();
    expect(screen.queryByText(/Uses up to/)).not.toBeInTheDocument();
    expect(screen.getByText("CVI score (48 of 100)")).toBeInTheDocument();
  });

  it("closes without declining", async () => {
    const { user, onClose, onDecline } = setup();
    await user.click(screen.getByRole("button", { name: "Back to dashboard" }));
    expect(onClose).toHaveBeenCalled();
    expect(onDecline).not.toHaveBeenCalled();
  });
});
