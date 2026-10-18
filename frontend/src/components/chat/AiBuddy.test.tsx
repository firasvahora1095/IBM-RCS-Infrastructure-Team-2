import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as services from "../../services";
import type { BuddyReply } from "../../services/types";
import { seedStaffSession } from "../../test/renderForA11y";
import { AiBuddy } from "./AiBuddy";
import { CASE_LOOKUP_PROMPT, suggestedQuestions } from "./buddyQuestions";
import { BUDDY_STORAGE_KEY } from "./useBuddyConversation";

const plain: BuddyReply = { reply: "You have 47 minutes of exposure today.", live_as_of: "2026-10-17T08:42:00Z", case: null, links: [], fallback: false };

function renderBuddy() {
  return render(
    <MemoryRouter>
      <AiBuddy />
    </MemoryRouter>,
  );
}

async function openPanel(user = userEvent.setup()) {
  await user.click(screen.getByRole("button", { name: "Open AI Buddy" }));
  return user;
}

describe("AiBuddy", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    seedStaffSession("auditor");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.removeAttribute("data-ai-buddy");
  });

  it("renders nothing when nobody is signed in", () => {
    sessionStorage.clear();
    renderBuddy();
    expect(screen.queryByRole("button", { name: "Open AI Buddy" })).not.toBeInTheDocument();
  });

  it("starts closed, opens on the header button and puts focus in the input", async () => {
    renderBuddy();
    expect(screen.queryByRole("complementary", { name: "Open AI Buddy" })).not.toBeInTheDocument();
    await openPanel();
    expect(screen.getByRole("complementary", { name: "AI Buddy" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Ask AI Buddy")).toHaveFocus());
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it.each(["auditor", "manager"] as const)("offers the four %s starter questions, written in full", async (role) => {
    seedStaffSession(role);
    renderBuddy();
    await openPanel();
    for (const question of suggestedQuestions(role, false)) {
      expect(screen.getByRole("button", { name: question })).toBeInTheDocument();
    }
  });

  it("gives a Super Auditor the queue questions and no one else", async () => {
    seedStaffSession("auditor", true);
    renderBuddy();
    await openPanel();
    expect(screen.getByRole("button", { name: "When should I take a case myself?" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "What happens to a case if I decline it?" })).not.toBeInTheDocument();
    expect(suggestedQuestions("auditor", false)).not.toContain("When should I take a case myself?");
    expect(suggestedQuestions("manager", true)).toEqual(suggestedQuestions("manager", false));
  });

  it("offers case questions while an Auditor is on a case, and the usual ones elsewhere", () => {
    expect(suggestedQuestions("auditor", false, true)).toEqual([
      "What does S2 mean?",
      "What happens if I decline this case?",
      "What if I disagree with the AI severity?",
    ]);
    expect(suggestedQuestions("auditor", false, false)).not.toContain("What does S2 mean?");
    expect(suggestedQuestions("manager", false, true)).toEqual(suggestedQuestions("manager", false, false));
  });

  it("sends a starter question with the session token and shows the answer with its live time", async () => {
    const chat = vi.spyOn(services, "aiChat").mockResolvedValue(plain);
    renderBuddy();
    const user = await openPanel();
    await user.click(screen.getByRole("button", { name: "What happens to a case if I decline it?" }));

    expect(chat).toHaveBeenCalledWith("What happens to a case if I decline it?", "test-token", []);
    expect(await screen.findAllByText(/47 minutes of exposure today/)).not.toHaveLength(0);
    expect(screen.getByText(/Live data, read at/)).toBeInTheDocument();
  });

  it("sends earlier turns so a follow-up makes sense", async () => {
    const chat = vi.spyOn(services, "aiChat").mockResolvedValue(plain);
    renderBuddy();
    const user = await openPanel();
    await user.type(screen.getByLabelText("Ask AI Buddy"), "First question{Enter}");
    await screen.findAllByText(/47 minutes/);
    await user.type(screen.getByLabelText("Ask AI Buddy"), "And a follow-up{Enter}");

    await waitFor(() => expect(chat).toHaveBeenCalledTimes(2));
    expect(chat.mock.calls[1][2]).toEqual([
      { role: "user", text: "First question" },
      { role: "assistant", text: plain.reply },
    ]);
  });

  it("sends on Enter but keeps a new line on Shift+Enter", async () => {
    const chat = vi.spyOn(services, "aiChat").mockResolvedValue(plain);
    renderBuddy();
    const user = await openPanel();
    const input = screen.getByLabelText("Ask AI Buddy");
    await user.type(input, "line one{Shift>}{Enter}{/Shift}line two");
    expect(chat).not.toHaveBeenCalled();
    expect(input).toHaveValue("line one\nline two");
    await user.type(input, "{Enter}");
    await waitFor(() => expect(chat).toHaveBeenCalledWith("line one\nline two", "test-token", []));
  });

  it("shows a Manager's case lookup as all agreed fields, and an Auditor's without Manager-only ones", async () => {
    seedStaffSession("manager");
    vi.spyOn(services, "aiChat").mockResolvedValue({
      reply: "AR-2026-00500 is currently Complete.",
      live_as_of: "2026-10-17T08:42:00Z",
      case: {
        case_id: "AR-2026-00500",
        status: "Complete",
        ai_severity: "S3",
        final_auditor_severity: null,
        final_outcome: "Violation Found",
        assigned_auditor: "auditor-02",
        delivery_status: "NEEDS_ATTENTION",
      },
      links: [{ label: "Open case review", to: "/manager/cases/AR-2026-00500/review" }],
      fallback: false,
    });
    renderBuddy();
    const user = await openPanel();
    await user.type(screen.getByLabelText("Ask AI Buddy"), "What is happening with AR-2026-00500?{Enter}");

    const list = await screen.findByLabelText("Summary of AR-2026-00500");
    expect(within(list).getByText("Final Auditor severity")).toBeInTheDocument();
    expect(within(list).getByText("Not yet set")).toBeInTheDocument(); // an empty field is spelled out, not left blank
    expect(within(list).getByText("NEEDS_ATTENTION")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open case review" })).toHaveAttribute("href", "/manager/cases/AR-2026-00500/review");
  });

  it("does not list fields the role was not sent", async () => {
    vi.spyOn(services, "aiChat").mockResolvedValue({
      reply: "AR-2026-00417 is currently Ready for Review.",
      live_as_of: null,
      case: { case_id: "AR-2026-00417", status: "Ready for Review", ai_severity: "S2", final_auditor_severity: null, final_outcome: null },
      links: [],
      fallback: false,
    });
    renderBuddy();
    const user = await openPanel();
    await user.type(screen.getByLabelText("Ask AI Buddy"), "AR-2026-00417{Enter}");
    const list = await screen.findByLabelText("Summary of AR-2026-00417");
    expect(within(list).queryByText("Assigned Auditor")).not.toBeInTheDocument();
    expect(within(list).queryByText("Delivery")).not.toBeInTheDocument();
  });

  it("shows the safe fallback as a notice, with no invented detail", async () => {
    vi.spyOn(services, "aiChat").mockResolvedValue({
      reply: "I don't have enough verified information to answer that case-specific question. Open the case from your queue or contact your Manager.",
      live_as_of: null,
      case: null,
      links: [],
      fallback: true,
    });
    renderBuddy();
    const user = await openPanel();
    await user.type(screen.getByLabelText("Ask AI Buddy"), "AR-2026-99999{Enter}");
    expect(await screen.findByText("Not enough verified information")).toBeInTheDocument();
    // The same words also go to the hidden live region, so they appear more than once.
    expect(screen.getAllByText(/contact your Manager/).length).toBeGreaterThan(0);
  });

  it("shows an error with Try again, and Try again asks the same question once", async () => {
    const chat = vi.spyOn(services, "aiChat").mockRejectedValueOnce(new Error("down")).mockResolvedValue(plain);
    renderBuddy();
    const user = await openPanel();
    await user.type(screen.getByLabelText("Ask AI Buddy"), "Is it down?{Enter}");
    expect(await screen.findByText("Couldn't answer")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findAllByText(/47 minutes/);
    expect(chat).toHaveBeenCalledTimes(2);
    expect(chat.mock.calls[1][0]).toBe("Is it down?");
    expect(screen.getAllByText("Is it down?")).toHaveLength(1); // the question isn't duplicated
    expect(screen.queryByText("Couldn't answer")).not.toBeInTheDocument();
  });

  it("prefills the input for a case lookup instead of sending it", async () => {
    seedStaffSession("manager");
    const chat = vi.spyOn(services, "aiChat").mockResolvedValue(plain);
    renderBuddy();
    const user = await openPanel();
    await user.click(screen.getByRole("button", { name: CASE_LOOKUP_PROMPT }));
    expect(chat).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Ask AI Buddy")).toHaveValue("What is happening with ");
  });

  it("closes on Escape and returns focus to the header button", async () => {
    renderBuddy();
    const user = await openPanel();
    await waitFor(() => expect(screen.getByLabelText("Ask AI Buddy")).toHaveFocus());
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("complementary", { name: "Open AI Buddy" })).not.toBeInTheDocument();
    // Focus goes back in an effect, so wait for it rather than assuming it has already run.
    await waitFor(() => expect(screen.getByRole("button", { name: "Open AI Buddy" })).toHaveFocus());
  });

  it("makes room for the panel on wide screens only while it is open", async () => {
    renderBuddy();
    const user = await openPanel();
    // The attribute is set and removed in effects, which React may run a moment after the click or key press.
    await waitFor(() => expect(document.documentElement).toHaveAttribute("data-ai-buddy", "open"));
    // Escape is handled by the panel, so focus must have moved into it first (it does, on the next frame).
    await waitFor(() => expect(screen.getByLabelText("Ask AI Buddy")).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.documentElement).not.toHaveAttribute("data-ai-buddy"));
  });

  it("keeps the conversation in sessionStorage only, and Clear conversation removes it", async () => {
    vi.spyOn(services, "aiChat").mockResolvedValue(plain);
    localStorage.setItem(BUDDY_STORAGE_KEY, "old build data");
    renderBuddy();
    const user = await openPanel();
    expect(localStorage.getItem(BUDDY_STORAGE_KEY)).toBeNull();
    await user.click(screen.getByRole("button", { name: "What happens to a case if I decline it?" }));
    await screen.findAllByText(/47 minutes/);
    expect(sessionStorage.getItem(BUDDY_STORAGE_KEY)).toContain("47 minutes");

    await user.click(screen.getByRole("button", { name: "Clear conversation" }));
    expect(sessionStorage.getItem(BUDDY_STORAGE_KEY)).toContain("47 minutes"); // a confirm step first, so it can't wipe by accident
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(sessionStorage.getItem(BUDDY_STORAGE_KEY) ?? "[]").toBe("[]"); // nothing of the conversation is kept
    expect(screen.getByText("How can I help?")).toBeInTheDocument();
  });

  it("is read-only: nothing in the panel can assign, approve, retry, release or remove", async () => {
    vi.spyOn(services, "aiChat").mockResolvedValue(plain);
    renderBuddy();
    const user = await openPanel();
    await user.click(screen.getByRole("button", { name: "What happens to a case if I decline it?" }));
    await screen.findAllByText(/47 minutes/);
    const panel = screen.getByRole("complementary", { name: "AI Buddy" });
    const names = within(panel)
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label") ?? b.textContent ?? "");
    expect(names.filter((n) => /assign|approve|release|remove|delete|retry delivery|escalate/i.test(n))).toEqual([]);
  });

  describe("accessibility (axe)", () => {
    const states: [string, BuddyReply | Error | null][] = [
      ["empty", null],
      ["an answer with live data", plain],
      [
        "a case summary with a link",
        {
          reply: "AR-2026-00500 is currently Complete.",
          live_as_of: "2026-10-17T08:42:00Z",
          case: { case_id: "AR-2026-00500", status: "Complete", ai_severity: "S3", final_auditor_severity: "S3", final_outcome: "Violation Found", assigned_auditor: "auditor-02", delivery_status: "SUCCESS" },
          links: [{ label: "Open case review", to: "/manager/cases/AR-2026-00500/review" }],
          fallback: false,
        },
      ],
      ["the safe fallback", { reply: "I don't have enough verified information to answer that.", live_as_of: null, case: null, links: [], fallback: true }],
      ["an error", new Error("down")],
    ];

    it.each(states)("has no violations: %s", async (_name, reply) => {
      if (reply instanceof Error) vi.spyOn(services, "aiChat").mockRejectedValue(reply);
      else if (reply) vi.spyOn(services, "aiChat").mockResolvedValue(reply);
      renderBuddy();
      const user = await openPanel();
      if (reply) {
        await user.type(screen.getByLabelText("Ask AI Buddy"), "Question{Enter}");
        await waitFor(() => expect(screen.queryByText("Looking that up…")).not.toBeInTheDocument());
      }
      // The panel is portalled to <body>, so check the whole document, not just the render container.
      expect(await axe(document.body)).toHaveNoViolations();
    });
  });
});
