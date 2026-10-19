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

const PROBLEM = "Every harmful-video report lands on a human. Nothing protects them.";

describe("RCS landing page", () => {
  it("makes the problem statement the one H1, with a line on why it matters", () => {
    renderPage();
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(PROBLEM);
    const hero = screen.getByRole("region", { name: PROBLEM });
    expect(within(hero).getByText(/nothing in their tools limits how much they see/)).toBeInTheDocument();
  });

  it("spells out Responsible Content Safety in the hero lockup and on first use in the copy", () => {
    renderPage();
    const hero = screen.getByRole("region", { name: PROBLEM });
    expect(within(hero).getByText("Responsible Content Safety")).toBeInTheDocument();
    expect(within(hero).getByText(/^Responsible Content Safety \(RCS\) reviews/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Responsible Content Safety (RCS) home" })).toHaveAttribute("href", "/rcs");
    expect(screen.getByText(/^Responsible Content Safety \(RCS\) is an IBM × RMIT capstone prototype/)).toBeInTheDocument();
  });

  it("credits RMIT Team 6 with IBM in the hero, the nav and a team section, in the agreed order", () => {
    renderPage();
    const hero = screen.getByRole("region", { name: PROBLEM });
    expect(within(hero).getByText("RMIT Team 6, with IBM")).toBeInTheDocument();
    expect(within(hero).getByRole("link", { name: "Meet the team" })).toHaveAttribute("href", "#team");
    expect(within(screen.getByRole("navigation", { name: "RCS" })).getByRole("link", { name: "The team" })).toBeInTheDocument();

    const team = screen.getByRole("region", { name: "Built by RMIT Team 6, with IBM." });
    const cards = within(team).getAllByRole("listitem");
    const expected = [
      ["Hyuna Bae", "Project Manager", "built the AI Buddy and the exposure and cooldown logic, set up deployment and led end-to-end testing"],
      ["Janataarah Begum", "Business Analyst / QA", "S1–S4 severity scale"],
      ["Aleeya Ahmad", "UX / Research", "designed all three roles in Figma"],
      ["Firas Vahora", "Developer", "delivered the live watsonx Orchestrate integration"],
      ["Aiden Brundell", "Developer", "the watsonx vision call and the audit log"],
    ];
    expect(cards).toHaveLength(expected.length);
    expected.forEach(([name, role, did], i) => {
      expect(within(cards[i]).getByRole("heading", { name })).toBeInTheDocument();
      expect(cards[i]).toHaveTextContent(role);
      expect(cards[i]).toHaveTextContent(did);
    });
    expect(screen.queryByText(/Team 2/)).not.toBeInTheDocument();
  });

  it("keeps the header to five section links, one Sign in menu and Get started", () => {
    renderPage();
    const nav = screen.getByRole("navigation", { name: "RCS" });
    expect(within(nav).getAllByRole("link").map((l) => l.textContent)).toEqual([
      "How it works",
      "Product",
      "The team",
      "Security",
      "FAQ",
    ]);
    expect(within(screen.getByRole("navigation", { name: "Sign in" })).getByText("Sign in")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Client sign in" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Staff sign in" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Get started" }).length).toBeGreaterThanOrEqual(2);
  });

  it("shows real product screens in the tour, each with a description", () => {
    renderPage();
    const tour = screen.getByRole("region", { name: "One service, three views." });
    const tabs = within(tour).getAllByRole("tab").map((t) => t.textContent);
    expect(tabs).toEqual(["Reviewer workspace", "Manager oversight", "Client portal"]);
    const images = [...tour.querySelectorAll("img")];
    expect(images.map((img) => img.getAttribute("src"))).toEqual([
      "/landing/reviewer-workspace.webp?v=3",
      "/landing/manager-overview.webp?v=3",
      "/landing/client-case-results.webp?v=3",
    ]);
    images.forEach((img) => expect(img.getAttribute("alt")?.length).toBeGreaterThan(60));
  });

  it("shows the real result fields and makes no signing claim", () => {
    renderPage();
    const integration = screen.getByRole("region", { name: "A report button in. A short, structured result out." });
    const payload = within(integration).getByLabelText("Results payload example", { selector: "*" });
    for (const field of ["delivery_id", "case_id", "organisation_id", "outcome", "final_severity", "completed_at", "moderation_status", "source_url"]) {
      expect(payload.textContent).toContain(`"${field}"`);
    }
    // No claim that results are cryptographically signed: the backend does not sign them.
    expect(document.body.textContent).not.toMatch(/signature|signed (and|result|payload|webhook|deliver)/i);
  });

  it("sells the outcomes and lists every feature by role, including AI Buddy", () => {
    renderPage();
    const value = screen.getByRole("region", { name: "Moderation you can stand behind." });
    ["Meet your duty of care", "Decisions you can defend", "Live in two touchpoints", "Proof for your leadership"].forEach(
      (t) => expect(within(value).getByRole("heading", { name: t })).toBeInTheDocument(),
    );
    const product = screen.getByRole("region", { name: "One service, three views." });
    expect(within(product).getByRole("heading", { name: "AI Buddy, for every Reviewer and Manager" })).toBeInTheDocument();
    ["For Reviewers", "For Managers", "For your platform", "For the public"].forEach((who) =>
      expect(within(product).getByRole("heading", { name: who })).toBeInTheDocument(),
    );
  });

  it("writes the roles as proper nouns: Reviewer, Manager, Client", () => {
    const { container } = renderPage();
    const copy = container.cloneNode(true) as HTMLElement;
    // Code samples and URLs are not prose.
    copy.querySelectorAll(".cds--snippet").forEach((el) => el.remove());
    const text = copy.textContent ?? "";
    expect(text).not.toMatch(/\b(reviewer|manager|client)s?\b/);
    const labels = [...container.querySelectorAll("[aria-label], [alt]")]
      .map((el) => `${el.getAttribute("aria-label") ?? ""} ${el.getAttribute("alt") ?? ""}`)
      .join(" ");
    expect(labels).not.toMatch(/\b(reviewer|manager|client)s?\b/);
  });

  it("says plainly what is real, what is simulated and what is synthetic", () => {
    renderPage();
    const disclosure = screen.getByRole("group", { name: "About this prototype" });
    expect(within(disclosure).getByText("Simulated pilot")).toBeInTheDocument();
    expect(within(disclosure).getByText(/a simulated platform like Reddit/)).toBeInTheDocument();
    expect(within(disclosure).getByText(/Every case, person, video and report is invented/)).toBeInTheDocument();
  });

  it("walks the hero demo like the real content warning: consent, proceed at full blur, SOS, decline", async () => {
    const user = userEvent.setup();
    renderPage();
    const demo = screen.getByRole("heading", { name: "Try it: a flagged case" }).closest(".rcs-reveal") as HTMLElement;

    expect(within(demo).getByText("Would you like to proceed?")).toBeInTheDocument();
    const proceed = within(demo).getByRole("button", { name: "Proceed" });
    expect(proceed).toBeDisabled();
    await user.click(within(demo).getByLabelText(/I consent to proceed/));
    expect(proceed).toBeEnabled();
    await user.click(proceed);

    expect(within(demo).getByRole("slider", { name: /Blur intensity/ })).toHaveAttribute("aria-valuenow", "100");
    // Grayscale starts off in the demo (the sample frame reads better in colour) and is one click away.
    expect(within(demo).getByRole("switch", { name: /Grayscale/ })).not.toBeChecked();
    expect(within(demo).getByText("Sample frame, not real footage")).toBeInTheDocument();

    await user.click(within(demo).getByRole("button", { name: "SOS" }));
    expect(within(demo).getByText("SOS sent. The content is hidden at once.")).toBeInTheDocument();
    await user.click(within(demo).getByRole("button", { name: "Start again" }));

    await user.click(within(demo).getByRole("button", { name: "Decline" }));
    expect(within(demo).getByText("Case declined.")).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = renderPage();
    expect(await axe(container)).toHaveNoViolations();
  }, 30000);
});
