import type { SeverityTier } from "../services/types";

/**
 * S1–S4 is a TEAM-DEFINED severity scale, not a stock Carbon concept (see
 * the Auditor/Manager Figma Foundations pages and docs/ba/severity-scale.md).
 * Its colours come straight from Carbon theme tokens, following Carbon’s
 * status-indicator palette (caution minor / caution major / error), so the
 * UI stays on IBM’s own values wherever Figma and Carbon differ.
 *
 * Each tier carries its own text colour: dark text on the lighter fills,
 * text-on-color (white) on S4’s error red, which is the only pairing that
 * passes WCAG AA contrast there.
 */
export interface SeverityInfo {
  tier: SeverityTier;
  label: string;
  background: string;
  text: string;
}

const SEVERITY_TABLE: Record<SeverityTier, SeverityInfo> = {
  S1: { tier: "S1", label: "Low", background: "var(--cds-tag-background-gray)", text: "var(--cds-text-primary)" },
  S2: {
    tier: "S2",
    label: "Moderate",
    background: "var(--cds-support-caution-minor)",
    text: "var(--cds-text-primary)",
  },
  S3: { tier: "S3", label: "High", background: "var(--cds-support-caution-major)", text: "var(--cds-text-primary)" },
  S4: { tier: "S4", label: "Critical", background: "var(--cds-support-error)", text: "var(--cds-text-on-color)" },
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

/**
 * Converts a 0–100 CVI score into its tier using the approved bands in
 * docs/ba/severity-scale.md: 0–39 = S1, 40–64 = S2, 65–84 = S3, 85–100 = S4.
 * The Auditor's slider badge uses this to update live while dragging, so it
 * shares one band table with everything else.
 */
export function scoreToTier(score: number): SeverityTier {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error(`CVI score out of range: ${score}`);
  }
  if (score <= 39) return "S1";
  if (score <= 64) return "S2";
  if (score <= 84) return "S3";
  return "S4";
}
