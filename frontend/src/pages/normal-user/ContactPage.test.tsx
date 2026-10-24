import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../App";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("Contact us", () => {
  it("leads with how to reach a person, then the frequently asked questions grouped by the journey", async () => {
    renderAt("/report/contact");
    expect(await screen.findByRole("heading", { level: 1, name: "Contact us" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "support@rcs.example" })).toHaveAttribute("href", "mailto:support@rcs.example");
    const faq = screen.getByRole("region", { name: "Frequently asked questions" });
    ["Before you report", "After you report", "Your privacy"].forEach((group) =>
      expect(within(faq).getByRole("heading", { level: 3, name: group })).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Sprint/)).not.toBeInTheDocument();
  });

  it("is a tab beside Report content and Check case status, and the Help button opens it at the questions", async () => {
    renderAt("/report/contact#faq");
    const nav = await screen.findByRole("navigation", { name: "Reporting" });
    const names = within(nav).getAllByRole("link").map((l) => l.textContent);
    expect(names).toEqual(["Report content", "Check case status", "Contact us"]);
    expect(within(nav).getByRole("link", { name: "Contact us" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Help" })).toBeInTheDocument();
  });

  it("opens the RCS landing page at the front door, and the report flow under /report", async () => {
    const landing = renderAt("/");
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    landing.unmount();
    renderAt("/report");
    expect(await screen.findByRole("heading", { level: 1, name: "Report content for review" })).toBeInTheDocument();
  });
});
