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

/** What RCS stands for. Shown with the wordmark wherever a first-time visitor meets the name. */
export const RCS_FULL_NAME = "Responsible Content Safety";

/**
 * The full RCS lockup: the mark, the "RCS" wordmark, the full name it stands for, and optionally the tagline. Text is
 * live, so it stays sharp and is read out by screen readers. `stacked` puts the full name under the wordmark (hero,
 * footer); `inline` sets it beside the wordmark after a rule (header). The tagline is styled apart from the name so
 * "Report · Review · Support" is never read as the expansion. `onLight` uses the logo navy, `onDark` white.
 */
export function RcsLogo({
  size = 32,
  variant = "onLight",
  layout = "stacked",
  name = true,
  tagline = false,
}: {
  size?: number;
  variant?: "onLight" | "onDark";
  layout?: "stacked" | "inline";
  name?: boolean;
  tagline?: boolean;
}) {
  const ink = variant === "onLight" ? "#0d1633" : "#ffffff";
  const sub = variant === "onLight" ? "#525252" : "#c6c6c6";
  return (
    <span className={`rcs-logo rcs-logo--${layout}`} style={{ gap: size * 0.3 }}>
      <RcsMark size={size} />
      <span className="rcs-logo-text">
        <span className="rcs-logo-line">
          <span className="rcs-logo-word" style={{ fontSize: size * 0.72, color: ink }}>
            RCS
          </span>
          {name && (
            <span
              className="rcs-logo-name"
              style={{ fontSize: layout === "inline" ? 14 : Math.max(12, size * 0.32), color: ink }}
            >
              {RCS_FULL_NAME}
            </span>
          )}
        </span>
        {tagline && (
          <span className="rcs-logo-tagline" style={{ fontSize: Math.max(10, size * 0.22), color: sub }}>
            Report · Review · Support
          </span>
        )}
      </span>
    </span>
  );
}
