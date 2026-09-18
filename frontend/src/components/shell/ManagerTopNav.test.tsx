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
  it("links all five Figma sections to real routes, with none disabled", () => {
    renderAt("/manager");
    const expected: [string, string][] = [
      ["Dashboard", "/manager"],
      ["Case Oversight", "/manager/cases"],
      ["SOS Inbox", "/manager/sos"],
      ["Reassignment Queue", "/manager/reassignment"],
      ["Validation", "/manager/validation"],
    ];
    for (const [label, href] of expected) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(screen.queryByText(/Sprint 3/)).not.toBeInTheDocument();
  });

  it("marks the current section for assistive technology", () => {
    renderAt("/manager/cases");
    expect(screen.getByRole("link", { name: "Case Oversight" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("keeps a section highlighted on its sub-pages", () => {
    renderAt("/manager/sos/SOS-demo0001");
    expect(screen.getByRole("link", { name: "SOS Inbox" })).toHaveAttribute("aria-current", "page");
  });
});
