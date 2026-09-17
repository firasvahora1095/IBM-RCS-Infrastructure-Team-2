import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("shows the IBM product name", () => {
    render(<AppHeader />);
    expect(screen.getByText("Content Safety Reporting")).toBeInTheDocument();
  });

  it("has an accessible Help action", () => {
    render(<AppHeader />);
    expect(screen.getByRole("button", { name: "Help" })).toBeInTheDocument();
  });

  it("labels the page as demo data while the mock data source is active (Task 96)", () => {
    render(<AppHeader />);
    expect(screen.getByText("Demo data")).toBeInTheDocument();
  });
});
