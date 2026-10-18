import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { AppRoutes } from "../../App";
import { mockDataService } from "../../services/mock";
import { resetDb } from "../../services/mock/store";
import { DEMO_PASSWORD } from "../../services/mock/seed";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

async function signInClient(userId: string) {
  const login = await mockDataService.clientLogin(userId, DEMO_PASSWORD);
  sessionStorage.setItem("rcs_client_token", login.token);
  sessionStorage.setItem(
    "rcs_client_profile",
    JSON.stringify({
      userId: login.user_id,
      displayName: login.display_name,
      organisationId: login.organisation_id,
      organisationName: login.organisation_name,
      role: login.role,
    }),
  );
}

describe("CommunityHub portal frame", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetDb();
  });

  it("has its sections as tabs under the header, like the Manager, with the current one marked", async () => {
    await signInClient("ch-user-17");
    renderAt("/client/messages");
    const nav = await screen.findByRole("navigation", { name: "Client sections" });
    const current = within(nav).getAllByRole("link").find((l) => l.getAttribute("aria-current") === "page");
    expect(current).toHaveTextContent("Messages");
    // The tabs are not inside the dark header any more.
    expect(nav.closest("header")).toBeNull();
  });

  it("shows only the sections the account's role includes", async () => {
    await signInClient("ch-user-17");
    renderAt("/client/reports");
    const nav = await screen.findByRole("navigation", { name: "Client sections" });
    const names = within(nav).getAllByRole("link").map((l) => (l.textContent ?? "").replace(/\d+$/, ""));
    expect(names).toContain("Messages");
    expect(names.length).toBeGreaterThan(1);
  });

  it("lists reports in a table whose rows open the report", async () => {
    await signInClient("ch-user-17");
    renderAt("/client/reports");
    const table = await screen.findByRole("table", { name: "Released reports" });
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Period",
      "Report",
      "Cases completed",
      "Policy violations",
      "Released",
    ]);
  });

  it("opens Case results on what needs action, and recording an action closes that loop", async () => {
    await signInClient("ch-mod-04");
    renderAt("/client/cases");
    const switcher = await screen.findByRole("tablist", { name: "Case result views" }).catch(() => null);
    const needsTab = switcher
      ? within(switcher).getAllByRole("tab")[0]
      : await screen.findByRole("tab", { name: /^Needs action \(\d+\)$/ });
    expect(needsTab).toHaveAttribute("aria-selected", "true");
    const before = Number(needsTab.textContent!.match(/\((\d+)\)/)![1]);
    expect(before).toBeGreaterThan(0);

    const table = await screen.findByRole("table", { name: "Case results" });
    fireEvent.click(within(table).getAllByRole("button", { name: /^Record action for / })[0]);
    const dialog = await screen.findByRole("dialog");
    const record = within(dialog).getByRole("button", { name: "Record action" });
    expect(record).toBeDisabled(); // a choice is needed first
    fireEvent.click(within(dialog).getByLabelText("Post removed"));
    fireEvent.click(record);

    expect(await screen.findByText(/RCS has been told/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByRole("tab")[0].textContent).toContain(`(${before - 1})`),
    );
  });
});
