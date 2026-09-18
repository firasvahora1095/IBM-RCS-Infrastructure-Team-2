import { useEffect, useRef } from "react";
import type { RefObject } from "react";

type FocusTarget = RefObject<HTMLElement | null> | (() => HTMLElement | null);

/**
 * Moves keyboard focus onto `target` when a dialog opens (WCAG 2.4.3).
 *
 * Carbon only moves focus into a modal when its `open` prop changes. A modal
 * that mounts already open, or one that opens while another dialog is
 * closing, left focus behind the overlay (found in the Task 99 keyboard
 * pass). The dialog also fades in from visibility: hidden, and a hidden
 * field can't take focus, so this retries each frame until focus lands,
 * for up to about 1.5s (it takes ~600ms in Chrome).
 */
export function useFocusOnOpen(open: boolean, target: FocusTarget) {
  const targetRef = useRef(target);
  useEffect(() => {
    targetRef.current = target;
  });

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    let attempts = 0;
    const tryFocus = () => {
      const current = targetRef.current;
      const el = typeof current === "function" ? current() : current.current;
      el?.focus();
      if (document.activeElement !== el && attempts++ < 90) frame = requestAnimationFrame(tryFocus);
    };
    frame = requestAnimationFrame(tryFocus);
    return () => cancelAnimationFrame(frame);
  }, [open]);
}
