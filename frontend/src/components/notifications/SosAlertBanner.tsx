import { Link as RouterLink } from "react-router-dom";
import { WarningFilled } from "@carbon/icons-react";
import type { SosSummary } from "../../services/types";
import { formatRelativeTime } from "../../utils/formatRelativeTime";

/**
 * The persistent SOS alert banner (Manager Figma 103:6 / 103:294, MR-SOS-03):
 * a visually urgent bar on every Manager section while any SOS is unresolved.
 * It links straight to the SOS Inbox. Urgency is carried by the icon and the
 * words, not only the red fill (UR-NFR-01).
 *
 * It uses Carbon's support-error and text-on-color tokens; white on Red 60 is
 * 5.0:1, which passes WCAG AA.
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
        aria-label={`SOS alert — ${label}. Open the SOS Inbox.`}
        className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 sm:px-8"
        style={{
          backgroundColor: "var(--cds-support-error)",
          color: "var(--cds-text-on-color)",
          textDecoration: "none",
        }}
      >
        <span className="flex items-center gap-2" style={{ fontSize: 14, fontWeight: 600 }}>
          <WarningFilled size={20} aria-hidden="true" style={{ fill: "var(--cds-icon-on-color)" }} />
          SOS alert — {label}
        </span>
        {summary.most_recent && (
          <span style={{ fontSize: 12 }}>
            Most recent: {summary.most_recent.auditor_name} — {formatRelativeTime(summary.most_recent.triggered_at)}
          </span>
        )}
      </RouterLink>
    </div>
  );
}
