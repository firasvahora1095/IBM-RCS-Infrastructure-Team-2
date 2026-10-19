import type { ComponentProps } from "react";
import { HeaderName } from "@carbon/react";
import { RcsLogo } from "../brand/RcsMark";

/**
 * The left of every app header (Reviewer, Manager, Client): the RCS logo, a hairline, and which part of RCS this is.
 * The accessible name stays "RCS — {area}", so screen readers and tests hear one clear label. Below sm the area
 * label drops out and only the logo remains.
 */
export function AppBrand({
  area,
  ...link
}: { area: string } & Omit<ComponentProps<typeof HeaderName>, "prefix" | "children">) {
  return (
    <HeaderName {...link} prefix="" aria-label={`RCS — ${area}`} className="rcs-app-brand">
      <RcsLogo size={24} variant="onDark" name={false} />
      <span className="rcs-app-area">{area}</span>
    </HeaderName>
  );
}

/** Who is signed in: their initials in a brand tile, then the label as text. */
export function UserChip({ name, label }: { name: string; label: string }) {
  const initials = name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span className="rcs-user-chip">
      <span className="rcs-user-avatar" aria-hidden="true">
        {initials}
      </span>
      <span className="rcs-user-label">{label}</span>
    </span>
  );
}
