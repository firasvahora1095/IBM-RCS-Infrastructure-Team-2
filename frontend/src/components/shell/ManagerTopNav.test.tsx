import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { ManagerTopNav } from "./ManagerTopNav";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ManagerTopNav />
    </MemoryRouter>,
  );
}

describe("ManagerTopNav (Task 103)", () => {
  it("links the six sections to real routes", () => {
    renderAt("/manager");
    const expected: [string, string][] = [
      ["Overview", "/manager"],
      ["Cases", "/manager/cases"],
      ["Deliveries", "/manager/deliveries"],
      ["Reports", "/manager/reports"],
      ["Insights", "/manager/insights"],
      ["Validation", "/manager/validation"],
    ];
    for (const [label, href] of expected) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
    expect(screen.getAllByRole("link")).toHaveLength(6);
    expect(screen.queryByText(/Sprint 3/)).not.toBeInTheDocument();
  });

  it("marks the current section for assistive technology", () => {
    renderAt("/manager/cases");
    expect(screen.getByRole("link", { name: "Cases" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });

  it.each([
    ["/manager/sos/SOS-demo0001", "Overview"],
    ["/manager/reassignment", "Overview"],
    ["/manager/auditors/auditor-1", "Overview"],
    ["/manager/cases/AR-1/reassign", "Overview"],
    ["/manager/cases/AR-1/review", "Cases"],
    ["/manager/messages/MSG-1", "Deliveries"],
    ["/manager/validation", "Validation"],
    ["/manager/audit-logs", "Validation"],
  ])("keeps the owning section highlighted on %s", (path, section) => {
    renderAt(path);
    expect(screen.getByRole("link", { name: section })).toHaveAttribute("aria-current", "page");
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });
});
