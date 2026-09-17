import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { CaseIdConfirmationPage } from "./CaseIdConfirmationPage";
import { saveCaseId } from "../../hooks/useCaseIdStorage";

function renderPage(state?: { caseId: string }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/case-confirmation", state }]}>
      <Routes>
        <Route path="/" element={<div>Upload page</div>} />
        <Route path="/case-confirmation" element={<CaseIdConfirmationPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CaseIdConfirmationPage", () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom doesn't implement the Clipboard API.
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("shows the case ID saved in this browser (survives a refresh)", () => {
    saveCaseId("INSZNNJI4P");
    renderPage();
    expect(screen.getByTestId("case-id")).toHaveTextContent("INSZNNJI4P");
  });

  it("shows the case ID from navigation state even if storage is empty", () => {
    renderPage({ caseId: "FROMSTATE1" });
    expect(screen.getByTestId("case-id")).toHaveTextContent("FROMSTATE1");
  });

  it("redirects to the upload page when there's no case to confirm", () => {
    renderPage();
    expect(screen.getByText("Upload page")).toBeInTheDocument();
  });

  it("copies the case ID to the clipboard and shows a brief confirmation", async () => {
    saveCaseId("INSZNNJI4P");
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Copy case ID" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("INSZNNJI4P");
    expect(await screen.findByText("Copied!")).toBeInTheDocument();
  });

  it("tells the user to copy manually if the clipboard write fails, instead of claiming success", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error("denied"));
    saveCaseId("INSZNNJI4P");
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Copy case ID" }));
    expect(await screen.findByText(/copy it manually/)).toBeInTheDocument();
    expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
  });

  it("keeps 'Send me updates' disabled until a contact method is entered", () => {
    saveCaseId("INSZNNJI4P");
    renderPage();
    expect(screen.getByRole("button", { name: "Send me updates" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Email (optional)"), { target: { value: "jordan@example.com" } });
    expect(screen.getByRole("button", { name: "Send me updates" })).toBeEnabled();
  });

  it("never claims updates are enabled while no notification backend exists", () => {
    saveCaseId("INSZNNJI4P");
    renderPage();
    fireEvent.change(screen.getByLabelText("Email (optional)"), { target: { value: "jordan@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send me updates" }));

    expect(screen.getByText("Email and SMS updates aren't available yet.")).toBeInTheDocument();
    expect(screen.queryByText(/Updates enabled/)).not.toBeInTheDocument();
  });
});
