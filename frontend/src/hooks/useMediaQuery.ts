import { useSyncExternalStore } from "react";

/**
 * Whether a CSS media query matches, kept in sync as the window changes.
 * For layout choices a component can't make in CSS alone, e.g. a Carbon
 * ProgressIndicator that should be vertical on small screens.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches,
    () => false,
  );
}

/** Below Carbon's md breakpoint (672px). */
export const SMALL_SCREEN = "(max-width: 671.98px)";
