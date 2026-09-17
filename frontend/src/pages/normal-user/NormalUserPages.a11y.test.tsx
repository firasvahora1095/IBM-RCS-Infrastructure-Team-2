import { screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UploadPage } from "./UploadPage";
import { CaseIdConfirmationPage } from "./CaseIdConfirmationPage";
import { StatusLookupPage } from "./StatusLookupPage";
import * as apiClient from "../../api/client";
import { ApiError } from "../../api/types";
import { saveCaseId } from "../../hooks/useCaseIdStorage";
import { runAxeOnPage } from "../../test/renderForA11y";

describe("Normal User pages — automated accessibility (Task 99)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("Upload page has no detectable violations, including the identified-reporter fields", async () => {
    const { axe } = await runAxeOnPage(<UploadPage />);
    expect(await axe()).toHaveNoViolations();

    fireEvent.click(screen.getByLabelText("Include my name & email"));
    expect(await axe()).toHaveNoViolations();
  });

  it("Upload page error state has no detectable violations", async () => {
    const { axe } = await runAxeOnPage(<UploadPage />);
    fireEvent.change(screen.getByLabelText("Choose a video file"), {
      target: { files: [new File(["x"], "clip.exe")] },
    });
    expect(await axe()).toHaveNoViolations();
  });

  it("Case ID Confirmation page has no detectable violations", async () => {
    saveCaseId("INSZNNJI4P");
    const { axe } = await runAxeOnPage(<CaseIdConfirmationPage />, "/case-confirmation");
    expect(await axe()).toHaveNoViolations();
  });

  it("Status lookup, not-found and found states have no detectable violations", async () => {
    const { axe } = await runAxeOnPage(<StatusLookupPage />, "/status");
    expect(await axe()).toHaveNoViolations();

    vi.spyOn(apiClient, "getStatus").mockRejectedValueOnce(new ApiError("Case not found", 404));
    fireEvent.change(screen.getByLabelText("Case ID"), { target: { value: "NOPE" } });
    fireEvent.click(screen.getByRole("button", { name: "Check status" }));
    await screen.findByText("We couldn't find a case with that ID. Check the ID and try again.");
    expect(await axe()).toHaveNoViolations();

    vi.spyOn(apiClient, "getStatus").mockResolvedValueOnce({
      case_id: "INSZNNJI4P",
      status: "Being Reviewed",
      final_outcome: null,
    });
    fireEvent.click(screen.getByRole("button", { name: "Check status" }));
    await screen.findByText("Case INSZNNJI4P");
    expect(await axe()).toHaveNoViolations();
  });
});
