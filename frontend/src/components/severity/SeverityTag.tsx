import { Tag } from "@carbon/react";
import type { SeverityTier } from "../../api/types";
import { getSeverityInfo } from "../../design-tokens/severity";

interface SeverityTagProps {
  tier: SeverityTier;
  /** "sm" for dense contexts like timeline labels; "md" everywhere else. */
  size?: "sm" | "md";
}

/**
 * Renders a severity tier as a Carbon Tag, matching the Figma Severity Tag
 * component (Auditor file, 02 — Components).
 *
 * Carbon's stock Tag `type` colours can't express this scale: there's no
 * yellow or orange type, "high-contrast" is dark grey, and "red" is a pale
 * Red 20 tint rather than the solid Red 60 the design uses for S4. So every
 * tier keeps Carbon's Tag (shape, padding, pill radius, focus behaviour) and
 * overrides only the fill and text colour from the severity token table.
 *
 * UR-NFR-01 ("colour is never the only status signal"): the tier and label
 * are always rendered as text alongside the colour.
 */
export function SeverityTag({ tier, size = "md" }: SeverityTagProps) {
  const info = getSeverityInfo(tier);
  return (
    <Tag
      type="gray"
      size={size}
      style={{ backgroundColor: info.background, color: info.text, fontWeight: 600 }}
    >
      {`${tier} · ${info.label}`}
    </Tag>
  );
}
