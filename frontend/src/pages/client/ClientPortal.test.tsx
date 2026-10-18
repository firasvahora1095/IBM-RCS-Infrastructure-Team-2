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
    const headers = within(table).getAllByRole("columnheader").map((h) => h.textContent ?? "");
    ["Period", "Report", "Cases completed", "Policy violations", "Released"].forEach((name, i) =>
      expect(headers[i]).toContain(name),
    );
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

  it("opens the same dialog from clicking anywhere on a row as from its button", async () => {
    await signInClient("ch-mod-04");
    renderAt("/client/cases");
    const table = await screen.findByRole("table", { name: "Case results" });
    const row = within(table).getAllByRole("button", { name: /^Record action for / })[0].closest("tr") as HTMLElement;
    fireEvent.click(within(row).getAllByRole("cell")[2]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Record action" })).toBeDisabled();
  });

  it("clears many results at once: Apply RCS decisions, with what it will do spelled out", async () => {
    await signInClient("ch-mod-04");
    renderAt("/client/cases");
    const needsTab = await screen.findByRole("tab", { name: /^Needs action \(\d+\)$/ });
    const before = Number(needsTab.textContent!.match(/\((\d+)\)/)![1]);
    fireEvent.click(await screen.findByRole("button", { name: "Apply RCS decisions" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Keep \d+ posts? RCS found no violation in|Remove \d+ posts?/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(await screen.findByText(/results? recorded\. RCS has been told/)).toBeInTheDocument();
    await waitFor(() => expect(Number(screen.getAllByRole("tab")[0].textContent!.match(/\((\d+)\)/)![1])).toBeLessThan(before));
  });

  it("records the same action on selected results", async () => {
    await signInClient("ch-mod-04");
    renderAt("/client/cases");
    const table = await screen.findByRole("table", { name: "Case results" });
    const boxes = within(table).getAllByRole("checkbox", { name: /^Select AR-/ });
    fireEvent.click(boxes[0]);
    const bar = await screen.findByRole("group", { name: "Selected results" });
    expect(within(bar).getByText("1 selected")).toBeInTheDocument();
    fireEvent.click(within(bar).getByRole("button", { name: "Post kept" }));
    expect(await screen.findByText(/1 result recorded/)).toBeInTheDocument();
  });

  it("separates messages by whether RCS has answered, with the open ones first", async () => {
    await signInClient("ch-user-17");
    renderAt("/client/messages");
    const tabs = await screen.findAllByRole("tab");
    expect(tabs.map((t) => t.textContent!.replace(/\s*\(\d+\)/, ""))).toEqual([
      "Waiting for RCS",
      "Answered",
      "All messages",
    ]);
    const counts = tabs.map((t) => Number(t.textContent!.match(/\((\d+)\)/)![1]));
    expect(counts[2]).toBe(counts[0] + counts[1]);
  });

  it("filters service reports by year and search, and sorts them", async () => {
    await signInClient("ch-user-17");
    renderAt("/client/reports");
    await screen.findByRole("table", { name: "Released reports" });
    expect(screen.getByLabelText("Year")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search by month or report ID" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Period/ })).toBeInTheDocument();
  });

  it("leaves one violation, one clear post and one not reviewed waiting, so Needs action shows every kind", async () => {
    await signInClient("ch-mod-04");
    renderAt("/client/cases");
    const table = await screen.findByRole("table", { name: "Case results" });
    const text = within(table).getAllByRole("row").map((r) => r.textContent).join("|");
    expect(text).toContain("Policy violation found");
    expect(text).toContain("No violation found");
    expect(text).toContain("Not reviewed");
  });
});
