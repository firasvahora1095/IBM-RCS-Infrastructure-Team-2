import { useCallback, useEffect, useState } from "react";
import {
  Button,
  ContentSwitcher,
  InlineNotification,
  Layer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Switch,
} from "@carbon/react";
import { SeverityTag } from "../severity/SeverityTag";
import { StatusTag } from "../ui/StatusTag";
import { claimCase, getAllOpenCases, getAvailableCases, makeCaseAvailable, takeCase } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import type { AvailableCases, CaseVisibility, FallbackCaseRow, InternalCaseStatus } from "../../services/types";
import { mapStatusToStaffLabel } from "../../design-tokens/statusLabels";

const MONO = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 } as const;

const VISIBILITY_LABEL: Record<CaseVisibility, string> = {
  ASSIGNED_ONLY: "Assigned",
  SUPER_ADMIN_ONLY: "Super Admin only",
  AVAILABLE_TO_AUDITORS: "Available to Auditors",
};

/** Nobody owns it and it isn't with the Manager: the cases this queue exists for. */
function needsReviewer(row: FallbackCaseRow): boolean {
  return row.assigned_auditor_id === null && row.manager_flag === null;
}

function ownerLabel(row: FallbackCaseRow): string {
  if (row.manager_flag) return "With Manager";
  return row.assigned_auditor_id ?? "No one yet";
}

function visibleToLabel(row: FallbackCaseRow): string {
  return row.manager_flag ? "Manager decision" : VISIBILITY_LABEL[row.case_visibility];
}

/** "Placed automatically at 2:32 pm" while a parked case waits; nothing once it can never be placed by the system. */
function placementNote(row: FallbackCaseRow, now: number): string | null {
  if (!row.auto_release_at || row.assigned_auditor_id !== null) return null;
  const due = Date.parse(row.auto_release_at);
  if (Number.isNaN(due)) return null;
  const time = new Date(due).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
  return due > now ? `Placed automatically from ${time}` : "Being placed automatically when an Auditor is free";
}

function errorText(err: unknown): string {
  return err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE;
}

/** Manager Review for a declined, SOS or cap-reached case still open, as on the Manager screens. */
function statusLabel(row: FallbackCaseRow): string {
  if (row.manager_flag && row.status !== "COMPLETE") return "Manager Review";
  return mapStatusToStaffLabel(row.status as InternalCaseStatus);
}

interface SectionProps {
  token: string;
  /** Bumped by the page after a change elsewhere, so this list reloads. */
  refreshKey: number;
  /** Called after a case changes hands, so the page can reload "My queue". */
  onChanged: () => void;
  /** The page's own session-expiry handler; returns true if it dealt with the error. */
  onSessionExpired: (err: unknown) => boolean;
}

/**
 * The Super Admin's fallback queue (extra-features 1.6): every open case with its
 * owner and who may see it. Queue metadata only. A case opens in full only for the
 * Auditor who owns it, so seeing a case here never exposes its footage.
 *
 * "Take case" and "Make available" apply to a case nobody owns. The wellbeing blocks
 * that apply to every Auditor apply here too, and say why in plain words.
 */
export function FallbackQueueSection({
  token,
  refreshKey,
  onChanged,
  onSessionExpired,
  canTake,
  blockReason,
}: SectionProps & { canTake: boolean; blockReason: string | null }) {
  const [rows, setRows] = useState<FallbackCaseRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Default to the cases that need someone, so the list isn't buried under cases already being worked.
  const [view, setView] = useState<"needs" | "all">("needs");
  // Read once per load so the "placed automatically" notes don't change between renders.
  const [clock, setClock] = useState(() => Date.now());

  const load = useCallback(() => {
    getAllOpenCases(token)
      .then((result) => {
        setRows(result);
        setClock(Date.now());
        setError(null);
      })
      .catch((err: unknown) => {
        if (!onSessionExpired(err)) setError(errorText(err));
      });
  }, [token, onSessionExpired]);

  useEffect(load, [load, refreshKey]);

  // The queue changes by itself now (cases are placed automatically), so it refreshes quietly.
  useEffect(() => {
    const id = window.setInterval(load, 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  const shown = (rows ?? []).filter((r) => view === "all" || needsReviewer(r));

  async function act(row: FallbackCaseRow, kind: "take" | "release") {
    setBusy(row.case_id);
    setNotice(null);
    setError(null);
    try {
      if (kind === "take") {
        await takeCase(row.case_id, token);
        setNotice(`${row.case_id} is now in your queue. Open it from your queue below.`);
        onChanged();
      } else {
        await makeCaseAvailable(row.case_id, token);
        setNotice(`${row.case_id} is now available to eligible Auditors.`);
      }
      load();
    } catch (err) {
      if (!onSessionExpired(err)) setError(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="fallback-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="fallback-title" style={{ fontSize: 16, lineHeight: "22px", fontWeight: 600 }}>
          Fallback queue
        </h2>
        <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
          Every open case, for when no standard Auditor can take one. You see queue details only; the full review opens
          for the Auditor who owns the case.
        </p>
        <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
          You don&apos;t need to release cases. The system places each one itself, by the usual weighted rule, as soon
          as a standard Auditor is eligible. Take a case, or make it available for claiming, only to move it sooner.
        </p>
      </div>

      {!canTake && blockReason && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="You can't take a case right now."
          subtitle={blockReason}
          style={{ maxWidth: "100%" }}
        />
      )}
      {notice && (
        <InlineNotification
          kind="success"
          lowContrast
          hideCloseButton
          title="Done."
          subtitle={notice}
          style={{ maxWidth: "100%" }}
        />
      )}
      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          role="alert"
          title="That didn't work."
          subtitle={error}
          style={{ maxWidth: "100%" }}
        />
      )}

      {rows && (
        <div style={{ maxWidth: 420 }}>
          <ContentSwitcher
            size="md"
            selectedIndex={view === "needs" ? 0 : 1}
            onChange={(e) => setView(e.name === "all" ? "all" : "needs")}
          >
            <Switch name="needs" text={`Needs a reviewer (${rows.filter(needsReviewer).length})`} />
            <Switch name="all" text={`All open cases (${rows.length})`} />
          </ContentSwitcher>
        </div>
      )}

      {rows && shown.length === 0 && (
        <div className="flex items-center justify-center px-4 py-6" style={{ backgroundColor: "var(--cds-layer-01)" }}>
          <p style={{ fontSize: 14, color: "var(--cds-text-secondary)" }}>
            {view === "needs" ? "No cases need a reviewer right now." : "No open cases."}
          </p>
        </div>
      )}

      {rows && shown.length > 0 && (
        <Layer>
          <Table aria-label="Fallback queue">
            <TableHead>
              <TableRow>
                <TableHeader>Case ID</TableHeader>
                <TableHeader>Severity</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Owner</TableHeader>
                <TableHeader>Visible to</TableHeader>
                <TableHeader>
                  <span className="cds--visually-hidden">Actions</span>
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {shown.map((row) => {
                const tier = row.final_severity_tier ?? row.severity_tier;
                const unowned = needsReviewer(row);
                return (
                  <TableRow key={row.case_id}>
                    <TableCell style={MONO}>{row.case_id}</TableCell>
                    <TableCell>
                      {tier ? (
                        <SeverityTag tier={tier} />
                      ) : (
                        <span style={{ fontSize: 14, color: "var(--cds-text-secondary)" }}>Not yet assessed</span>
                      )}
                    </TableCell>
                    <TableCell>{statusLabel(row)}</TableCell>
                    <TableCell>{ownerLabel(row)}</TableCell>
                    <TableCell>
                      {row.case_visibility === "AVAILABLE_TO_AUDITORS" ? (
                        <StatusTag tone="info" size="sm">
                          {VISIBILITY_LABEL[row.case_visibility]}
                        </StatusTag>
                      ) : (
                        <>
                          {visibleToLabel(row)}
                          {placementNote(row, clock) && (
                            <span style={{ display: "block", fontSize: 12, color: "var(--cds-text-secondary)" }}>
                              {placementNote(row, clock)}
                            </span>
                          )}
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      {unowned && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            kind="tertiary"
                            size="sm"
                            disabled={!canTake || busy !== null}
                            aria-label={`Take case ${row.case_id}`}
                            onClick={() => act(row, "take")}
                          >
                            Take case
                          </Button>
                          {row.case_visibility === "SUPER_ADMIN_ONLY" && (
                            <Button
                              kind="ghost"
                              size="sm"
                              disabled={busy !== null}
                              aria-label={`Make case ${row.case_id} available to Auditors`}
                              onClick={() => act(row, "release")}
                            >
                              Make available
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Layer>
      )}
    </section>
  );
}

/**
 * Cases a Manager or the Super Admin released to Auditors. Shown only when there is
 * one. Queue metadata only; claiming adds the case to the Auditor's queue and doesn't
 * open it. Claiming follows the same wellbeing blocks as assignment.
 */
export function AvailableCasesSection({ token, refreshKey, onChanged, onSessionExpired }: SectionProps) {
  const [data, setData] = useState<AvailableCases | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    getAvailableCases(token)
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!onSessionExpired(err)) setError(errorText(err));
      });
  }, [token, onSessionExpired]);

  useEffect(load, [load, refreshKey]);

  async function claim(caseId: string) {
    setBusy(caseId);
    setNotice(null);
    setError(null);
    try {
      await claimCase(caseId, token);
      setNotice(`${caseId} is now in your queue.`);
      onChanged();
      load();
    } catch (err) {
      if (!onSessionExpired(err)) setError(errorText(err));
      load();
    } finally {
      setBusy(null);
    }
  }

  if (!data || (data.cases.length === 0 && !notice && !error)) return null;

  return (
    <section aria-labelledby="available-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="available-title" style={{ fontSize: 16, lineHeight: "22px", fontWeight: 600 }}>
          Available to claim
        </h2>
        <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
          These cases were released because no one could take them. Claiming adds one to your queue; it doesn&apos;t open
          it.
        </p>
      </div>

      {!data.can_claim && data.reason && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="You can't claim a case right now."
          subtitle={data.reason}
          style={{ maxWidth: "100%" }}
        />
      )}
      {notice && (
        <InlineNotification kind="success" lowContrast hideCloseButton title="Done." subtitle={notice} style={{ maxWidth: "100%" }} />
      )}
      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          role="alert"
          title="That didn't work."
          subtitle={error}
          style={{ maxWidth: "100%" }}
        />
      )}

      {data.cases.length > 0 && (
        <Layer>
          <Table aria-label="Available to claim">
            <TableHead>
              <TableRow>
                <TableHeader>Case ID</TableHeader>
                <TableHeader>Severity</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>
                  <span className="cds--visually-hidden">Actions</span>
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.cases.map((c) => (
                <TableRow key={c.case_id}>
                  <TableCell style={MONO}>{c.case_id}</TableCell>
                  <TableCell>
                    {c.severity_tier ? (
                      <SeverityTag tier={c.severity_tier} />
                    ) : (
                      <span style={{ fontSize: 14, color: "var(--cds-text-secondary)" }}>Not yet assessed</span>
                    )}
                  </TableCell>
                  <TableCell>{c.ready ? "Ready for review" : "AI analysis in progress"}</TableCell>
                  <TableCell>
                    <Button
                      kind="tertiary"
                      size="sm"
                      disabled={!data.can_claim || busy !== null}
                      aria-label={`Claim case ${c.case_id}`}
                      onClick={() => claim(c.case_id)}
                    >
                      Claim case
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Layer>
      )}
    </section>
  );
}
