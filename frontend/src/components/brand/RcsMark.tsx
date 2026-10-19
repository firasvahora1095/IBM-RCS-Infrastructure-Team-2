import { useId } from "react";

/**
 * The RCS mark: an "R" made of a person (the dot), a protective bowl and a leaf for support, in the team's
 * purple-to-teal gradient. Drawn as SVG, not an image file, so it stays sharp at any size on light or dark.
 */
export function RcsMark({ size = 32, title }: { size?: number; title?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : "true"}
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-top`} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#c4a3ff" />
          <stop offset="0.45" stopColor="#8f7cff" />
          <stop offset="1" stopColor="#7fd3ff" />
        </linearGradient>
        <linearGradient id={`${id}-swoosh`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4aa3f0" />
          <stop offset="1" stopColor="#0891b8" />
        </linearGradient>
        <linearGradient id={`${id}-left`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a98bff" />
          <stop offset="1" stopColor="#6a63d6" />
        </linearGradient>
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b6f2e0" />
          <stop offset="0.55" stopColor="#6fd8c9" />
          <stop offset="1" stopColor="#2ba8e0" />
        </linearGradient>
      </defs>
      <path
        d="M4 29V14C4 8 8.5 4 14.5 4H42C51.5 4 58 11 58 20C58 27 53 32 46 36L31 29Z"
        fill={`url(#${id}-top)`}
      />
      <path d="M58 20C58 27 53 32 46 36L33 29.5 46 25C52 22.5 56.5 19 58 14Z" fill={`url(#${id}-swoosh)`} />
      <path d="M4 33C12 33 19 36 24 41 22 46 21.5 52 23 60 11 57 4 50 4 41Z" fill={`url(#${id}-left)`} />
      <path
        d="M26 41C34 44 43 46 50 52 53.5 56 54 60 53.5 62 42 63 30 60 26 50 25 46 25.5 43 26 41Z"
        fill={`url(#${id}-leaf)`}
      />
      <circle cx="32" cy="32" r="4.8" fill="#7a6fe0" />
    </svg>
  );
}

/** The mark with the product name beside it, for a header or a hero. */
export function RcsWordmark({ size = 28, subdued = false }: { size?: number; subdued?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <RcsMark size={size} title="RCS" />
      <span className="flex flex-col" style={{ lineHeight: 1.1 }}>
        <span style={{ fontSize: size * 0.62, fontWeight: 700, letterSpacing: "-0.01em" }}>RCS</span>
        {!subdued && (
          <span style={{ fontSize: size * 0.33, letterSpacing: "0.08em", color: "var(--cds-text-secondary)" }}>
            REPORT · REVIEW · SUPPORT
          </span>
        )}
      </span>
    </span>
  );
}
