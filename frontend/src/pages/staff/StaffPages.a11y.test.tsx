import { screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StaffLoginPage } from "./StaffLoginPage";
import { AuditorDashboardPage } from "../auditor/AuditorDashboardPage";
import { AuditorCaseDetailPage } from "../auditor/AuditorCaseDetailPage";
import { ManagerOversightDashboardPage } from "../manager/ManagerOversightDashboardPage";
import { ManagerCaseOversightPage } from "../manager/ManagerCaseOversightPage";
import * as apiClient from "../../api/client";
import { ApiError } from "../../api/types";
import { runAxeOnPage, seedStaffSession } from "../../test/renderForA11y";

describe("Staff pages — automated accessibility (Task 99)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("Staff Login default and error states have no detectable violations", async () => {
    const { axe } = await runAxeOnPage(<StaffLoginPage />, "/staff/login");
    expect(await axe()).toHaveNoViolations();

    vi.spyOn(apiClient, "staffLogin").mockRejectedValueOnce(new ApiError("Invalid credentials", 401));
    fireEvent.change(screen.getByLabelText("Staff ID"), { target: { value: "auditor-1" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await screen.findByText("Incorrect staff ID or password.");
    expect(await axe()).toHaveNoViolations();
  });

  it("Auditor Dashboard has no detectable violations", async () => {
    seedStaffSession("auditor");
    vi.spyOn(apiClient, "getAuditorCases").mockResolvedValueOnce([
      { case_id: "AR-2026-00417", status: "READY_FOR_REVIEW", severity_tier: "S3" },
      { case_id: "AR-2026-00418", status: "AI_PROCESSING", severity_tier: null },
    ]);
    const { axe } = await runAxeOnPage(<AuditorDashboardPage />, "/auditor");
    await screen.findByText("AR-2026-00417");
    expect(await axe()).toHaveNoViolations();
  });

  it("Auditor case detail summary and severity steps have no detectable violations", async () => {
    seedStaffSession("auditor");
    vi.spyOn(apiClient, "getAuditorCaseDetail").mockResolvedValueOnce({
      case_id: "AR-2026-00417",
      status: "READY_FOR_REVIEW",
      watson_severity_score: 71,
      effective_severity_score: 71,
      severity_tier: "S3",
      narrative_summary: "Mock: physical altercation detected between two people.",
      incident_timeline: [{ start: 12, end: 20, severity_tier: "S3" }],
    });
    const { axe } = await runAxeOnPage(
      <AuditorCaseDetailPage />,
      "/auditor/cases/AR-2026-00417",
      "/auditor/cases/:caseId",
    );
    await screen.findByText("Mock: physical altercation detected between two people.");
    expect(await axe()).toHaveNoViolations();

    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    expect(await axe()).toHaveNoViolations();
  });

  it("Manager scaffold pages have no detectable violations", async () => {
    seedStaffSession("manager");
    vi.spyOn(apiClient, "getManagerDashboard").mockResolvedValueOnce({ auditors: [], pending_declined_cases: 0 });
    const dashboard = await runAxeOnPage(<ManagerOversightDashboardPage />, "/manager");
    await screen.findByText(/No auditor workload data/);
    expect(await dashboard.axe()).toHaveNoViolations();
    dashboard.container.remove();

    const cases = await runAxeOnPage(<ManagerCaseOversightPage />, "/manager/cases");
    expect(await cases.axe()).toHaveNoViolations();
  });
});
