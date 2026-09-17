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
});
