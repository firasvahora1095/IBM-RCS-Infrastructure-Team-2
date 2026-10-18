import { Link as RouterLink } from "react-router-dom";
import { WarningFilled } from "@carbon/icons-react";
import type { SosSummary } from "../../services/types";
import { formatRelativeTime } from "../../utils/formatRelativeTime";

/**
 * The persistent SOS alert banner (Manager Figma 103:6 / 103:294, MR-SOS-03):
 * one line on every Manager section while any SOS is unresolved, linking
 * straight to the SOS inbox. Urgency is carried by the icon and the words, not
 * only colour (UR-NFR-01). It is a calm tint with a red edge rather than a solid
 * red bar: a bar that is always there turns into wallpaper, and the tint keeps
 * dark text well above AA contrast.
 */
export function SosAlertBanner({ summary }: { summary: SosSummary | null }) {
  if (!summary || summary.unresolved_count === 0) return null;
  const count = summary.unresolved_count;
  const label = `${count} SOS ${count === 1 ? "alert needs" : "alerts need"} follow-up`;

  return (
    // A named region, so the banner sits inside a landmark like the rest of the page (axe "region").
    <div role="region" aria-label="SOS alerts">
      <RouterLink
        to="/manager/sos"
        className="flex flex-wrap items-center justify-between gap-2 px-6 py-2 sm:px-8"
        style={{
          backgroundColor: "var(--cds-notification-background-error)",
          borderInlineStart: "3px solid var(--cds-support-error)",
          color: "var(--cds-text-primary)",
          textDecoration: "none",
        }}
      >
        <span className="flex items-center gap-2" style={{ fontSize: 14, fontWeight: 600 }}>
          <WarningFilled size={20} aria-hidden="true" style={{ fill: "var(--cds-support-error)" }} />
          SOS alert — {label}
        </span>
        {summary.most_recent && (
          <span style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
            Most recent: {summary.most_recent.auditor_name} — {formatRelativeTime(summary.most_recent.triggered_at)}
          </span>
        )}
      </RouterLink>
    </div>
  );
}
