import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { ManagerTopNav } from "./ManagerTopNav";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ManagerTopNav />
    </MemoryRouter>
  );
}

describe("ManagerTopNav", () => {
  it("shows all five sections from the Figma TopNav", () => {
    renderAt("/manager");
    ["Dashboard", "Case Oversight", "SOS Inbox", "Reassignment Queue", "Validation"].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("links only the two Sprint 2 sections and marks the other three as Sprint 3", () => {
    renderAt("/manager");
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/manager");
    expect(screen.getByRole("link", { name: "Case Oversight" })).toHaveAttribute("href", "/manager/cases");
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getAllByText("(Sprint 3)")).toHaveLength(3);
    expect(screen.getByText("SOS Inbox").closest("[aria-disabled]")).toHaveAttribute("aria-disabled", "true");
  });

  it("marks the current section for assistive technology", () => {
    renderAt("/manager/cases");
    expect(screen.getByRole("link", { name: "Case Oversight" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });
});
