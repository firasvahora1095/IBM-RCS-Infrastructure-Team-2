import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { VideoDropZone } from "./VideoDropZone";

describe("VideoDropZone", () => {
  it("calls onFileSelected when a file is chosen via the file input", () => {
    const onFileSelected = vi.fn();
    render(<VideoDropZone onFileSelected={onFileSelected} />);

    const file = new File(["fake bytes"], "clip.mp4", { type: "video/mp4" });
    fireEvent.change(screen.getByLabelText("Choose a video file"), { target: { files: [file] } });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("calls onFileSelected when a file is dropped", () => {
    const onFileSelected = vi.fn();
    render(<VideoDropZone onFileSelected={onFileSelected} />);

    const file = new File(["fake bytes"], "clip.mp4", { type: "video/mp4" });
    fireEvent.drop(screen.getByTestId("video-drop-zone"), { dataTransfer: { files: [file] } });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("offers a real, keyboard-reachable Browse files button", () => {
    render(<VideoDropZone onFileSelected={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Browse files" })).toBeInTheDocument();
  });
});
