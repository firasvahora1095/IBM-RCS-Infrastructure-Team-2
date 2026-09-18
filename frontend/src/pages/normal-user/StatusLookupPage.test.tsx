import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StatusLookupPage } from "./StatusLookupPage";
import * as services from "../../services";
import { ApiError, NotImplementedError } from "../../services/types";
import { saveCaseId } from "../../hooks/useCaseIdStorage";

function renderPage() {
  return render(
    <MemoryRouter>
      <StatusLookupPage />
    </MemoryRouter>,
  );
}

function lookUp(caseId: string) {
  fireEvent.change(screen.getByLabelText("Case ID"), { target: { value: caseId } });
  fireEvent.click(screen.getByRole("button", { name: "Check status" }));
}

describe("StatusLookupPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("pre-fills the case ID saved in this browser", () => {
    saveCaseId("INSZNNJI4P");
    renderPage();
    expect(screen.getByLabelText("Case ID")).toHaveValue("INSZNNJI4P");
  });

  it("shows the not-found field error and banner on a 404", async () => {
    vi.spyOn(services, "getStatus").mockRejectedValueOnce(new ApiError("Case not found", 404));
    renderPage();
    lookUp("RCS-0000-XXXX");

    expect(
      await screen.findByText("We couldn't find a case with that ID. Check the ID and try again."),
    ).toBeInTheDocument();
    expect(screen.getByText("We couldn't find a case with that ID.")).toBeInTheDocument();
  });

  it("disables lookups and shows the backend's notice once rate-limited (UR-ST-07)", async () => {
    vi.spyOn(services, "getStatus").mockRejectedValueOnce(
      new ApiError("Too many invalid attempts. Try again later.", 429),
    );
    renderPage();
    lookUp("RCS-0000-XXXX");

    expect(await screen.findByText("Too many invalid attempts. Try again later.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check status" })).toBeDisabled();
  });

  it("adds more information to a case through the modal (Figma 80:31, UR-NTH-05)", async () => {
    vi.spyOn(services, "getStatus").mockResolvedValueOnce({
      case_id: "INSZNNJI4P",
      status: "Being Reviewed",
      final_outcome: null,
    });
    const add = vi.spyOn(services, "addCaseInformation").mockResolvedValueOnce({ added: true });
    renderPage();
    lookUp("INSZNNJI4P");

    fireEvent.click(await screen.findByRole("button", { name: "Add more information to this case" }));
    const submit = screen.getByRole("button", { name: "Submit update" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Additional context or details"), {
      target: { value: "It was also posted on another page." },
    });
    fireEvent.click(submit);

    expect(await screen.findByText("Your update has been added to this case.")).toBeInTheDocument();
    expect(add).toHaveBeenCalledWith("INSZNNJI4P", "It was also posted on another page.", undefined);
    expect(screen.queryByRole("button", { name: "Submit update" })).not.toBeInTheDocument();
  });

  it("says honestly when adding information isn't connected yet", async () => {
    vi.spyOn(services, "getStatus").mockResolvedValueOnce({
      case_id: "INSZNNJI4P",
      status: "Being Reviewed",
      final_outcome: null,
    });
    vi.spyOn(services, "addCaseInformation").mockRejectedValueOnce(new NotImplementedError("addCaseInformation"));
    renderPage();
    lookUp("INSZNNJI4P");

    fireEvent.click(await screen.findByRole("button", { name: "Add more information to this case" }));
    fireEvent.change(screen.getByLabelText("Additional context or details"), { target: { value: "More detail." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit update" }));

    expect(await screen.findByText("Adding information to a case isn't available yet.")).toBeInTheDocument();
  });

  it("shows the Being Reviewed stage, and no outcome, for an in-progress case", async () => {
    vi.spyOn(services, "getStatus").mockResolvedValueOnce({
      case_id: "INSZNNJI4P",
      status: "Being Reviewed",
      final_outcome: null,
    });
    renderPage();
    lookUp("INSZNNJI4P");

    expect(
      await screen.findByText("A reviewer is currently assessing your report against our content policy."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Policy Violation Found")).not.toBeInTheDocument();
    expect(screen.queryByText("No Violation Found")).not.toBeInTheDocument();
    // RT-01 scope note: the preview must not imply content was actioned.
    expect(screen.getByText(/whether a policy violation was found/)).toBeInTheDocument();
    expect(screen.queryByText(/actioned/)).not.toBeInTheDocument();
  });

  it("never shows an internal state name, even if the API returns one", async () => {
    vi.spyOn(services, "getStatus").mockResolvedValueOnce({
      case_id: "INSZNNJI4P",
      status: "AI_PROCESSING",
      final_outcome: null,
    });
    renderPage();
    lookUp("INSZNNJI4P");

    await screen.findByText("Case INSZNNJI4P");
    expect(screen.queryByText(/AI_PROCESSING/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Being Reviewed" })).toBeInTheDocument();
  });

  it("shows the RT-01 outcome copy for a completed case, even for the OLD raw backend value", async () => {
    vi.spyOn(services, "getStatus").mockResolvedValueOnce({
      case_id: "INSZNNJI4P",
      status: "Complete",
      final_outcome: "Violation Found", // the pre-RT-01 test value, on purpose
    });
    renderPage();
    lookUp("INSZNNJI4P");

    expect(await screen.findByRole("heading", { name: "Policy Violation Found" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your report has been reviewed and a policy violation was identified. Thank you for taking the time to submit your report.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Violation Found")).not.toBeInTheDocument();
  });

  it("leads a completed case with its status and outcome, ahead of the case details (Figma 145:75)", async () => {
    vi.spyOn(services, "getStatus").mockResolvedValueOnce({
      case_id: "RCS-4H8P-2DXC",
      status: "Complete",
      final_outcome: "NO_VIOLATION_FOUND",
      submitted_at: "2026-09-16T01:13:00Z",
    });
    renderPage();
    lookUp("RCS-4H8P-2DXC");

    const stage = await screen.findByRole("heading", { name: "Complete" });
    const outcome = screen.getByRole("heading", { name: "No Violation Found" });
    const details = screen.getByRole("heading", { name: "Case details" });
    expect(stage.compareDocumentPosition(outcome) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(outcome.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("returns to the lookup form when checking a different case", async () => {
    vi.spyOn(services, "getStatus").mockResolvedValueOnce({
      case_id: "INSZNNJI4P",
      status: "Complete",
      final_outcome: "NO_VIOLATION_FOUND",
    });
    renderPage();
    lookUp("INSZNNJI4P");

    fireEvent.click(await screen.findByRole("button", { name: "Check a different case" }));
    await waitFor(() => expect(screen.getByLabelText("Case ID")).toHaveValue(""));
  });

  it("shows the full Case details block when the data source provides it (Figma 7:15)", async () => {
    vi.spyOn(services, "getStatus").mockResolvedValueOnce({
      case_id: "RCS-7Q3M-K91X",
      status: "Being Reviewed",
      final_outcome: null,
      submitted_at: "2026-08-22T04:20:00.000Z",
      updated_at: "2026-08-22T05:05:00.000Z",
      content_type: "Video",
      duration_seconds: 272,
      file_name: "incident_video.mp4",
    });
    renderPage();
    lookUp("RCS-7Q3M-K91X");

    expect(await screen.findByText("Submitted on")).toBeInTheDocument();
    expect(screen.getByText("Last updated")).toBeInTheDocument();
    expect(screen.getByText("Video")).toBeInTheDocument();
    expect(screen.getByText("04:32")).toBeInTheDocument();
    expect(screen.getByText("incident_video.mp4")).toBeInTheDocument();
  });

  it("omits detail rows the data source doesn't provide rather than inventing values", async () => {
    vi.spyOn(services, "getStatus").mockResolvedValueOnce({
      case_id: "INSZNNJI4P",
      status: "Being Reviewed",
      final_outcome: null,
    });
    renderPage();
    lookUp("INSZNNJI4P");

    expect(await screen.findByText("Case details")).toBeInTheDocument();
    expect(screen.queryByText("Submitted on")).not.toBeInTheDocument();
    expect(screen.queryByText("Duration")).not.toBeInTheDocument();
  });
});
