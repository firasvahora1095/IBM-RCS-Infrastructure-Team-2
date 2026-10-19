import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditorDashboardPage } from "../../pages/auditor/AuditorDashboardPage";
import * as services from "../../services";
import { ApiError } from "../../services/types";
import type { AvailableCases, FallbackCaseRow } from "../../services/types";
import { AvailableCasesSection, FallbackQueueSection } from "./FallbackQueue";

const rows: FallbackCaseRow[] = [
  { case_id: "FREE-0001", status: "READY_FOR_REVIEW", severity_tier: "S2", final_severity_tier: "S2", assigned_auditor_id: null, case_visibility: "SUPER_ADMIN_ONLY", manager_flag: null, auto_release_at: new Date(Date.now() + 4 * 60_000).toISOString() },
  { case_id: "FREE-0002", status: "READY_FOR_REVIEW", severity_tier: "S1", final_severity_tier: "S1", assigned_auditor_id: null, case_visibility: "AVAILABLE_TO_AUDITORS", manager_flag: null, auto_release_at: null },
  { case_id: "OWNED-001", status: "AUDITOR_REVIEW", severity_tier: "S3", final_severity_tier: "S3", assigned_auditor_id: "auditor-1", case_visibility: "ASSIGNED_ONLY", manager_flag: null, auto_release_at: null },
  // With the Manager after a decline: the owner is never shown (MR-CR-04).
  { case_id: "DECL-0001", status: "READY_FOR_REVIEW", severity_tier: "S3", final_severity_tier: "S3", assigned_auditor_id: null, case_visibility: "ASSIGNED_ONLY", manager_flag: "DECLINED", auto_release_at: null },
];

const available: AvailableCases = {
  can_claim: true,
  reason: null,
  cases: [{ case_id: "FREE-0002", severity_tier: "S1", status: "READY_FOR_REVIEW", ready: true }],
};

function renderFallback(props: Partial<React.ComponentProps<typeof FallbackQueueSection>> = {}) {
  const onChanged = vi.fn();
  const view = render(
    <FallbackQueueSection
      token="t"
      refreshKey={0}
      onChanged={onChanged}
      onSessionExpired={() => false}
      canTake
      blockReason={null}
      {...props}
    />,
  );
  return { ...view, onChanged };
}

describe("FallbackQueueSection (Super Auditor)", () => {
  beforeEach(() => {
    vi.spyOn(services, "getAllOpenCases").mockResolvedValue(rows);
  });
  afterEach(() => vi.restoreAllMocks());

  it("opens on the cases that need a Reviewer, so owned cases don't bury them", async () => {
    renderFallback();
    expect(await screen.findByText("FREE-0001")).toBeInTheDocument();
    expect(screen.getByText("FREE-0002")).toBeInTheDocument();
    expect(screen.queryByText("OWNED-001")).not.toBeInTheDocument();
    expect(screen.queryByText("DECL-0001")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Needs a Reviewer (2)" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "All open cases (4)" })).toBeInTheDocument();
  });

  it("lists every open case with its owner and who can see it under All open cases", async () => {
    renderFallback();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: /All open cases/ }));
    expect(screen.getAllByText("No one yet")).toHaveLength(2);
    expect(screen.getByText("auditor-1")).toBeInTheDocument();
    expect(screen.getByText("Super Auditor only")).toBeInTheDocument();
    expect(screen.getByText("Available to Auditors")).toBeInTheDocument();
  });

  it("shows a case with the Manager as that, never as unowned or by who declined it, and offers nothing on it", async () => {
    renderFallback();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: /All open cases/ }));
    const row = screen.getByText("DECL-0001").closest("tr") as HTMLElement;
    expect(within(row).getByText("With Manager")).toBeInTheDocument();
    expect(within(row).getByText("Manager decision")).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /Take case/ })).not.toBeInTheDocument();
  });

  it("tells the Super Auditor the system will place a parked case itself, so there is nothing to do", async () => {
    renderFallback();
    expect(await screen.findByText(/placed automatically the moment one is/)).toBeInTheDocument();
    expect(await screen.findByText(/Placed automatically from/)).toBeInTheDocument();
    // A case the system will never place (hand-seeded, or already released for claiming) carries no such note.
    const row = screen.getByText("FREE-0002").closest("tr") as HTMLElement;
    expect(within(row).queryByText(/automatically/)).not.toBeInTheDocument();
  });

  it("offers Take case only on a case nobody owns", async () => {
    renderFallback();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: /All open cases/ }));
    expect(screen.getByRole("button", { name: "Take case FREE-0001" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Take case FREE-0002" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Take case OWNED-001" })).not.toBeInTheDocument();
  });

  it("shows what is being taken and only takes the case once confirmed", async () => {
    const take = vi.spyOn(services, "takeCase").mockResolvedValue({ taken: true });
    const { onChanged } = renderFallback();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Take case FREE-0001" }));
    expect(take).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Take case FREE-0001?")).toBeInTheDocument();
    expect(within(dialog).getByText(/opens on a content warning/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Take case" }));
    expect(take).toHaveBeenCalledWith("FREE-0001", "t");
    expect(await screen.findByText(/FREE-0001 is now in your queue/)).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it("offers no Make available: automatic placement already does that", async () => {
    renderFallback();
    await screen.findByText("FREE-0001");
    expect(screen.queryByRole("button", { name: /Make available/ })).not.toBeInTheDocument();
  });

  it("disables Take case during a wellbeing block and says why, without blaming", async () => {
    renderFallback({ canTake: false, blockReason: "You are in a mandatory cooldown." });
    await screen.findByText("FREE-0001");
    expect(screen.getByRole("button", { name: "Take case FREE-0001" })).toBeDisabled();
    expect(screen.getByText("You can't take a case right now.")).toBeInTheDocument();
    expect(screen.getByText("You are in a mandatory cooldown.")).toBeInTheDocument();
  });

  it("shows the server's reason when a take is refused", async () => {
    vi.spyOn(services, "takeCase").mockRejectedValue(new ApiError("This case already has an Auditor. A Manager can reassign it.", 409));
    renderFallback();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Take case FREE-0001" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Take case" }));
    expect(await screen.findByText(/already has an Auditor/)).toBeInTheDocument();
  });

  it("says so plainly when there are no open cases", async () => {
    vi.spyOn(services, "getAllOpenCases").mockResolvedValue([]);
    renderFallback();
    expect(await screen.findByText("No cases need a Reviewer right now.")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderFallback();
    await screen.findByText("FREE-0001");
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("AvailableCasesSection (standard Auditor)", () => {
  afterEach(() => vi.restoreAllMocks());

  function renderAvailable() {
    const onChanged = vi.fn();
    const view = render(<AvailableCasesSection token="t" refreshKey={0} onChanged={onChanged} onSessionExpired={() => false} />);
    return { ...view, onChanged };
  }

  it("renders nothing when no case has been released", async () => {
    vi.spyOn(services, "getAvailableCases").mockResolvedValue({ can_claim: true, reason: null, cases: [] });
    const { container } = renderAvailable();
    await waitFor(() => expect(services.getAvailableCases).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("shows only queue metadata, and claiming adds it to the queue without opening it", async () => {
    vi.spyOn(services, "getAvailableCases").mockResolvedValue(available);
    const claim = vi.spyOn(services, "claimCase").mockResolvedValue({ claimed: true });
    const { onChanged } = renderAvailable();
    const user = userEvent.setup();
    const table = await screen.findByRole("table", { name: "Available to claim" });
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Case ID", "Severity", "Status", "Actions"]);
    await user.click(screen.getByRole("button", { name: "Claim case FREE-0002" }));
    expect(claim).toHaveBeenCalledWith("FREE-0002", "t");
    expect(await screen.findByText(/FREE-0002 is now in your queue/)).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
    expect(screen.queryByRole("link")).not.toBeInTheDocument(); // claiming never opens the case
  });

  it("lets an Auditor decline a case they could claim, removing it from their list only", async () => {
    sessionStorage.removeItem("rcs_declined_available_cases");
    vi.spyOn(services, "getAvailableCases").mockResolvedValue(available);
    const claim = vi.spyOn(services, "claimCase");
    renderAvailable();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Decline case FREE-0002" }));
    expect(screen.queryByText("FREE-0002")).not.toBeInTheDocument();
    expect(claim).not.toHaveBeenCalled(); // nothing changes for anyone else
    sessionStorage.removeItem("rcs_declined_available_cases");
  });

  it("disables Claim during a block and shows the reason", async () => {
    vi.spyOn(services, "getAvailableCases").mockResolvedValue({ ...available, can_claim: false, reason: "You have reached your daily exposure limit." });
    renderAvailable();
    expect(await screen.findByRole("button", { name: "Claim case FREE-0002" })).toBeDisabled();
    expect(screen.getByText("You can't claim a case right now.")).toBeInTheDocument();
    expect(screen.getByText("You have reached your daily exposure limit.")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    vi.spyOn(services, "getAvailableCases").mockResolvedValue(available);
    const { container } = renderAvailable();
    await screen.findByRole("table", { name: "Available to claim" });
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("Auditor dashboard and the fallback sections", () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem("rcs_staff_token", "abc123");
    sessionStorage.setItem("rcs_staff_role", "auditor");
    sessionStorage.setItem("rcs_staff_id", "auditor-1");
    vi.spyOn(services, "getAuditorCases").mockResolvedValue([
      { case_id: "AR-2026-00417", status: "READY_FOR_REVIEW", severity_tier: "S3" },
    ]);
    vi.spyOn(services, "getAllOpenCases").mockResolvedValue(rows);
    vi.spyOn(services, "getAvailableCases").mockResolvedValue(available);
  });
  afterEach(() => vi.restoreAllMocks());

  function renderDashboard() {
    return render(
      <MemoryRouter initialEntries={["/auditor"]}>
        <Routes>
          <Route path="/auditor" element={<AuditorDashboardPage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("shows a standard Auditor the available cases, never the fallback queue", async () => {
    renderDashboard();
    expect(await screen.findByRole("heading", { name: "Available to claim" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Fallback queue" })).not.toBeInTheDocument();
    expect(services.getAllOpenCases).not.toHaveBeenCalled();
  });

  it("shows the Super Auditor their own cases first, then the fallback queue, and no claim list", async () => {
    sessionStorage.setItem("rcs_staff_super_admin", "1");
    renderDashboard();
    const fallback = await screen.findByRole("heading", { name: "Fallback queue" });
    const mine = await screen.findByText("AR-2026-00417");
    expect(mine.compareDocumentPosition(fallback) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Available to claim" })).not.toBeInTheDocument();
    expect(services.getAvailableCases).not.toHaveBeenCalled();
  });

  it("ignores the super auditor flag for a Manager session", async () => {
    sessionStorage.setItem("rcs_staff_role", "manager");
    sessionStorage.setItem("rcs_staff_super_admin", "1");
    const { readStaffSession } = await import("../../hooks/useAuth");
    expect(readStaffSession()?.isSuperAdmin).toBe(false);
  });
});
