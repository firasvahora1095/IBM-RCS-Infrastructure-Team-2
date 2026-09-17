import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CooldownPage } from "./CooldownPage";
import * as services from "../../services";
import { NotImplementedError } from "../../services/types";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/auditor/cooldown"]}>
      <Routes>
        <Route path="/auditor/cooldown" element={<CooldownPage />} />
        <Route path="/auditor" element={<div>Case queue page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CooldownPage (Figma 31:99)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem("rcs_staff_token", "abc123");
    sessionStorage.setItem("rcs_staff_role", "auditor");
    sessionStorage.setItem("rcs_staff_id", "auditor-1");
    vi.restoreAllMocks();
  });

  it("locks the queue during an S4 cooldown and explains the mandatory check-in", async () => {
    const now = Date.now();
    vi.spyOn(services, "getMyWellbeing").mockResolvedValue({
      exposure_minutes_today: 222,
      exposure_limit_minutes: 240,
      cases_reviewed_today: 6,
      cooldown: {
        started_at: new Date(now - 10 * 60_000).toISOString(),
        ends_at: new Date(now + 20 * 60_000).toISOString(),
        trigger: "S4",
        requires_check_in: true,
      },
    });
    renderPage();

    expect(await screen.findByRole("heading", { name: "Cooldown in progress" })).toBeInTheDocument();
    expect(screen.getByText(/This cooldown is a built-in protection, not a penalty./)).toBeInTheDocument();
    expect(screen.getByText("3h 42m reviewed today across 6 cases")).toBeInTheDocument();
    expect(screen.getByText("Your manager will check in before this ends")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Return to queue \(available in/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Stop my shift" })).toBeEnabled();
    // The optional check-in is offered inline.
    expect(screen.getByRole("button", { name: "Talk to my manager" })).toBeInTheDocument();
  });

  it("keeps the queue locked after the timer until the manager has checked in", async () => {
    vi.spyOn(services, "getMyWellbeing").mockResolvedValue({
      exposure_minutes_today: 90,
      exposure_limit_minutes: 120,
      cooldown: {
        ends_at: new Date(Date.now() - 1000).toISOString(),
        trigger: "SOS",
        requires_check_in: true,
      },
    });
    renderPage();

    expect(
      await screen.findByRole("button", { name: "Return to queue (after your manager's check-in)" }),
    ).toBeDisabled();
  });

  it("lets the Auditor back to the queue once nothing is holding them", async () => {
    vi.spyOn(services, "getMyWellbeing").mockResolvedValue({
      exposure_minutes_today: 90,
      exposure_limit_minutes: 120,
      cooldown: null,
    });
    renderPage();

    expect(await screen.findByRole("heading", { name: "Your cooldown has ended" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Return to queue" })).toBeEnabled();
  });

  it("says why when the cooldown can't be loaded, instead of loading forever", async () => {
    vi.spyOn(services, "getMyWellbeing").mockRejectedValue(new NotImplementedError("getMyWellbeing"));
    renderPage();

    expect(await screen.findByText("Couldn't load your cooldown.")).toBeInTheDocument();
    expect(screen.getByText("This feature isn't connected to the backend yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop my shift" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Return to queue/ })).not.toBeInTheDocument();
  });
});
