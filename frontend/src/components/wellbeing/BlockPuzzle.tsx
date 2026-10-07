import { useEffect, useReducer, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Button } from "@carbon/react";

/**
 * Optional visuospatial block puzzle for the cooldown screen (Sprint 3
 * extras §3). A generic, RCS-built falling-block game: no third-party
 * branding, no score, no levels, no timer, nothing saved. It never changes
 * the cooldown, and closing it is always one key or click away.
 *
 * Calm by design: one colour for the moving piece and one for settled
 * blocks (Carbon tokens), no flashing on cleared rows, slower in reduced
 * motion, and it pauses itself when the tab is hidden.
 */

const COLS = 10;
const ROWS = 16;

type Cell = 0 | 1;
type Shape = number[][];

const SHAPES: Shape[] = [
  [[1, 1, 1, 1]],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
];

interface Piece {
  shape: Shape;
  row: number;
  col: number;
}

interface State {
  board: Cell[][];
  piece: Piece;
  over: boolean;
  rowsCleared: number;
}

type Action = { type: "tick" } | { type: "move"; dx: number } | { type: "rotate" } | { type: "drop" } | { type: "reset" };

const emptyBoard = (): Cell[][] => Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0));

function newPiece(): Piece {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return { shape, row: 0, col: Math.floor((COLS - shape[0].length) / 2) };
}

function fits(board: Cell[][], piece: Piece): boolean {
  return piece.shape.every((line, r) =>
    line.every((filled, c) => {
      if (!filled) return true;
      const y = piece.row + r;
      const x = piece.col + c;
      return x >= 0 && x < COLS && y < ROWS && (y < 0 || board[y][x] === 0);
    }),
  );
}

function rotate(shape: Shape): Shape {
  return shape[0].map((_, c) => shape.map((line) => line[c]).reverse());
}

/** Fixes the piece into the board, removes full rows, and brings in the next piece. */
function settle(state: State): State {
  const board = state.board.map((line) => [...line]);
  state.piece.shape.forEach((line, r) =>
    line.forEach((filled, c) => {
      const y = state.piece.row + r;
      if (filled && y >= 0) board[y][state.piece.col + c] = 1;
    }),
  );
  const kept = board.filter((line) => line.some((cell) => cell === 0));
  const cleared = ROWS - kept.length;
  const nextBoard = [...Array.from({ length: cleared }, () => Array<Cell>(COLS).fill(0)), ...kept];
  const piece = newPiece();
  return { board: nextBoard, piece, over: !fits(nextBoard, piece), rowsCleared: state.rowsCleared + cleared };
}

function reducer(state: State, action: Action): State {
  if (action.type === "reset") return { board: emptyBoard(), piece: newPiece(), over: false, rowsCleared: 0 };
  if (state.over) return state;
  switch (action.type) {
    case "move": {
      const moved = { ...state.piece, col: state.piece.col + action.dx };
      return fits(state.board, moved) ? { ...state, piece: moved } : state;
    }
    case "rotate": {
      const turned = { ...state.piece, shape: rotate(state.piece.shape) };
      return fits(state.board, turned) ? { ...state, piece: turned } : state;
    }
    case "tick":
    case "drop": {
      const down = { ...state.piece, row: state.piece.row + 1 };
      return fits(state.board, down) ? { ...state, piece: down } : settle(state);
    }
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

export function BlockPuzzle({ onClose }: { onClose: () => void }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    board: emptyBoard(),
    piece: newPiece(),
    over: false,
    rowsCleared: 0,
  }));
  const [paused, setPaused] = useState(false);
  const [announcement, setAnnouncement] = useState("Block puzzle started. Use the arrow keys, Space to pause, Escape to close.");
  const boardRef = useRef<HTMLDivElement>(null);
  const speed = prefersReducedMotion() ? 1100 : 750;

  useEffect(() => {
    boardRef.current?.focus();
  }, []);

  useEffect(() => {
    if (paused || state.over) return;
    const id = window.setInterval(() => dispatch({ type: "tick" }), speed);
    return () => window.clearInterval(id);
  }, [paused, state.over, speed]);

  // Pauses when the Auditor switches tab or window.
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) setPaused(true);
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, []);

  useEffect(() => {
    if (state.over) setAnnouncement("The board is full. Start again, or close the puzzle.");
  }, [state.over]);

  function togglePause() {
    setAnnouncement(paused ? "Resumed." : "Paused.");
    setPaused(!paused);
    boardRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const keys: Record<string, () => void> = {
      ArrowLeft: () => dispatch({ type: "move", dx: -1 }),
      ArrowRight: () => dispatch({ type: "move", dx: 1 }),
      ArrowUp: () => dispatch({ type: "rotate" }),
      ArrowDown: () => dispatch({ type: "drop" }),
      " ": togglePause,
      Escape: onClose,
    };
    const run = keys[e.key];
    if (!run) return;
    e.preventDefault();
    if (paused && e.key !== " " && e.key !== "Escape") return;
    run();
  }

  // Draws the moving piece over the settled board.
  const active = new Set<string>();
  state.piece.shape.forEach((line, r) =>
    line.forEach((filled, c) => {
      if (filled) active.add(`${state.piece.row + r}:${state.piece.col + c}`);
    }),
  );

  const control = (label: string, action: () => void) => (
    <Button kind="tertiary" size="sm" onClick={action} disabled={paused || state.over}>
      {label}
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={boardRef}
        role="application"
        aria-label="Block puzzle. Left and right arrows move, up rotates, down drops faster, Space pauses, Escape closes."
        aria-describedby="block-puzzle-status"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="rcs-puzzle-board"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
      >
        {state.board.map((line, r) =>
          line.map((cell, c) => {
            const isActive = active.has(`${r}:${c}`);
            return (
              <span
                key={`${r}-${c}`}
                aria-hidden="true"
                className={isActive ? "rcs-puzzle-cell is-active" : cell ? "rcs-puzzle-cell is-settled" : "rcs-puzzle-cell"}
              />
            );
          }),
        )}
        {(paused || state.over) && (
          <span className="rcs-puzzle-overlay" aria-hidden="true">
            {state.over ? "Board full" : "Paused"}
          </span>
        )}
      </div>

      <p id="block-puzzle-status" className="cds--visually-hidden" aria-live="polite">
        {announcement}
      </p>

      <div className="flex flex-wrap gap-2" aria-label="Puzzle controls">
        {control("Left", () => dispatch({ type: "move", dx: -1 }))}
        {control("Rotate", () => dispatch({ type: "rotate" }))}
        {control("Right", () => dispatch({ type: "move", dx: 1 }))}
        {control("Down", () => dispatch({ type: "drop" }))}
      </div>
      <div className="flex flex-wrap gap-3">
        {state.over ? (
          <Button
            kind="secondary"
            size="sm"
            onClick={() => {
              dispatch({ type: "reset" });
              setAnnouncement("New board.");
              boardRef.current?.focus();
            }}
          >
            Start again
          </Button>
        ) : (
          <Button kind="secondary" size="sm" onClick={togglePause}>
            {paused ? "Resume" : "Pause"}
          </Button>
        )}
        <Button kind="ghost" size="sm" onClick={onClose}>
          Close puzzle
        </Button>
      </div>
    </div>
  );
}
