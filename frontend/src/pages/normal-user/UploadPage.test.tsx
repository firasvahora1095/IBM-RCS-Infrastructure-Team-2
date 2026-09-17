import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UploadPage } from "./UploadPage";
import * as apiClient from "../../api/client";
import { ApiError } from "../../api/types";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/case-confirmation" element={<div>Confirmation page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function chooseFile(name: string, type: string) {
  const file = new File(["fake"], name, { type });
  fireEvent.change(screen.getByLabelText("Choose a video file"), { target: { files: [file] } });
  return file;
}

describe("UploadPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a format error for an unsupported file and does not enable submit", () => {
    renderPage();
    chooseFile("clip.exe", "application/octet-stream");

    expect(
      screen.getByText("That file format isn't supported. Try MP4, MOV, WEBM, or AVI instead.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit report/i })).toBeDisabled();
  });

  it("requires the consent checkbox before Submit is enabled, even with a valid file", () => {
    renderPage();
    chooseFile("clip.mp4", "video/mp4");

    expect(screen.getByRole("button", { name: /submit report/i })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/I understand my video and any details/i));
    expect(screen.getByRole("button", { name: /submit report/i })).toBeEnabled();
  });

  it("requires name and email only when the reporter chooses to identify themselves", () => {
    renderPage();
    chooseFile("clip.mp4", "video/mp4");
    fireEvent.click(screen.getByLabelText(/I understand my video and any details/i));

    fireEvent.click(screen.getByLabelText("Include my name & email"));
    expect(screen.getByRole("button", { name: /submit report/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Jordan Lee" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jordan@example.com" } });
    expect(screen.getByRole("button", { name: /submit report/i })).toBeEnabled();
  });

  it("submits successfully, saves the Case ID, and navigates to the confirmation page", async () => {
    vi.spyOn(apiClient, "createReport").mockResolvedValueOnce({
      case_id: "INSZNNJI4P",
      status: "Being Reviewed",
      assigned_auditor: "auditor-1",
    });

    renderPage();
    const file = chooseFile("clip.mp4", "video/mp4");
    fireEvent.click(screen.getByLabelText(/I understand my video and any details/i));
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));

    expect(await screen.findByText("Confirmation page")).toBeInTheDocument();
    expect(apiClient.createReport).toHaveBeenCalledWith(file);
    // UR-ID-07 end-to-end: retained in local storage, not just in the hook test.
    expect(JSON.parse(localStorage.getItem("rcs_last_case")!).caseId).toBe("INSZNNJI4P");
  });

  it("shows the backend's rejection message when the upload fails (UR-VU-04)", async () => {
    vi.spyOn(apiClient, "createReport").mockRejectedValueOnce(
      new ApiError("File contents do not match a valid .mp4 file", 400)
    );

    renderPage();
    chooseFile("clip.mp4", "video/mp4");
    fireEvent.click(screen.getByLabelText(/I understand my video and any details/i));
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText("File contents do not match a valid .mp4 file")).toBeInTheDocument();
    });
    expect(localStorage.getItem("rcs_last_case")).toBeNull();
  });
});
