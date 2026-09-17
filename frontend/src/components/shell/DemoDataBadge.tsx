import { Tag } from "@carbon/react";
import { isMockData } from "../../services";

/**
 * A persistent "Demo data" label shown in every header while the mock data
 * source is active (the default until the real backend is connected).
 *
 * Task 96 / MR-OV-08: placeholder or mock values must never be mistaken for
 * live data by someone unfamiliar with the build. Renders nothing when the
 * real API is in use.
 */
export function DemoDataBadge() {
  if (!isMockData) return null;
  return (
    <Tag
      type="purple"
      size="sm"
      title="Synthetic demo data — not connected to the live backend"
      className="self-center"
      style={{ marginInline: "clamp(4px, 2vw, 16px)", whiteSpace: "nowrap" }}
    >
      Demo data
    </Tag>
  );
}
