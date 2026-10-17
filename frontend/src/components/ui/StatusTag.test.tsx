import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusTag } from "./StatusTag";

/** WCAG relative luminance and contrast ratio, so the colour pair is measured rather than eyeballed. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Carbon palette values (the app takes Green 60 from @carbon/colors into --rcs-success-strong).
const GREEN_50 = "#24a148";
const GREEN_60 = "#198038";
const WHITE = "#ffffff";

describe("success tag", () => {
  it("is white text on a solid green", () => {
    render(<StatusTag tone="success">Available</StatusTag>);
    const tag = screen.getByText("Available").closest(".cds--tag") as HTMLElement;
    expect(tag.style.backgroundColor).toBe("var(--rcs-success-strong)");
    expect(tag.style.color).toBe("var(--cds-text-on-color)");
  });

  it("passes WCAG AA for tag-size text, which the success token Green 50 would not", () => {
    expect(contrast(GREEN_50, WHITE)).toBeLessThan(4.5); // why the lighter green is not used under white text
    expect(contrast(GREEN_60, WHITE)).toBeGreaterThanOrEqual(4.5);
  });
});
