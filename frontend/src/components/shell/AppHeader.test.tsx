import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("labels the page as the reporting form, and its logo leads to the product site, not back to the form", () => {
    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(screen.getByRole("banner", { name: "Responsible Content Safety (RCS) — Reporting" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Responsible Content Safety (RCS) home" })).toHaveAttribute("href", "/");
  });

  it("has an accessible Help action", () => {
    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Help" })).toBeInTheDocument();
  });

  it("labels the page as demo data while the mock data source is active (Task 96)", () => {
    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(screen.getByText("Demo data")).toBeInTheDocument();
  });
});
