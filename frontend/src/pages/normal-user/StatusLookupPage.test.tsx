import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StatusLookupPage } from "./StatusLookupPage";
import * as services from "../../services";
import { ApiError } from "../../services/types";
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
});
