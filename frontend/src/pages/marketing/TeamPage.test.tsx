import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { TeamPage } from "./TeamPage";
import { REPO_URL, TEAM } from "./team";

function renderPage() {
  return render(
    <MemoryRouter>
      <TeamPage />
    </MemoryRouter>,
  );
}

describe("Team page", () => {
  it("credits RMIT Team 6 with IBM and links to the code", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: /The team behind Responsible Content Safety/ })).toBeInTheDocument();
    expect(screen.getByText("RMIT Team 6, with IBM")).toBeInTheDocument();
    const github = screen.getAllByRole("link", { name: /View the code on GitHub/ });
    github.forEach((link) => expect(link).toHaveAttribute("href", REPO_URL));
  });

  it("shows the brief: what IBM asked for and what was delivered", () => {
    renderPage();
    const brief = screen.getByRole("region", { name: /IBM asked for a safer way/ });
    expect(within(brief).getByRole("heading", { name: "What IBM asked for" })).toBeInTheDocument();
    expect(within(brief).getByRole("heading", { name: "What we delivered" })).toBeInTheDocument();
  });

  it("profiles all five people in team order, each with three sprints and highlights", () => {
    renderPage();
    const profiles = screen.getAllByRole("article");
    expect(profiles.map((p) => p.id)).toEqual([
      "hyuna-bae",
      "janataarah-begum",
      "aleeya-ahmad",
      "firas-vahora",
      "aiden-brundell",
    ]);
    profiles.forEach((profile, i) => {
      const member = TEAM[i];
      expect(within(profile).getByRole("heading", { name: member.name })).toBeInTheDocument();
      expect(within(profile).getByText(member.role)).toBeInTheDocument();
      ["Sprint 1", "Sprint 2", "Sprint 3"].forEach((s) => expect(within(profile).getByText(s)).toBeInTheDocument());
      member.highlights.forEach((h) => expect(within(profile).getByText(h)).toBeInTheDocument());
    });
    // The index at the top jumps to each profile.
    const index = screen.getByRole("navigation", { name: "Team members" });
    expect(within(index).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(
      TEAM.map((m) => `#${m.slug}`),
    );
  });

  it("copies a person's highlights as resume bullets", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    renderPage();
    const aleeya = screen.getByRole("article", { name: "Aleeya Ahmad" });
    await user.click(within(aleeya).getByRole("button", { name: "Copy Aleeya Ahmad's highlights" }));
    const copied = writeText.mock.calls[0][0];
    expect(copied).toMatch(/^UX \/ Research, Responsible Content Safety \(IBM × RMIT capstone\), 2026/);
    expect(copied).toContain(`• ${TEAM[2].highlights[0]}`);
    expect(within(aleeya).getByText("Copied")).toBeInTheDocument();
  });

  it("writes the roles as proper nouns: Auditor, Manager, Client", () => {
    const { container } = renderPage();
    expect(container.textContent).not.toMatch(/\b(reviewer|manager|client)s?\b/);
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = renderPage();
    expect(await axe(container)).toHaveNoViolations();
  });
});
