import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, InlineLoading } from "@carbon/react";
import { CheckmarkFilled, WarningFilled } from "@carbon/icons-react";
import { useAuth } from "../../hooks/useAuth";
import { useSessionExpiryHandler } from "../../hooks/useSessionExpiryHandler";
import {
  getAuditorDetail,
  getReassignmentContext,
  listClientMessages,
  listDeclinedCases,
  listSosAlerts,
} from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import type { AuditorOverviewRow, ManagerIntelligence } from "../../services/types";
import { formatRelativeTime } from "../../utils/formatRelativeTime";
import { StatusTag } from "../ui/StatusTag";
import { deliveryFailureKind } from "../../design-tokens/deliveryLabels";
import { SOS_TONE, type StatusTone } from "../../design-tokens/statusTones";

/** The inbox shows this many rows; the rest sit behind "Show all". */
const VISIBLE_ROWS = 10;
/** Suggested Auditors are looked up for this many declined cases, so loading stays light. */
const SUGGESTED_LOOKUPS = 6;

type InboxKind =
  | "SOS Alert"
  | "Break Request"
  | "Talk Request"
  | "Reassignment"
  | "Exposure Limit"
  | "Delivery Failed"
  | "Client Message";

interface InboxRow {
  key: string;
  kind: InboxKind;
  /** Who or which case it is about. */
  subject: string;
  detail: string;
  /** SOS is the one row that carries red; everything else is neutral text. */
  urgent?: boolean;
  /** A short written state beside the detail, so what is waiting is clear without colour. */
  status?: { label: string; tone: StatusTone };
  /** The row's one button, and the row itself: both open the item's details. */
  open: { label: string; to: string };
}

interface Props {
  intelligence: ManagerIntelligence | null;
  overview: AuditorOverviewRow[] | null;
}

const CASE_KINDS: InboxKind[] = ["Reassignment", "Exposure Limit", "Delivery Failed"];

/**
 * "Needs you": the Manager's inbox on the Overview. Each row says what it is and has one button that opens the
 * details: the Manager reads why before deciding, so nothing is approved, retried or dismissed from the list. The
 * whole row opens the same place as its button. Spans every Client; the Client's name is on each row that has one.
 */
export function NeedsYouInbox({ intelligence, overview }: Props) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const handleSessionExpiry = useSessionExpiryHandler();
  const [rows, setRows] = useState<InboxRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const failed = intelligence?.delivery.failed;
  const requesters = useMemo(
    () =>
      (overview ?? []).filter(
        (r) => (r.open_requests?.break_requests ?? 0) + (r.open_requests?.talk_requests ?? 0) > 0,
      ),
    [overview],
  );
  const ready = Boolean(token && intelligence && overview);
  // Reload when what the inbox depends on changes, not on every poll of unchanged data.
  const dependencyKey = `${requesters.map((r) => r.auditor_id).join(",")}|${(failed ?? []).map((f) => f.delivery_id).join(",")}`;

  useEffect(() => {
    if (!ready || !token) return;
    let cancelled = false;
    (async () => {
      const [sos, declined, messages, details] = await Promise.all([
        listSosAlerts(token),
        listDeclinedCases(token),
        listClientMessages(token),
        Promise.all(requesters.map((r) => getAuditorDetail(r.auditor_id, token))),
      ]);
      const suggestions = await Promise.all(
        declined.slice(0, SUGGESTED_LOOKUPS).map((c) => getReassignmentContext(c.case_id, token).catch(() => null)),
      );

      const next: InboxRow[] = [];
      // One row for all open SOS alerts, not one per alert: the SOS Inbox lists each. A single alert opens directly.
      const openSos = sos
        .filter((a) => a.status !== "RESOLVED")
        .sort((a, b) => Date.parse(b.triggered_at) - Date.parse(a.triggered_at));
      if (openSos.length > 0) {
        const names = openSos.map((a) => a.auditor_name);
        const unacknowledged = openSos.some((a) => a.status === "UNACKNOWLEDGED");
        next.push({
          key: "sos",
          kind: "SOS Alert",
          subject: names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", "),
          detail: `${openSos.length > 1 ? "Latest " : ""}${formatRelativeTime(openSos[0].triggered_at)}`,
          urgent: true,
          status: {
            label: unacknowledged ? "Unacknowledged" : "In progress",
            tone: SOS_TONE[unacknowledged ? "UNACKNOWLEDGED" : "IN_PROGRESS"],
          },
          open:
            openSos.length === 1
              ? { label: "View alert", to: `/manager/sos/${encodeURIComponent(openSos[0].id)}` }
              : { label: "View alerts", to: "/manager/sos" },
        });
      }
      for (const detail of details) {
        for (const request of detail.wellbeing_requests.filter((w) => w.status === "OPEN")) {
          next.push({
            key: `req-${request.id}`,
            kind: request.kind === "BREAK_REQUEST" ? "Break Request" : "Talk Request",
            subject: detail.display_name,
            detail: formatRelativeTime(request.created_at),
            open: { label: "View request", to: `/manager/auditors/${encodeURIComponent(detail.auditor_id)}` },
          });
        }
      }
      declined.forEach((c, i) => {
        const capped = c.reason === "EXPOSURE_CAP_REACHED";
        // The service lists standard Auditors by headroom and the fallback reviewer last, so the first
        // available one is the suggestion.
        const best = suggestions[i]?.candidates.find((cand) => cand.available);
        next.push({
          key: `case-${c.case_id}`,
          kind: capped ? "Exposure Limit" : "Reassignment",
          subject: c.case_id,
          detail: [c.organisation_name, best ? `${c.auditor_name} · Suggested: ${best.name}` : c.auditor_name]
            .filter(Boolean)
            .join(" · "),
          status: { label: capped ? "Limit reached" : "Declined", tone: "neutral" },
          // Reassigning moves a case onto a person, so the Manager decides on the page the button opens, with the
          // suggested Auditor already selected.
          open: { label: "View case", to: `/manager/cases/${encodeURIComponent(c.case_id)}/reassign` },
        });
      });
      const waitingMessages = messages
        .filter((m) => m.status !== "ANSWERED")
        .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      if (waitingMessages.length > 0) {
        next.push({
          key: "messages",
          kind: "Client Message",
          subject: `${waitingMessages.length} waiting`,
          detail: `Oldest ${formatRelativeTime(waitingMessages[0].created_at)}`,
          open: { label: "View messages", to: "/manager/messages" },
        });
      }
      for (const d of failed ?? []) {
        next.push({
          key: `del-${d.delivery_id}`,
          kind: "Delivery Failed",
          subject: d.case_id,
          detail: `${d.attempts} attempts${d.reason ? ` · ${d.reason}` : ""}`,
          status: { label: deliveryFailureKind(d.reason), tone: "error" },
          open: { label: "View delivery", to: `/manager/deliveries/${encodeURIComponent(d.delivery_id)}` },
        });
      }
      if (!cancelled) {
        setRows(next);
        setLoadError(null);
      }
    })().catch((err: unknown) => {
      if (cancelled || handleSessionExpiry(err)) return;
      setLoadError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
    });
    return () => {
      cancelled = true;
    };
    // `requesters` and `failed` are summarised by dependencyKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, dependencyKey, handleSessionExpiry]);

  if (loadError) return <p className="rcs-helper">Couldn&apos;t load your inbox. {loadError}</p>;
  if (!rows) return <InlineLoading description="Loading your inbox…" />;

  const shown = showAll ? rows : rows.slice(0, VISIBLE_ROWS);

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 ? (
        <div className="rcs-inbox-empty">
          <CheckmarkFilled aria-hidden="true" size={20} style={{ fill: "var(--rcs-success-strong)" }} />
          <div>
            <p className="rcs-inbox-empty-title">Nothing needs your attention</p>
            <p className="rcs-helper">No SOS alerts, requests, reassignments or failed deliveries are waiting.</p>
          </div>
        </div>
      ) : (
        <ul className="rcs-inbox" aria-label="Items that need you">
          {shown.map((row) => (
            // The whole row opens the details, as its button does; the button is the keyboard route to the same place.
            <li
              key={row.key}
              className="rcs-inbox-row rcs-inbox-row--open"
              data-urgent={row.urgent ? "error" : undefined}
              onClick={() => navigate(row.open.to)}
            >
              <span className="rcs-inbox-kind">
                {row.urgent && <WarningFilled aria-hidden="true" size={16} className="rcs-inbox-kind-icon" />}
                {row.kind}
              </span>
              <span className={`rcs-inbox-subject ${CASE_KINDS.includes(row.kind) ? "rcs-mono" : ""}`}>{row.subject}</span>
              <span className="rcs-inbox-detail">
                {row.status && (
                  <StatusTag tone={row.status.tone} size="sm">
                    {row.status.label}
                  </StatusTag>
                )}
                <span className="rcs-helper">{row.detail}</span>
              </span>
              <span className="rcs-inbox-actions">
                <Button
                  kind="tertiary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(row.open.to);
                  }}
                >
                  {row.open.label}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {rows.length > VISIBLE_ROWS && (
        <Button kind="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show fewer" : `Show all ${rows.length}`}
        </Button>
      )}
    </div>
  );
}
