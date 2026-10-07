import { describe, expect, it } from "vitest";
import { timelineTooltipAlign } from "./tooltipAlign";

describe("timelineTooltipAlign", () => {
  it("opens away from the edge near either end, so the tooltip is never cut off", () => {
    expect(timelineTooltipAlign(0)).toBe("top-start");
    expect(timelineTooltipAlign(0.1)).toBe("top-start");
    expect(timelineTooltipAlign(0.5)).toBe("top");
    expect(timelineTooltipAlign(0.95)).toBe("top-end");
    expect(timelineTooltipAlign(1)).toBe("top-end");
  });
});
