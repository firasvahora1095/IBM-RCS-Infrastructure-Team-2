import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { IncidentTimeline } from "./IncidentTimeline";
import { formatTimestamp } from "../../utils/formatTimestamp";

describe("formatTimestamp", () => {
  it("formats seconds as MM:SS, matching the Figma timeline", () => {
    expect(formatTimestamp(0)).toBe("00:00");
    expect(formatTimestamp(42)).toBe("00:42");
    expect(formatTimestamp(123)).toBe("02:03");
    expect(formatTimestamp(3725)).toBe("1:02:05");
  });
});

describe("IncidentTimeline", () => {
  it("renders nothing when there are no entries, rather than an empty track", () => {
    const { container } = render(<IncidentTimeline entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the real start/end time for each entry", () => {
    render(
      <IncidentTimeline
        entries={[
          { start: 42, end: 50, severity_tier: "S1" },
          { start: 123, end: 130, severity_tier: "S4" },
        ]}
      />,
    );
    expect(screen.getByText("00:42–00:50")).toBeInTheDocument();
    expect(screen.getByText("02:03–02:10")).toBeInTheDocument();
  });

  it("positions each segment proportionally to its timestamp, not evenly spaced", () => {
    // Latest end is 100s, so the scale spans 120s.
    render(
      <IncidentTimeline
        entries={[
          { start: 12, end: 24, severity_tier: "S2" },
          { start: 60, end: 100, severity_tier: "S3" },
        ]}
      />,
    );
    const [first, second] = screen.getAllByTestId("timeline-segment");
    expect(first.style.left).toBe("10%");
    expect(first.style.width).toBe("10%");
    expect(second.style.left).toBe("50%");
  });

  it("keeps both labels when two entries are only seconds apart (the stagger case)", () => {
    render(
      <IncidentTimeline
        entries={[
          { start: 75, end: 78, severity_tier: "S2" },
          { start: 82, end: 85, severity_tier: "S3" },
        ]}
      />,
    );
    expect(screen.getByText("01:15–01:18")).toBeInTheDocument();
    expect(screen.getByText("01:22–01:25")).toBeInTheDocument();
  });

  it("gives a zero-duration moment its own visible marker, per AR-AI-04", () => {
    render(<IncidentTimeline entries={[{ start: 5, end: 5, severity_tier: "S2" }]} />);
    expect(screen.getByTestId("timeline-marker")).toBeInTheDocument();
    expect(screen.getByText("00:05")).toBeInTheDocument();
  });

  it("labels a tagged point detection with its time and tag, as in Figma 437:232", () => {
    render(
      <IncidentTimeline
        durationSeconds={150}
        entries={[{ start: 75, end: 75, severity_tier: "S3", tag: "weapon_present" }]}
      />,
    );
    expect(screen.getByText("01:15")).toBeInTheDocument();
    expect(screen.getByText("weapon_present")).toBeInTheDocument();
    // 75s of a 150s video sits at the midpoint.
    expect(screen.getByTestId("timeline-marker").style.left).toBe("calc(50% - 5px)");
  });

  it("uses the real video length for the scale when known, and says so when it isn't", () => {
    const { rerender } = render(
      <IncidentTimeline durationSeconds={150} entries={[{ start: 12, end: 20, severity_tier: "S3" }]} />,
    );
    expect(screen.getByText("02:30")).toBeInTheDocument();
    expect(screen.queryByText(/full length isn't available/)).not.toBeInTheDocument();

    rerender(<IncidentTimeline entries={[{ start: 12, end: 20, severity_tier: "S3" }]} />);
    expect(screen.getByText(/full length isn't available/)).toBeInTheDocument();
  });

  it("describes every flagged moment for screen readers", () => {
    render(
      <IncidentTimeline
        entries={[
          { start: 12, end: 20, severity_tier: "S3" },
          { start: 75, end: 75, severity_tier: "S3", tag: "weapon_present" },
        ]}
      />,
    );
    expect(screen.getByText("00:12 to 00:20, S3 High")).toBeInTheDocument();
    expect(screen.getByText("At 01:15, weapon_present, S3 High")).toBeInTheDocument();
  });
});
