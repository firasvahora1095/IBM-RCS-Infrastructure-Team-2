import { render, screen, within } from "@testing-library/react";
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
});
