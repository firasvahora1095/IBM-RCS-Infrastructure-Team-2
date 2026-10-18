/**
 * The RCS mark: a shield (protection) around a play triangle (the video being reviewed), with a notch taken out of
 * the shield's shoulder for the limit on how much anyone watches. Drawn, not photographed, so it stays sharp at any
 * size and needs no asset file.
 */
export function RcsMark({ size = 32, title }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : "true"}
      focusable="false"
    >
      <path
        d="M16 2.5 28 6.2v9.1c0 6.9-4.7 12.4-12 14.2-7.3-1.8-12-7.3-12-14.2V6.2Z"
        fill="var(--rcs-mark-shield, #0f62fe)"
      />
      <path d="M13 11.5 21 16l-8 4.5Z" fill="var(--rcs-mark-glyph, #ffffff)" />
      <path d="M16 2.5 28 6.2v4.6L16 7.1Z" fill="var(--rcs-mark-accent, #ffffff)" opacity="0.28" />
    </svg>
  );
}

/** The mark with the product name beside it, for a header or a hero. */
export function RcsWordmark({ size = 28, subdued = false }: { size?: number; subdued?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <RcsMark size={size} title="RCS" />
      <span className="flex flex-col" style={{ lineHeight: 1.1 }}>
        <span style={{ fontSize: size * 0.62, fontWeight: 600, letterSpacing: "-0.01em" }}>RCS</span>
        {!subdued && (
          <span style={{ fontSize: size * 0.33, color: "var(--cds-text-secondary)" }}>Responsible Content Safety</span>
        )}
      </span>
    </span>
  );
}
