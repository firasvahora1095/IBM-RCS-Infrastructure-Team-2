import type { SeverityTier } from "../services/types";

/**
 * S1–S4 is a TEAM-DEFINED severity scale, not a stock Carbon concept (see
 * the Auditor/Manager Figma Foundations pages and docs/ba/severity-scale.md).
 * It is an ordered scale, so it is drawn as one hue (Carbon purple) that
 * darkens as severity rises, with S1 in neutral gray. No status colour uses
 * purple, so a severity tag is never mistaken for a status (the old
 * yellow/orange/red ramp collided with Approaching Limit, Waiting and
 * Critical). Each tier carries its own text colour and passes WCAG AA.
 */
export interface SeverityInfo {
  tier: SeverityTier;
  label: string;
  background: string;
  text: string;
  /** The same ramp for a chart bar, where the light tag fills would vanish on the track. */
  bar: string;
}

const SEVERITY_TABLE: Record<SeverityTier, SeverityInfo> = {
  S1: { tier: "S1", label: "Low", background: "var(--rcs-sev-1-bg)", text: "var(--rcs-sev-1-fg)", bar: "var(--rcs-sev-1-bar)" },
  S2: { tier: "S2", label: "Moderate", background: "var(--rcs-sev-2-bg)", text: "var(--rcs-sev-2-fg)", bar: "var(--rcs-sev-2-bar)" },
  S3: { tier: "S3", label: "High", background: "var(--rcs-sev-3-bg)", text: "var(--rcs-sev-3-fg)", bar: "var(--rcs-sev-3-bar)" },
  S4: { tier: "S4", label: "Critical", background: "var(--rcs-sev-4-bg)", text: "var(--rcs-sev-4-fg)", bar: "var(--rcs-sev-4-bar)" },
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
