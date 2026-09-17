import type { SeverityTier } from "../api/types";

/**
 * S1–S4 is a TEAM-DEFINED severity scale, not a stock Carbon concept (see
 * the Auditor/Manager Figma Foundations pages and docs/ba/severity-scale.md).
 * The colours ARE real Carbon core-palette values, though, including S3's
 * Orange 40 — a deliberate, documented extension onto the Tag component.
 *
 * Each tier carries its own text colour because the Figma Severity Tag
 * component (Auditor file, nodes 2:197–2:204) uses Gray 100 text on the
 * three lighter fills but white text on S4's Red 60 — Gray 100 on Red 60
 * would fail WCAG AA contrast.
 */
export interface SeverityInfo {
  tier: SeverityTier;
  label: string;
  background: string;
  text: string;
}

const SEVERITY_TABLE: Record<SeverityTier, SeverityInfo> = {
  S1: { tier: "S1", label: "Low", background: "#e0e0e0", text: "#161616" }, // Gray 20
  S2: { tier: "S2", label: "Moderate", background: "#f1c21b", text: "#161616" }, // Yellow 30
  S3: { tier: "S3", label: "High", background: "#ff832b", text: "#161616" }, // Orange 40
  S4: { tier: "S4", label: "Critical", background: "#da1e28", text: "#ffffff" }, // Red 60
};

/** Look up the display info for a severity tier. Throws on an invalid tier
 *  rather than silently rendering nothing — a typo here should be loud. */
export function getSeverityInfo(tier: SeverityTier): SeverityInfo {
  const info = SEVERITY_TABLE[tier];
  if (!info) {
    throw new Error(`Unknown severity tier: ${tier}`);
  }
  return info;
}
