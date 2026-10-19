import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { RcsLandingPage } from "./RcsLandingPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <RcsLandingPage />
    </MemoryRouter>,
  );
}

describe("RCS landing page", () => {
  it("states the problem before anything else, in plain words", () => {
    renderPage();
    const hero = screen.getByRole("region", { name: /Content moderation that protects/ });
    expect(
      within(hero).getByText("Every harmful-video report lands on a human. Nothing protects them."),
    ).toBeInTheDocument();
    // And the dedicated section says it again, with what RCS changes.
    expect(
      screen.getByRole("heading", { name: /The people who review harmful videos are exposed to them again and again/ }),
    ).toBeInTheDocument();
  });

  it("shows the hero clip blurred behind a content warning until the visitor proceeds", async () => {
    const user = userEvent.setup();
    renderPage();
    const hero = screen.getByRole("region", { name: /Content moderation that protects/ });
    expect(within(hero).getByText(/Flagged for review/)).toBeInTheDocument();
    await user.click(within(hero).getByRole("button", { name: "Proceed" }));
    expect(within(hero).queryByText(/Flagged for review/)).not.toBeInTheDocument();
    await user.click(within(hero).getByRole("button", { name: "Blur again" }));
    expect(within(hero).getByText(/Flagged for review/)).toBeInTheDocument();
  });

  it("introduces every member of the team with their role and what they did", () => {
    renderPage();
    const team = screen.getByRole("region", { name: "Built by RMIT Team 2, with IBM." });
    const cards = within(team).getAllByRole("listitem");
    expect(cards).toHaveLength(5);
    const names = [
      ["Hyuna Bae", "Project manager"],
      ["Janataarah Begum", "Business analyst / QA"],
      ["Aleeya Ahmad", "UX / Research"],
      ["Firas Vahora", "Developer"],
      ["Aiden Brundell", "Developer"],
    ];
    names.forEach(([name, role], i) => {
      expect(cards[i]).toHaveTextContent(name);
      expect(cards[i]).toHaveTextContent(role);
    });
    // Each photo is looked for by a file name the team can drop in, and is labelled with the person.
    expect(within(team).getByRole("img", { name: "Aleeya Ahmad" })).toHaveAttribute("src", "/team/aleeya-ahmad.jpg");
  });

  it("says plainly that CommunityHub is a simulation, and why", () => {
    renderPage();
    const section = screen.getByRole("region", { name: "What is real, and what is simulated" });
    expect(within(section).getByText(/stand-in for a real social platform such as Reddit/)).toBeInTheDocument();
    expect(within(section).getByText(/could not get API access/)).toBeInTheDocument();
    expect(within(section).getByText(/Every case, person, video and report is invented/)).toBeInTheDocument();
  });

  it("ties every figure to what it means", () => {
    renderPage();
    const numbers = screen.getByRole("region", { name: "RCS in numbers" });
    expect(within(numbers).getByText("120 min").parentElement).toHaveTextContent("Daily viewing limit per reviewer");
    expect(within(numbers).getByText("100%").parentElement).toHaveTextContent("Decisions made by a trained person");
  });

  it("has one navigation, not a header and a sticky bar repeating the same links", () => {
    renderPage();
    // The second, sticky "On this page" bar is gone; the header is the only place the sections are listed.
    expect(screen.queryByRole("navigation", { name: "On this page" })).not.toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "RCS" });
    const labels = within(nav)
      .getAllByRole("link")
      .map((l) => l.textContent);
    expect(labels).toContain("Meet the team");
    expect(labels).toContain("How it works");
    expect(labels).not.toContain("About this prototype");
    expect(screen.getByRole("link", { name: "What is simulated" })).toHaveAttribute("href", "/rcs#prototype");
    // Every route to set-up is called the same thing.
    expect(screen.getAllByRole("button", { name: "Get started" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole("button", { name: "Bring RCS to your platform" })).not.toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = renderPage();
    expect(await axe(container)).toHaveNoViolations();
  }, 30000);
});
