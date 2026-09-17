import type { ReactNode } from "react";

/**
 * A grey, tag-style label marking a screen as a Sprint 2 scaffold.
 *
 * Styled like a Carbon gray Tag (Gray 20 fill, Gray 100 text, pill shape),
 * but deliberately not a Carbon Tag: Carbon shortens long tag text and
 * moves the rest into a hover-only tooltip. Task 96 requires that a
 * placeholder can never be mistaken for live data, so the full notice must
 * always be readable without hovering.
 */
export function ScaffoldLabel({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 24,
        backgroundColor: "#e0e0e0",
        color: "#161616",
        fontSize: 14,
        lineHeight: "20px",
      }}
    >
      {children}
    </span>
  );
}
