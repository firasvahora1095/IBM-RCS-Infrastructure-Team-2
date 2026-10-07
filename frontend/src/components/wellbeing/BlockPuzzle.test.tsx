import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BlockPuzzle } from "./BlockPuzzle";

/** Sprint 3 extras §3: optional, keyboard-operable, pausable, closable at any time. */
describe("BlockPuzzle", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const board = () => screen.getByRole("application", { name: /Block puzzle/ });
  const activeCells = () => board().querySelectorAll(".is-active").length;

  it("starts with focus on the board and a falling piece", () => {
    render(<BlockPuzzle onClose={() => {}} />);
    expect(board()).toHaveFocus();
    expect(activeCells()).toBe(4);
  });

  it("moves the piece down on its own, and pauses with Space", () => {
    render(<BlockPuzzle onClose={() => {}} />);
    const top = () => [...board().children].findIndex((cell) => cell.classList.contains("is-active"));
    const before = top();
    act(() => vi.advanceTimersByTime(800));
    expect(top()).toBeGreaterThan(before);

    fireEvent.keyDown(board(), { key: " " });
    const paused = top();
    act(() => vi.advanceTimersByTime(3000));
    expect(top()).toBe(paused);
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
  });

  it("closes with Escape or the Close button", () => {
    const onClose = vi.fn();
    render(<BlockPuzzle onClose={onClose} />);
    fireEvent.keyDown(board(), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Close puzzle" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("has on-screen controls for people who don't use a keyboard", () => {
    render(<BlockPuzzle onClose={() => {}} />);
    for (const name of ["Left", "Rotate", "Right", "Down", "Pause"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });
});
