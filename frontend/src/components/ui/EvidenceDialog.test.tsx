import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { EvidenceDialog } from "./EvidenceDialog";
import type { MetricEvidence } from "../../services/types";

const evidence: MetricEvidence = {
  title: "AI–Auditor override rate",
  definition: "Decided cases where the final severity differs from the AI's.",
  source_fields: ["cases.severity_tier", "cases.auditor_severity_score"],
  records_included: 23,
  records_eligible: 172,
  calculated_at: "2026-10-02T10:41:00Z",
  case_ids: ["RCS-0001", "RCS-0002"],
  case_ids_truncated: true,
};

function renderDialog(onClose = vi.fn(), override: Partial<MetricEvidence> = {}) {
  render(
    <MemoryRouter>
      <EvidenceDialog
        open
        onClose={onClose}
        evidence={{ ...evidence, ...override }}
        value="13.4%"
        organisation="CommunityHub"
        period="1–30 Sep 2026"
      />
    </MemoryRouter>,
  );
  return onClose;
}

describe("EvidenceDialog", () => {
  it("states what a figure counts, where it comes from and which cases it covers (§1.4)", () => {
    renderDialog();
    expect(screen.getByText("AI–Auditor override rate: 13.4%")).toBeInTheDocument();
    expect(screen.getByText("23 of 172 eligible")).toBeInTheDocument();
    expect(screen.getByText("cases.auditor_severity_score")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "RCS-0001" })).toHaveAttribute("href", "/manager/cases?search=RCS-0001");
    expect(screen.getByText(/Showing the first 2 of 23/)).toBeInTheDocument();
  });

  it("closes with Escape and with its one Close button", () => {
    const onClose = renderDialog();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getAllByRole("button", { name: "Close" }).at(-1)!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("explains an empty list instead of showing a blank table", () => {
    renderDialog(vi.fn(), {
      title: "Auditor protection",
      case_ids: [],
      case_ids_truncated: false,
      records_eligible: null,
    });
    expect(screen.queryByRole("table", { name: "Contributing cases" })).not.toBeInTheDocument();
    expect(screen.getByText(/Auditors are never ranked or compared/)).toBeInTheDocument();
  });
});
