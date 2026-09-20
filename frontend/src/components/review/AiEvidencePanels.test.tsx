import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FlaggedEntities, TranscriptAndAudio } from "./AiEvidencePanels";

describe("FlaggedEntities", () => {
  it("lists each entity with the span it appears in", () => {
    render(<FlaggedEntities entities={[{ label: "Object: blunt weapon", start: 75, end: 100 }]} />);
    expect(screen.getByText("Object: blunt weapon · 01:15–01:40")).toBeInTheDocument();
  });

  it("renders nothing when there are no entities", () => {
    const { container } = render(<FlaggedEntities entities={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("TranscriptAndAudio", () => {
  it("shows timestamped transcript lines and a described audio graph", () => {
    render(
      <TranscriptAndAudio
        transcript={[{ time: 76, text: "Put it down! Put it down now!" }]}
        audioIntensity={[0.1, 0.9, 0.3]}
        durationSeconds={90}
      />,
    );
    expect(screen.getByText("01:16")).toBeInTheDocument();
    expect(screen.getByText("Put it down! Put it down now!")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /loudest around 00:30/ })).toBeInTheDocument();
    expect(screen.getByText("Timestamped audio-intensity graph, not an emotion graph.")).toBeInTheDocument();
  });

  it("renders nothing when the data source provides neither", () => {
    const { container } = render(<TranscriptAndAudio transcript={null} audioIntensity={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
