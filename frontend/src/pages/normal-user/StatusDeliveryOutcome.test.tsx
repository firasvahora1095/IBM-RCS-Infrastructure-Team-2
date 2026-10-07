import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StatusLookupPage } from "./StatusLookupPage";
import * as services from "../../services";
import { PLATFORM_NOTIFIED_SENTENCE } from "../../design-tokens/outcomeLabels";

/**
 * B2B spec S4: the Reporter is told CommunityHub has been notified only once
 * the result has actually been delivered, and never for a no-violation
 * outcome. Delivery errors never reach the public page.
 */
async function showComplete(outcome: string, delivered: boolean) {
  vi.spyOn(services, "getStatus").mockResolvedValueOnce({
    case_id: "RCS-4H8P-2DXC",
    status: "Complete",
    final_outcome: outcome,
    public_delivery_confirmed: delivered,
  });
  render(
    <MemoryRouter>
      <StatusLookupPage />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Case ID"), { target: { value: "RCS-4H8P-2DXC" } });
  fireEvent.click(screen.getByRole("button", { name: "Check status" }));
  await screen.findByRole("heading", { name: /Violation Found/ });
}

describe("StatusLookupPage — delivery-aware outcome", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("says CommunityHub was notified once a violation result was delivered", async () => {
    await showComplete("POLICY_VIOLATION_FOUND", true);
    expect(screen.getByText(PLATFORM_NOTIFIED_SENTENCE)).toBeInTheDocument();
  });

  it("doesn't claim notification while delivery is still pending or failing", async () => {
    await showComplete("POLICY_VIOLATION_FOUND", false);
    expect(screen.queryByText(PLATFORM_NOTIFIED_SENTENCE)).not.toBeInTheDocument();
  });

  it("never adds it to a no-violation outcome", async () => {
    await showComplete("NO_VIOLATION_FOUND", true);
    expect(screen.queryByText(PLATFORM_NOTIFIED_SENTENCE)).not.toBeInTheDocument();
  });

  it("keeps the notified sentence free of removal or enforcement claims (RT-01 scope note)", () => {
    expect(PLATFORM_NOTIFIED_SENTENCE).not.toMatch(/remov|actioned|reported to/i);
  });
});
