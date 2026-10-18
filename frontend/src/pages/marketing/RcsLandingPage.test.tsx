import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
      within(hero).getByText(/Moderators watch violence and abuse so that no one else has to/),
    ).toBeInTheDocument();
    // And the dedicated section says it again, with what RCS changes.
    expect(
      screen.getByRole("heading", { name: /The people who review harmful videos are exposed to them again and again/ }),
    ).toBeInTheDocument();
  });

  it("introduces every member of the team with their role and what they did", () => {
    renderPage();
    const team = screen.getByRole("region", { name: "Built by RMIT Team 2, with IBM." });
    const cards = within(team).getAllByRole("listitem");
    expect(cards).toHaveLength(5);
    const names = [
      ["Hyuna Bae", "Project manager"],
      ["Janataarah Begum", "Business analyst"],
      ["Aleeya Ahmad", "UX designer"],
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

  it("lists Meet the team and About this prototype in the section bar", () => {
    renderPage();
    const nav = screen.getByRole("navigation", { name: "On this page" });
    const labels = within(nav).getAllByRole("link").map((l) => l.textContent);
    expect(labels).toContain("Meet the team");
    expect(labels).toContain("About this prototype");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = renderPage();
    expect(await axe(container)).toHaveNoViolations();
  }, 30000);
});
