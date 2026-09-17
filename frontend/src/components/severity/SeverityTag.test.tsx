import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SeverityTag } from "./SeverityTag";

describe("SeverityTag", () => {
  it("always shows the tier and label as text, not just a colour", () => {
    render(<SeverityTag tier="S3" />);
    // The accessibility guarantee (UR-NFR-01) — text must be present
    // regardless of whether the reader can perceive colour.
    expect(screen.getByText("S3 · High")).toBeInTheDocument();
  });

  it("uses white text on S4's Red 60 fill so the label stays readable", () => {
    render(<SeverityTag tier="S4" />);
    const tag = screen.getByText("S4 · Critical").closest(".cds--tag") as HTMLElement;
    expect(tag.style.backgroundColor).toBe("var(--cds-support-error)");
    expect(tag.style.color).toBe("var(--cds-text-on-color)");
  });

  it("renders every tier without throwing", () => {
    (["S1", "S2", "S3", "S4"] as const).forEach((tier) => {
      const { unmount } = render(<SeverityTag tier={tier} />);
      unmount();
    });
  });
});
