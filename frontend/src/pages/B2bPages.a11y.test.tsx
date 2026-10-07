import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "jest-axe";
import { beforeEach, describe, expect, it } from "vitest";
import { AppRoutes } from "../App";
import { mockDataService } from "../services/mock";
import { resetDb } from "../services/mock/store";
import { DEMO_PASSWORD } from "../services/mock/seed";

/**
 * Automated accessibility checks for every screen added for the B2B
 * end-to-end flow (docs/ux/b2b-end-to-end-flow-spec.md §9). Contrast isn't
 * measurable in jsdom; it's checked in the browser.
 */

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

async function signInManager() {
  const { token } = await mockDataService.staffLogin("manager-1", DEMO_PASSWORD);
  sessionStorage.setItem("rcs_staff_token", token);
  sessionStorage.setItem("rcs_staff_role", "manager");
  sessionStorage.setItem("rcs_staff_id", "manager-1");
}

async function signInClient() {
  const login = await mockDataService.clientLogin("ch-user-17", DEMO_PASSWORD);
  sessionStorage.setItem("rcs_client_token", login.token);
  sessionStorage.setItem(
    "rcs_client_profile",
    JSON.stringify({
      userId: login.user_id,
      displayName: login.display_name,
      organisationId: login.organisation_id,
      organisationName: login.organisation_name,
    }),
  );
}

describe("B2B screens — automated accessibility", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetDb();
  });

  it.each([
    ["RCS landing page", "/rcs", "Content moderation that protects the people who do it."],
    ["Organisation set-up", "/rcs/get-started", "Set up your organisation"],
    ["Simulated CommunityHub feed", "/communityhub", "Home"],
    ["Flow guide", "/flow", "From a report on CommunityHub to a released service report"],
    ["Client sign-in", "/client/login", "Sign in"],
  ])("%s has no detectable violations", async (_name, path, heading) => {
    const { container } = renderAt(path);
    await screen.findByRole("heading", { level: 1, name: heading });
    expect(await axe(container)).toHaveNoViolations();
  });

  it.each([
    ["Deliveries", "/manager/deliveries", "Deliveries"],
    ["Delivery detail", "/manager/deliveries/DEL-AR-2026-00404", "DEL-AR-2026-00404"],
    ["CommunityHub customer", "/manager/customers/communityhub", "CommunityHub"],
    ["Client reports", "/manager/reports", "Client reports"],
    ["Client messages", "/manager/messages", "Client messages"],
    ["Client message", "/manager/messages/MSG-1002", "Taylor Brooks"],
    ["Auditor detail", "/manager/auditors/auditor-4", "Reese Patel"],
  ])("Manager %s has no detectable violations", async (_name, path, heading) => {
    await signInManager();
    const { container } = renderAt(path);
    await screen.findByRole("heading", { level: 1, name: heading });
    await waitFor(() => expect(screen.queryByText(/^Couldn.t load/)).not.toBeInTheDocument());
    expect(await axe(container)).toHaveNoViolations();
  });

  it("Manager report preview has no detectable violations", async () => {
    await signInManager();
    const [draft] = (await mockDataService.listReports(sessionStorage.getItem("rcs_staff_token")!)).filter(
      (r) => r.status === "DRAFT",
    );
    const { container } = renderAt(`/manager/reports/${draft.report_id}`);
    await screen.findByRole("button", { name: "Approve and release" });
    expect(await axe(container)).toHaveNoViolations();
  });

  it("client report list, report view and denied state have no detectable violations", async () => {
    await signInClient();
    const list = renderAt("/client/reports");
    await screen.findByRole("heading", { level: 1, name: "Service reports" });
    await screen.findByRole("list", { name: "Released reports" });
    expect(await axe(list.container)).toHaveNoViolations();
    list.unmount();

    const [released] = await mockDataService.clientListReports(sessionStorage.getItem("rcs_client_token")!);
    const view = renderAt(`/client/reports/${released.report_id}`);
    await screen.findByRole("button", { name: "Download PDF" });
    expect(await axe(view.container)).toHaveNoViolations();
    view.unmount();

    const denied = renderAt("/client/reports/RPT-DOES-NOT-EXIST");
    await screen.findByText("You don't have access to this report.");
    expect(await axe(denied.container)).toHaveNoViolations();
  });

  it("client messages, new message and a thread have no detectable violations", async () => {
    await signInClient();
    const list = renderAt("/client/messages");
    await screen.findByRole("table", { name: "Your messages" });
    expect(await axe(list.container)).toHaveNoViolations();
    list.unmount();

    const form = renderAt("/client/messages/new");
    await screen.findByRole("heading", { level: 1, name: "Contact RCS" });
    expect(await axe(form.container)).toHaveNoViolations();
    form.unmount();

    const thread = renderAt("/client/messages/MSG-1001");
    await screen.findByRole("heading", { name: /Reply from RCS/ });
    expect(await axe(thread.container)).toHaveNoViolations();
  });
});
