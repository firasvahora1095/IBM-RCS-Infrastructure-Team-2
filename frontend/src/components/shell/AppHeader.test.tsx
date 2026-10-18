import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("shows the IBM product name", () => {
    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(screen.getByText("Content Safety Reporting")).toBeInTheDocument();
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
