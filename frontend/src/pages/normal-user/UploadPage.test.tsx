import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UploadPage } from "./UploadPage";
import * as services from "../../services";
import { ApiError } from "../../services/types";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/case-confirmation" element={<div>Confirmation page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function chooseFile(label: string, name: string, type: string) {
  const file = new File(["fake"], name, { type });
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } });
  return file;
}

const chooseVideo = (name: string, type = "video/mp4") => chooseFile("Choose a video file", name, type);
const submitButton = () => screen.getByRole("button", { name: /submit report/i });
const giveConsent = () => fireEvent.click(screen.getByLabelText(/I understand my (video|screenshot) and any details/i));

describe("UploadPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a format error for an unsupported file and does not enable submit", () => {
    renderPage();
    chooseVideo("clip.exe", "application/octet-stream");

    expect(
      screen.getByText("That file format isn't supported. Try MP4, MOV, WEBM, or AVI instead."),
    ).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it("explains the missing consent instead of submitting (Figma 73:29)", () => {
    const create = vi.spyOn(services, "createReport");
    renderPage();
    chooseVideo("clip.mp4");

    fireEvent.click(submitButton());
    expect(
      screen.getByText("Please confirm you understand how your report will be used before submitting."),
    ).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();

    giveConsent();
    expect(
      screen.queryByText("Please confirm you understand how your report will be used before submitting."),
    ).not.toBeInTheDocument();
  });

  it("requires name and email only when the reporter chooses to identify themselves", () => {
    renderPage();
    chooseVideo("clip.mp4");
    giveConsent();

    fireEvent.click(screen.getByLabelText("Include my name & email"));
    expect(submitButton()).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Jordan Lee" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jordan@example.com" } });
    expect(submitButton()).toBeEnabled();
  });

  it("submits successfully, saves the Case ID, and navigates to the confirmation page", async () => {
    vi.spyOn(services, "createReport").mockResolvedValueOnce({
      case_id: "INSZNNJI4P",
      status: "Being Reviewed",
      assigned_auditor: "auditor-1",
    });

    renderPage();
    const file = chooseVideo("clip.mp4");
    giveConsent();
    fireEvent.click(submitButton());

    expect(await screen.findByText("Confirmation page")).toBeInTheDocument();
    expect(services.createReport).toHaveBeenCalledWith(file);
    // UR-ID-07 end-to-end: retained in local storage, not just in the hook test.
    expect(JSON.parse(localStorage.getItem("rcs_last_case")!).caseId).toBe("INSZNNJI4P");
  });

  it("shows the backend's rejection message when the upload is invalid (UR-VU-04)", async () => {
    vi.spyOn(services, "createReport").mockRejectedValueOnce(
      new ApiError("File contents do not match a valid .mp4 file", 400),
    );

    renderPage();
    chooseVideo("clip.mp4");
    giveConsent();
    fireEvent.click(submitButton());

    await waitFor(() => {
      expect(screen.getByText("File contents do not match a valid .mp4 file")).toBeInTheDocument();
    });
    expect(localStorage.getItem("rcs_last_case")).toBeNull();
  });

  it("shows the processing-failed state, then returns to the filled-in form (Figma 73:41)", async () => {
    vi.spyOn(services, "createReport").mockRejectedValueOnce(new ApiError("Internal error", 500));

    renderPage();
    chooseVideo("clip.mp4");
    fireEvent.change(screen.getByLabelText("Add more detail (optional)"), { target: { value: "Seen on a bus." } });
    giveConsent();
    fireEvent.click(submitButton());

    expect(
      await screen.findByText("Your case was not created — no case ID has been issued for this attempt."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByLabelText("Add more detail (optional)")).toHaveValue("Seen on a bus.");
  });

  it("reports a public link instead of a video (Figma 72:28)", async () => {
    vi.spyOn(services, "createLinkReport").mockResolvedValueOnce({
      case_id: "RCS-AAAA-BBBB",
      status: "Being Reviewed",
      assigned_auditor: "auditor-2",
    });
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "Paste a link instead" }));

    fireEvent.change(screen.getByLabelText("Link to the content"), { target: { value: "not a link" } });
    giveConsent();
    fireEvent.click(submitButton());
    expect(
      screen.getByText(
        "That link doesn't look right. Make sure it's a public video link, not a private or password-protected page.",
      ),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Link to the content"), {
      target: { value: "https://video.example.com/watch/123" },
    });
    fireEvent.click(submitButton());
    expect(await screen.findByText("Confirmation page")).toBeInTheDocument();
    expect(services.createLinkReport).toHaveBeenCalledWith("https://video.example.com/watch/123");
  });

  it("reports with a PNG or JPG screenshot (Figma 72:58)", async () => {
    vi.spyOn(services, "createScreenshotReport").mockResolvedValueOnce({
      case_id: "RCS-CCCC-DDDD",
      status: "Being Reviewed",
      assigned_auditor: "auditor-2",
    });
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "Add a screenshot" }));

    chooseFile("Choose a screenshot image", "capture.gif", "image/gif");
    expect(screen.getByText("That image format isn't supported. Try PNG or JPG instead.")).toBeInTheDocument();

    const image = chooseFile("Choose a screenshot image", "capture.png", "image/png");
    giveConsent();
    fireEvent.click(submitButton());
    expect(await screen.findByText("Confirmation page")).toBeInTheDocument();
    expect(services.createScreenshotReport).toHaveBeenCalledWith(image);
  });
});
