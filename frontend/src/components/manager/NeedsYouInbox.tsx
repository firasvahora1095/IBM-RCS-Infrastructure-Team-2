import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, InlineLoading, OverflowMenu, OverflowMenuItem } from "@carbon/react";
import { CheckmarkFilled, WarningFilled } from "@carbon/icons-react";
import { useAuth } from "../../hooks/useAuth";
import { useSessionExpiryHandler } from "../../hooks/useSessionExpiryHandler";
import {
  approveBreakRequest,
  getAuditorDetail,
  getReassignmentContext,
  listDeclinedCases,
  listSosAlerts,
  markWellbeingFollowedUp,
  reassignCase,
  retryDelivery,
} from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import type { AuditorOverviewRow, ManagerIntelligence } from "../../services/types";
import { formatRelativeTime } from "../../utils/formatRelativeTime";
import { StatusTag } from "../ui/StatusTag";
import { deliveryFailureKind } from "../../design-tokens/deliveryLabels";
import type { StatusTone } from "../../design-tokens/statusTones";

/** The inbox shows this many rows; the rest sit behind "Show all". */
const VISIBLE_ROWS = 10;
/** Suggested Auditors are looked up for this many declined cases, so loading stays light. */
const SUGGESTED_LOOKUPS = 6;

type InboxKind = "SOS Alert" | "Break Request" | "Talk Request" | "Reassignment" | "Exposure Limit" | "Delivery Failed";

/** What an action did. `stillOpen` keeps the row in the inbox, with the message shown on it. */
interface ActionResult {
  message: string;
  stillOpen?: boolean;
}

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
  /** The one-click action, done in the row. */
  act?: { label: string; ariaLabel: string; run: () => Promise<ActionResult> };
  /**
   * Where the full page for this item is. With an action on the row it sits in the "more" menu, so a
   * row has one visible action; without one, it is the row's action.
   */
  open?: { label: string; to: string };
  /** Other ways to deal with the item, in the "more" menu. */
  more?: { label: string; to: string }[];
}

interface Props {
  intelligence: ManagerIntelligence | null;
  overview: AuditorOverviewRow[] | null;
  /** Called after an action succeeded, so the figures around the inbox refresh. */
  onChanged: () => void;
}

const CASE_KINDS: InboxKind[] = ["Reassignment", "Exposure Limit", "Delivery Failed"];

/**
 * "Needs you": the Manager's inbox on the Overview. Each row says what it is
 * and carries the action that normally resolves it, so the happy path is one
 * click and the Manager never leaves the page: approve a break, mark a talk
 * request followed up, reassign to the suggested Auditor, retry a failed
 * delivery. The SOS row opens the alert instead: acknowledging happens only
 * after the Manager has seen the context (Figma 103:151).
 */
export function NeedsYouInbox({ intelligence, overview, onChanged }: Props) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const handleSessionExpiry = useSessionExpiryHandler();
  const [rows, setRows] = useState<InboxRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [announce, setAnnounce] = useState("");
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
  const dependencyKey = `${version}|${requesters.map((r) => r.auditor_id).join(",")}|${(failed ?? [])
    .map((f) => f.delivery_id)
    .join(",")}`;

  useEffect(() => {
    if (!ready || !token) return;
    let cancelled = false;
    (async () => {
      const [sos, declined, details] = await Promise.all([
        listSosAlerts(token),
        listDeclinedCases(token),
        Promise.all(requesters.map((r) => getAuditorDetail(r.auditor_id, token))),
      ]);
      const suggestions = await Promise.all(
        declined.slice(0, SUGGESTED_LOOKUPS).map((c) => getReassignmentContext(c.case_id, token).catch(() => null)),
      );

      const next: InboxRow[] = [];
      // One row for all open SOS alerts, not one per alert: the same action three times is noise. The
      // SOS Inbox lists each alert; a single alert opens directly.
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
          status: { label: unacknowledged ? "Unacknowledged" : "In progress", tone: unacknowledged ? "error" : "warning" },
          open:
            openSos.length === 1
              ? { label: "Open alert", to: `/manager/sos/${encodeURIComponent(openSos[0].id)}` }
              : { label: `Open SOS Inbox (${openSos.length})`, to: "/manager/sos" },
        });
      }
      for (const detail of details) {
        for (const request of detail.wellbeing_requests.filter((w) => w.status === "OPEN")) {
          const isBreak = request.kind === "BREAK_REQUEST";
          next.push({
            key: `req-${request.id}`,
            kind: isBreak ? "Break Request" : "Talk Request",
            subject: detail.display_name,
            detail: formatRelativeTime(request.created_at),
            status: { label: "Waiting", tone: "warning" },
            act: isBreak
              ? {
                  label: "Approve",
                  ariaLabel: `Approve, break request from ${detail.display_name}`,
                  run: async () => {
                    await approveBreakRequest(request.id, token);
                    return { message: `Approved the break request from ${detail.display_name}.` };
                  },
                }
              : {
                  label: "Follow up",
                  ariaLabel: `Follow up, talk request from ${detail.display_name}`,
                  run: async () => {
                    await markWellbeingFollowedUp(request.id, token);
                    return { message: `Marked the talk request from ${detail.display_name} as followed up.` };
                  },
                },
            open: { label: "Open Auditor", to: `/manager/auditors/${encodeURIComponent(detail.auditor_id)}` },
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
          // The suggested Auditor is named in the row but not on the button, so every button reads the same.
          detail: best ? `${c.auditor_name} · Suggested: ${best.name}` : c.auditor_name,
          status: { label: capped ? "Limit reached" : "Declined", tone: "warning" },
          act: best
            ? {
                label: "Reassign",
                ariaLabel: `Reassign to ${best.name}, case ${c.case_id}`,
                run: async () => {
                  await reassignCase(c.case_id, token, best.auditor_id);
                  return { message: `Reassigned ${c.case_id} to ${best.name}.` };
                },
              }
            : undefined,
          open: {
            label: best ? "Choose someone else" : "Choose an Auditor",
            to: `/manager/cases/${encodeURIComponent(c.case_id)}/reassign`,
          },
        });
      });
      for (const d of failed ?? []) {
        next.push({
          key: `del-${d.delivery_id}`,
          kind: "Delivery Failed",
          subject: d.case_id,
          detail: `${d.attempts} attempts${d.reason ? ` · ${d.reason}` : ""}`,
          status: { label: deliveryFailureKind(d.reason), tone: "error" },
          act: {
            label: "Retry",
            ariaLabel: `Retry, delivery for case ${d.case_id}`,
            run: async () => {
              const result = await retryDelivery(d.delivery_id, token);
              // A retry can fail again (CommunityHub still down): say so instead of pretending it worked.
              return result.delivery_status === "NEEDS_ATTENTION"
                ? { message: "Still failing. CommunityHub did not accept it. Try again shortly.", stillOpen: true }
                : { message: `Delivered the result for ${d.case_id}.` };
            },
          },
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

  const act = useCallback(
    async (row: InboxRow) => {
      if (!row.act) return;
      setBusy(row.key);
      setRowErrors((prev) => ({ ...prev, [row.key]: "" }));
      try {
        const { message, stillOpen } = await row.act.run();
        if (stillOpen) {
          setRowErrors((prev) => ({ ...prev, [row.key]: message }));
          return;
        }
        setDone((prev) => new Set(prev).add(row.key));
        setAnnounce(message);
        onChanged();
      } catch (err) {
        if (handleSessionExpiry(err)) return;
        const message = err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE;
        setRowErrors((prev) => ({ ...prev, [row.key]: message }));
        // Another Manager may have got there first: show what is true now.
        if (err instanceof ApiError && err.status === 409) setVersion((v) => v + 1);
      } finally {
        setBusy(null);
      }
    },
    [handleSessionExpiry, onChanged],
  );

  if (loadError) return <p className="rcs-helper">Couldn&apos;t load your inbox. {loadError}</p>;
  if (!rows) return <InlineLoading description="Loading your inbox…" />;

  const pending = rows.filter((r) => !done.has(r.key));
  const shown = showAll ? pending : pending.slice(0, VISIBLE_ROWS);

  return (
    <div className="flex flex-col gap-3">
      <p className="cds--visually-hidden" role="status">
        {announce}
      </p>
      {pending.length === 0 ? (
        <div className="rcs-inbox-empty">
          <CheckmarkFilled aria-hidden="true" size={20} style={{ fill: "var(--rcs-success-strong)" }} />
          <div>
            <p className="rcs-inbox-empty-title">Nothing needs you</p>
            <p className="rcs-helper">
              {announce || "No SOS alerts, requests, reassignments or failed deliveries are waiting."}
            </p>
          </div>
        </div>
      ) : (
        <>
          {announce && (
            <p className="rcs-helper" aria-hidden="true">
              {announce}
            </p>
          )}
          <ul className="rcs-inbox" aria-label="Items that need you">
            {shown.map((row) => (
              <li key={row.key} className="rcs-inbox-row" data-urgent={row.urgent ? "error" : undefined}>
                <span className="rcs-inbox-kind">
                  {row.urgent && <WarningFilled aria-hidden="true" size={16} className="rcs-inbox-kind-icon" />}
                  {row.kind}
                </span>
                <span className={`rcs-inbox-subject ${CASE_KINDS.includes(row.kind) ? "rcs-mono" : ""}`}>
                  {row.subject}
                </span>
                <span className="rcs-inbox-detail">
                  {row.status && (
                    <StatusTag tone={row.status.tone} size="sm">
                      {row.status.label}
                    </StatusTag>
                  )}
                  <span className="rcs-helper">{row.detail}</span>
                  {rowErrors[row.key] && (
                    <span className="rcs-inbox-error" role="alert">
                      {rowErrors[row.key]}
                    </span>
                  )}
                </span>
                {/* One visible action per row; anything else is one step away in the menu. */}
                <span className="rcs-inbox-actions">
                  {row.act ? (
                    <Button
                      kind="tertiary"
                      size="sm"
                      aria-label={row.act.ariaLabel}
                      disabled={busy !== null}
                      onClick={() => void act(row)}
                    >
                      {busy === row.key ? "Working…" : row.act.label}
                    </Button>
                  ) : (
                    row.open && (
                      <Button kind="tertiary" size="sm" onClick={() => navigate(row.open!.to)}>
                        {row.open.label}
                      </Button>
                    )
                  )}
                  <span className="rcs-inbox-more">
                  {row.act && (row.open || row.more?.length) && (
                    <OverflowMenu
                      size="sm"
                      flipped
                      aria-label={`More actions, ${row.subject}`}
                      iconDescription={`More actions, ${row.subject}`}
                    >
                      {[...(row.open ? [row.open] : []), ...(row.more ?? [])].map((item) => (
                        <OverflowMenuItem key={item.to} itemText={item.label} onClick={() => navigate(item.to)} />
                      ))}
                    </OverflowMenu>
                  )}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {pending.length > VISIBLE_ROWS && (
        <Button kind="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show fewer" : `Show all ${pending.length}`}
        </Button>
      )}
    </div>
  );
}
