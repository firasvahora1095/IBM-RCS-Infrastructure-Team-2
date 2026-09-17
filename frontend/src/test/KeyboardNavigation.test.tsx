import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { AppRoutes } from "../App";
import { mockDataService } from "../services/mock";
import { resetDb } from "../services/mock/store";
import { DEMO_PASSWORD } from "../services/mock/seed";

/**
 * Task 99 — keyboard-only walkthrough of every flow, against the real mock
 * data source and the real routes. Interaction uses Tab, arrow keys, Space,
 * Enter and Escape only: no clicks. The written results live in
 * docs/ux/sprint2-accessibility-baseline.md.
 */

type User = ReturnType<typeof userEvent.setup>;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

async function signIn(staffId: string) {
  const { token, role } = await mockDataService.staffLogin(staffId, DEMO_PASSWORD);
  sessionStorage.setItem("rcs_staff_token", token);
  sessionStorage.setItem("rcs_staff_role", role);
  sessionStorage.setItem("rcs_staff_id", staffId);
  return token;
}

/**
 * Presses Tab until `target` has focus, proving it is reachable by keyboard.
 * Fails with the focus path if it never arrives.
 */
async function tabTo(user: User, target: HTMLElement, max = 60) {
  const path: string[] = [];
  for (let i = 0; i < max; i++) {
    if (document.activeElement === target) return;
    await user.tab();
    const el = document.activeElement as HTMLElement | null;
    path.push(el?.getAttribute("aria-label") || el?.textContent?.trim().slice(0, 30) || el?.tagName || "?");
  }
  throw new Error(`Never reached ${target.outerHTML.slice(0, 80)} by Tab. Focus path: ${path.join(" → ")}`);
}

describe("Keyboard-only walkthrough (Task 99)", () => {
  beforeAll(() => {
    // jsdom has no layout, so Carbon's Dropdown can't scroll the highlighted option into view.
    Element.prototype.scrollIntoView ??= () => {};
  });

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    resetDb();
  });

  it("Upload: switches evidence type with arrow keys, shows the consent error, then submits a link", async () => {
    const user = userEvent.setup();
    renderAt("/");

    const videoTab = await screen.findByRole("tab", { name: "Upload video" });
    await tabTo(user, videoTab);
    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(screen.getByRole("tab", { name: "Paste a link instead" })).toHaveFocus());
    await user.keyboard("{Enter}");

    const link = await screen.findByLabelText("Link to the content");
    await tabTo(user, link);
    await user.keyboard("https://example.com/video/123");

    const submit = screen.getByRole("button", { name: "Submit report" });
    await tabTo(user, submit);
    await user.keyboard("{Enter}");
    expect(
      await screen.findByText("Please confirm you understand how your report will be used before submitting."),
    ).toBeInTheDocument();

    const consent = screen.getByRole("checkbox", { name: /I understand/ });
    await tabTo(user, consent);
    await user.keyboard(" ");
    expect(consent).toBeChecked();

    await tabTo(user, submit);
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { name: "Report received" }, { timeout: 5000 })).toBeInTheDocument();
  });

  it("Case ID confirmation: copy button, update fields and the status link are all reachable", async () => {
    const user = userEvent.setup();
    renderAt("/");
    await tabTo(user, await screen.findByRole("tab", { name: "Upload video" }));
    await user.keyboard("{ArrowRight}{Enter}");
    await tabTo(user, await screen.findByLabelText("Link to the content"));
    await user.keyboard("https://example.com/video/456");
    await tabTo(user, screen.getByRole("checkbox", { name: /I understand/ }));
    await user.keyboard(" ");
    await tabTo(user, screen.getByRole("button", { name: "Submit report" }));
    await user.keyboard("{Enter}");
    await screen.findByRole("heading", { name: "Report received" }, { timeout: 5000 });

    await tabTo(user, screen.getByRole("button", { name: "Copy case ID" }));
    await tabTo(user, screen.getByLabelText("Email (optional)"));
    await user.keyboard("reporter@example.com");
    await tabTo(user, screen.getByLabelText("Phone (optional)"));
    const statusLink = screen.getByRole("link", { name: "Check case status" });
    await tabTo(user, statusLink);
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { name: "Check your case status" })).toBeInTheDocument();
  });

  it("Status lookup: Enter looks up, focus moves to the result, and the add-information dialog opens and closes", async () => {
    const user = userEvent.setup();
    renderAt("/status");

    const input = await screen.findByLabelText("Case ID");
    await tabTo(user, input);
    await user.keyboard("RCS-7Q3M-K91X{Enter}");

    // Regression for the Task 99 finding fixed in 2abb25c: focus must not fall to <body>.
    const heading = await screen.findByRole("heading", { name: "Case RCS-7Q3M-K91X" });
    await waitFor(() => expect(heading).toHaveFocus());

    const addInfo = screen.getByRole("button", { name: "Add more information to this case" });
    await tabTo(user, addInfo);
    await user.keyboard("{Enter}");
    // Focus must move into the dialog, onto its first field (regression for the Task 99 finding).
    const details = await screen.findByLabelText("Additional context or details");
    await waitFor(() => expect(details).toHaveFocus());

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("Staff login: type and Enter signs in and lands on the Auditor queue", async () => {
    const user = userEvent.setup();
    renderAt("/staff/login");

    await tabTo(user, await screen.findByLabelText("Staff ID"));
    await user.keyboard("auditor-1");
    await tabTo(user, screen.getByLabelText("Password"));
    await user.keyboard(`${DEMO_PASSWORD}{Enter}`);

    expect(await screen.findByRole("heading", { name: "Case queue" })).toBeInTheDocument();
  });

  it("Auditor review: gate, summary, workspace controls and severity, start to finish by keyboard", async () => {
    const user = userEvent.setup();
    await signIn("auditor-1");
    renderAt("/auditor/cases/AR-2026-00419");

    // The gate opens with focus on the consent checkbox (04c0140), inside the dialog.
    const consent = await screen.findByRole("checkbox", { name: /I understand this content may be disturbing/ });
    const dialog = consent.closest<HTMLElement>("[role=dialog]")!;
    await waitFor(() => expect(consent).toHaveFocus());
    await user.keyboard(" ");
    expect(consent).toBeChecked();
    const proceed = within(dialog).getByRole("button", { name: "Proceed" });
    await tabTo(user, proceed);
    expect(dialog).toContainElement(proceed);
    await user.keyboard("{Enter}");

    const toReview = await screen.findByRole("button", { name: "Continue to review" });
    await tabTo(user, toReview);
    await user.keyboard("{Enter}");

    const blur = await screen.findByRole("slider", { name: "Blur intensity" });
    await tabTo(user, blur);
    const before = Number(blur.getAttribute("aria-valuenow"));
    await user.keyboard("{ArrowLeft}");
    await waitFor(() => expect(Number(blur.getAttribute("aria-valuenow"))).toBeLessThan(before));

    await tabTo(user, screen.getByRole("button", { name: "Play" }));
    const grayscale = screen.getByRole("switch", { name: "Grayscale" });
    await tabTo(user, grayscale);
    await user.keyboard(" ");
    expect(grayscale).toHaveAttribute("aria-checked", "true");
    await tabTo(user, screen.getByRole("button", { name: /^(Mute|Unmute)$/ }));
    await tabTo(user, screen.getByRole("button", { name: /^SOS/ }));

    await tabTo(user, screen.getByRole("button", { name: "Continue to severity & comment" }));
    await user.keyboard("{Enter}");
    await screen.findByRole("heading", { name: "Severity & comment" });

    const noViolation = screen.getByRole("radio", { name: "No Violation Found" });
    await tabTo(user, noViolation);
    await user.keyboard(" ");
    expect(noViolation).toBeChecked();

    await tabTo(user, screen.getByRole("button", { name: "Continue to submit" }));
    await user.keyboard("{Enter}");
    expect(await screen.findByText("This case has been marked Complete.")).toBeInTheDocument();
  });

  it("Decline: open the reason dialog, pick a reason with the keyboard and submit", async () => {
    const user = userEvent.setup();
    await signIn("auditor-1");
    renderAt("/auditor/cases/AR-2026-00420");

    const gateConsent = await screen.findByRole("checkbox", { name: /I understand this content may be disturbing/ });
    const gate = gateConsent.closest<HTMLElement>("[role=dialog]")!;
    await tabTo(user, within(gate).getByRole("button", { name: "Decline" }));
    await user.keyboard("{Enter}");

    const reason = await screen.findByRole("radio", { name: "Personal Trigger" });
    await tabTo(user, screen.getByRole("radio", { name: "Content more severe than AI indicated" }));
    // Arrow keys move through the radio group; Personal Trigger is the third option.
    await user.keyboard("{ArrowDown}{ArrowDown}");
    await waitFor(() => expect(reason).toBeChecked());

    await tabTo(user, screen.getByRole("button", { name: "Submit decline" }));
    await user.keyboard("{Enter}");
    expect(await screen.findByText(/Your manager will review it directly\./)).toBeInTheDocument();
  });

  it("Cooldown: Talk to my manager, the break toggle and Stop my shift are reachable", async () => {
    const user = userEvent.setup();
    const token = await signIn("auditor-2");
    const { demoScenarios } = await import("../services/mock/demo");
    demoScenarios.startCooldown(token, "S3", 15);
    renderAt("/auditor/cooldown");

    await screen.findByRole("heading", { name: "Cooldown in progress" });
    await tabTo(user, screen.getByRole("button", { name: "Talk to my manager" }));
    await tabTo(user, screen.getByRole("switch", { name: "I'd like to take a break" }));
    await tabTo(user, screen.getByRole("button", { name: "Stop my shift" }));
  });

  it("Manager: TopNav order, SOS acknowledge and follow-up, and reassignment by keyboard", async () => {
    const user = userEvent.setup();
    await signIn("manager-1");
    const view = renderAt("/manager");

    const nav = await screen.findByRole("navigation", { name: "Manager sections" });
    const names = within(nav)
      .getAllByRole("link")
      .map((l) => l.textContent);
    expect(names).toEqual(["Dashboard", "Case Oversight", "SOS Inbox", "Reassignment Queue", "Validation"]);
    const order: string[] = [];
    await tabTo(user, within(nav).getByRole("link", { name: "Dashboard" }));
    for (let i = 0; i < 5; i++) {
      order.push(document.activeElement?.textContent ?? "");
      await user.tab();
    }
    expect(order).toEqual(names);
    view.unmount();

    // SOS: acknowledge from the inbox, then log the follow-up.
    renderAt("/manager/sos");
    await tabTo(user, await screen.findByRole("button", { name: /Acknowledge Marcus Webb.s SOS alert/ }));
    await user.keyboard("{Enter}");
    await tabTo(user, await screen.findByRole("button", { name: "Acknowledge" }));
    await user.keyboard("{Enter}");
    await screen.findByRole("heading", { name: "Log follow-up — Marcus Webb" });
    await tabTo(user, screen.getByLabelText("Follow-up notes"));
    await user.keyboard("Called Marcus; okay to continue.");
    await tabTo(user, screen.getByRole("radio", { name: "Followed up — no further action" }));
    await user.keyboard(" ");
    await tabTo(user, screen.getByRole("button", { name: "Log outcome" }));
    await user.keyboard("{Enter}");
    expect(await screen.findByText(/This SOS alert is now resolved\./)).toBeInTheDocument();
  });

  it("Manager reassignment: the Auditor dropdown opens and selects with the keyboard", async () => {
    const user = userEvent.setup();
    await signIn("manager-1");
    renderAt("/manager/cases/AR-2026-00398/reassign");

    const combo = await screen.findByRole("combobox", { name: /Reassign to another Auditor/ });
    await tabTo(user, combo);
    await user.keyboard("{Enter}");
    await screen.findByRole("option", { name: /Jordan Lee — \d+ min headroom/ });
    await user.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(combo).toHaveTextContent(/Jordan Lee/));

    await tabTo(user, screen.getByRole("button", { name: "Confirm reassignment" }));
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { name: "Reassignment confirmed — AR-2026-00398" })).toBeInTheDocument();
  });
});
