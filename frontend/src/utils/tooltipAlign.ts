/**
 * Which way a tooltip opens over a timeline mark, so one near either end
 * never runs off the edge and gets cut off: near the start it opens to the
 * right, near the end to the left, otherwise centred.
 */
export function timelineTooltipAlign(fraction: number): "top-start" | "top" | "top-end" {
  if (fraction < 0.2) return "top-start";
  if (fraction > 0.8) return "top-end";
  return "top";
}
