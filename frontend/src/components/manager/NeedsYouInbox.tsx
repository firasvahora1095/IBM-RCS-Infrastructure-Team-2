import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Button, InlineLoading } from "@carbon/react";
import { CheckmarkFilled } from "@carbon/icons-react";
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
  /** The one-click action, done in the row. */
  act?: { label: string; ariaLabel: string; run: () => Promise<ActionResult> };
  /** Where the full page for this item is. */
  open?: { label: string; to: string };
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
      for (const alert of sos.filter((a) => a.status !== "RESOLVED")) {
        next.push({
          key: `sos-${alert.id}`,
          kind: "SOS Alert",
          subject: alert.auditor_name,
          detail: formatRelativeTime(alert.triggered_at),
          urgent: true,
          open: { label: "Open alert", to: `/manager/sos/${encodeURIComponent(alert.id)}` },
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
                  label: "Mark followed up",
                  ariaLabel: `Mark followed up, talk request from ${detail.display_name}`,
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
          detail: capped ? `${c.auditor_name} reached their limit` : `${c.auditor_name} declined`,
          act: best
            ? {
                label: `Reassign to ${best.name}`,
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
          detail: d.reason ?? `${d.attempts} attempts`,
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
                <span className="rcs-inbox-kind">{row.kind}</span>
                <span className="rcs-inbox-what">
                  <span className={CASE_KINDS.includes(row.kind) ? "rcs-mono" : undefined}>{row.subject}</span>
                  <span className="rcs-helper">{row.detail}</span>
                  {rowErrors[row.key] && (
                    <span className="rcs-inbox-error" role="alert">
                      {rowErrors[row.key]}
                    </span>
                  )}
                </span>
                <span className="rcs-inbox-actions">
                  {row.act && (
                    <Button
                      kind="tertiary"
                      size="sm"
                      aria-label={row.act.ariaLabel}
                      disabled={busy !== null}
                      onClick={() => void act(row)}
                    >
                      {busy === row.key ? "Working…" : row.act.label}
                    </Button>
                  )}
                  {row.open &&
                    (row.act ? (
                      <RouterLink className="cds--link" to={row.open.to}>
                        {row.open.label}
                      </RouterLink>
                    ) : (
                      <Button kind="tertiary" size="sm" onClick={() => navigate(row.open!.to)}>
                        {row.open.label}
                      </Button>
                    ))}
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
