import { act, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StaffLoginPage } from "./StaffLoginPage";
import { AuditorDashboardPage } from "../auditor/AuditorDashboardPage";
import { AuditorCaseDetailPage } from "../auditor/AuditorCaseDetailPage";
import { CooldownPage } from "../auditor/CooldownPage";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "jest-axe";
import { AppRoutes } from "../../App";
import { mockDataService } from "../../services/mock";
import { resetDb } from "../../services/mock/store";
import { DEMO_PASSWORD } from "../../services/mock/seed";
import * as services from "../../services";
import { ApiError } from "../../services/types";
import { DEMO_AI_FAILURE_EVENT } from "../../services/mock/demo";
import { runAxeOnPage, seedStaffSession } from "../../test/renderForA11y";

describe("Staff pages — automated accessibility (Task 99)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("Staff Login default and error states have no detectable violations", async () => {
    const { axe } = await runAxeOnPage(<StaffLoginPage />, "/staff/login");
    expect(await axe()).toHaveNoViolations();

    vi.spyOn(services, "staffLogin").mockRejectedValueOnce(new ApiError("Invalid credentials", 401));
    fireEvent.change(screen.getByLabelText("Staff ID"), { target: { value: "auditor-1" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await screen.findByText("Incorrect staff ID or password.");
    expect(await axe()).toHaveNoViolations();
  });

  it("Auditor Dashboard has no detectable violations", async () => {
    seedStaffSession("auditor");
    vi.spyOn(services, "getAuditorCases").mockResolvedValueOnce([
      { case_id: "AR-2026-00417", status: "READY_FOR_REVIEW", severity_tier: "S3" },
      { case_id: "AR-2026-00418", status: "AI_PROCESSING", severity_tier: null },
    ]);
    const { axe } = await runAxeOnPage(<AuditorDashboardPage />, "/auditor");
    await screen.findByText("AR-2026-00417");
    expect(await axe()).toHaveNoViolations();
  });

  it("Auditor case review — warning, decline, summary, workspace and severity — has no detectable violations", async () => {
    seedStaffSession("auditor");
    vi.spyOn(services, "getMyWellbeing").mockResolvedValue({
      exposure_minutes_today: 62,
      exposure_limit_minutes: 120,
      cooldown: null,
    });
    vi.spyOn(services, "acknowledgeContentWarning").mockResolvedValue({ acknowledged: true });
    vi.spyOn(services, "recordExposure").mockResolvedValue({ recorded: true });
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValueOnce({
      case_id: "AR-2026-00417",
      status: "READY_FOR_REVIEW",
      watson_severity_score: 71,
      effective_severity_score: 71,
      severity_tier: "S3",
      narrative_summary: "Mock: physical altercation detected between two people.",
      incident_timeline: [{ start: 12, end: 20, severity_tier: "S3", tag: "physical_violence" }],
      transcript: [{ time: 13, text: "[raised voices]" }],
      audio_intensity: [0.2, 0.6, 0.3],
      flagged_entities: [{ label: "Person A", start: 10, end: 30 }],
      flag_reason: "Graphic violence",
    });
    const { axe } = await runAxeOnPage(
      <AuditorCaseDetailPage />,
      "/auditor/cases/AR-2026-00417",
      "/auditor/cases/:caseId",
    );

    // Content warning (16:19) and Decline Reason Modal (25:137).
    const consent = await screen.findByLabelText(/I understand this content may be disturbing/);
    expect(await axe()).toHaveNoViolations();
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    await screen.findByRole("button", { name: "Submit decline" });
    expect(await axe()).toHaveNoViolations();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(consent);
    fireEvent.click(screen.getByRole("button", { name: "Proceed" }));
    await screen.findByText("Mock: physical altercation detected between two people.");
    expect(await axe()).toHaveNoViolations();

    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    await screen.findByRole("slider", { name: "Blur intensity" });
    expect(await axe()).toHaveNoViolations();

    fireEvent.click(screen.getByRole("button", { name: "Continue to severity & comment" }));
    await screen.findByRole("heading", { name: "Severity & comment" });
    expect(await axe()).toHaveNoViolations();
  });

  it("Auditor case paused by an AI failure mid-review (AR-AI-11) has no detectable violations", async () => {
    seedStaffSession("auditor");
    vi.spyOn(services, "getMyWellbeing").mockResolvedValue({
      exposure_minutes_today: 62,
      exposure_limit_minutes: 120,
      cooldown: null,
    });
    vi.spyOn(services, "acknowledgeContentWarning").mockResolvedValue({ acknowledged: true });
    vi.spyOn(services, "recordExposure").mockResolvedValue({ recorded: true });
    vi.spyOn(services, "reportUnexpectedExposure").mockResolvedValue({
      cooldown: { ends_at: new Date(Date.now() + 30 * 60_000).toISOString(), trigger: "SOS", requires_check_in: true },
    });
    vi.spyOn(services, "getAuditorCaseDetail").mockResolvedValueOnce({
      case_id: "AR-2026-00417",
      status: "READY_FOR_REVIEW",
      watson_severity_score: 71,
      effective_severity_score: 71,
      severity_tier: "S3",
      narrative_summary: "Mock: physical altercation detected between two people.",
      incident_timeline: [{ start: 12, end: 20, severity_tier: "S3", tag: "physical_violence" }],
      flag_reason: "Graphic violence",
    });
    const { axe } = await runAxeOnPage(
      <AuditorCaseDetailPage />,
      "/auditor/cases/AR-2026-00417",
      "/auditor/cases/:caseId",
    );
    fireEvent.click(await screen.findByLabelText(/I understand this content may be disturbing/));
    fireEvent.click(screen.getByRole("button", { name: "Proceed" }));
    await screen.findByRole("button", { name: "Continue to review" });
    act(() => {
      window.dispatchEvent(new Event(DEMO_AI_FAILURE_EVENT));
    });
    await screen.findByText("We’ve paused this case and notified your manager.");
    expect(await axe()).toHaveNoViolations();
  });

  it("Auditor Cooldown screen has no detectable violations", async () => {
    seedStaffSession("auditor");
    vi.spyOn(services, "getMyWellbeing").mockResolvedValue({
      exposure_minutes_today: 100,
      exposure_limit_minutes: 120,
      cases_reviewed_today: 5,
      cooldown: { ends_at: new Date(Date.now() + 60_000 * 20).toISOString(), trigger: "S4", requires_check_in: true },
    });
    const { axe } = await runAxeOnPage(<CooldownPage />, "/auditor/cooldown");
    await screen.findByRole("heading", { name: "Cooldown in progress" });
    expect(await axe()).toHaveNoViolations();
  });

  it.each([
    ["Oversight Dashboard", "/manager", "Oversight Dashboard"],
    ["Auditor Detail", "/manager/auditors/auditor-4", "Reese Patel"],
    ["Case Oversight", "/manager/cases", "Consolidated Case Oversight"],
    ["SOS Inbox", "/manager/sos", "SOS Inbox"],
    ["SOS Alert Detail", "/manager/sos/SOS-demo0001", "Marcus Webb"],
    ["SOS Follow-up", "/manager/sos/SOS-demo0003/follow-up", "Log follow-up — Reese Patel"],
    ["Reassignment Queue", "/manager/reassignment", "Declined / Reassignment Queue"],
    ["Case Review Detail", "/manager/cases/AR-2026-00398/review", "Case AR-2026-00398"],
    ["Reassignment decision", "/manager/cases/AR-2026-00398/reassign", "Reassignment decision — AR-2026-00398"],
    ["Validation View", "/manager/validation", "Validation View"],
  ])("Manager %s has no detectable violations", async (_name, path, heading) => {
    resetDb();
    const { token } = await mockDataService.staffLogin("manager-1", DEMO_PASSWORD);
    sessionStorage.setItem("rcs_staff_token", token);
    sessionStorage.setItem("rcs_staff_role", "manager");
    sessionStorage.setItem("rcs_staff_id", "manager-1");
    const { container } = render(
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    await screen.findByRole("heading", { level: 1, name: heading });
    expect(await axe(container)).toHaveNoViolations();
  });
});
