import { useCallback, useEffect, useState } from "react";
import {
  Button,
  DefinitionTooltip,
  InlineNotification,
  Layer,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@carbon/react";
import { SeverityTag } from "../severity/SeverityTag";
import { StatusTag } from "../ui/StatusTag";
import { claimCase, getAllOpenCases, getAvailableCases, takeCase } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import type { AvailableCases, CaseVisibility, FallbackCaseRow, InternalCaseStatus } from "../../services/types";
import { managerStatusLabel } from "../../design-tokens/managerLabels";

const DECLINED_KEY = "rcs_declined_available_cases";

function readDeclined(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(DECLINED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

const MONO = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 } as const;

const VISIBILITY_LABEL: Record<CaseVisibility, string> = {
  ASSIGNED_ONLY: "Assigned",
  SUPER_ADMIN_ONLY: "Super Auditor only",
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

/** Why the visibility is what it is, for the tooltip on the tag. */
function visibleToReason(row: FallbackCaseRow): string {
  if (row.manager_flag) return "A Manager has to decide what happens to this case.";
  if (row.case_visibility === "SUPER_ADMIN_ONLY") {
    return "No Auditor was free when it arrived, so only you can see it. The system places it automatically when one is.";
  }
  if (row.case_visibility === "AVAILABLE_TO_AUDITORS")
    return "A Manager released it, so any eligible Auditor can claim it.";
  return "It belongs to one Auditor, who is the only person who can open it.";
}

/** A short reason the case is in this list at all. */
function reasonLabel(row: FallbackCaseRow): string {
  if (row.manager_flag === "SOS") return "SOS raised";
  if (row.manager_flag === "DECLINED") return "Declined by Auditor";
  if (row.manager_flag === "CAP_REACHED") return "Auditor hit their limit";
  if (row.assigned_auditor_id === null) return "No Auditor free";
  return "With an Auditor";
}

const TIER_ORDER: Record<string, number> = { S1: 1, S2: 2, S3: 3, S4: 4 };

/** "12 min", "3 h 5 min", "2 d": how long the case has been open. */
function ageLabel(createdAt: string | null | undefined, now: number): string {
  if (!createdAt) return "Unknown";
  const minutes = Math.max(0, Math.floor((now - Date.parse(createdAt)) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ${minutes % 60} min`;
  return `${Math.floor(hours / 24)} d`;
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

/** The same status wording as the Manager screens. */
function statusLabel(row: FallbackCaseRow): string {
  return managerStatusLabel(row.status as InternalCaseStatus, row.manager_flag);
}

type SortKey = "severity" | "age";

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
 * The Super Auditor's fallback queue (extra-features 1.6): every open case with its
 * owner and who may see it. Queue metadata only. A case opens in full only for the
 * Auditor who owns it, so seeing a case here never exposes its footage.
 *
 * A case only lands here when no standard Auditor was eligible, and the system places
 * it by itself as soon as one is. The one thing the Super Auditor can do is take a case
 * nobody owns, for when it can't wait. The wellbeing blocks that apply to every Auditor
 * apply here too, and say why in plain words. ("Make available" is gone from this screen:
 * it only did what automatic placement already does.)
 */
export function FallbackQueueSection({
  token,
  refreshKey,
  onChanged,
  onSessionExpired,
  canTake,
  blockReason,
  onNeedsReviewerCount,
}: SectionProps & { canTake: boolean; blockReason: string | null; onNeedsReviewerCount?: (n: number) => void }) {
  const [rows, setRows] = useState<FallbackCaseRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<FallbackCaseRow | null>(null);
  // Default to the cases that need someone, so the list isn't buried under cases already being worked.
  const [view, setView] = useState<"needs" | "all">("needs");
  // Read once per load so the "placed automatically" notes don't change between renders.
  const [clock, setClock] = useState(() => Date.now());
  const [sort, setSort] = useState<{ key: SortKey; dir: "ASC" | "DESC" } | null>(null);

  const load = useCallback(() => {
    getAllOpenCases(token)
      .then((result) => {
        setRows(result);
        onNeedsReviewerCount?.(result.filter(needsReviewer).length);
        setClock(Date.now());
        setError(null);
      })
      .catch((err: unknown) => {
        if (!onSessionExpired(err)) setError(errorText(err));
      });
  }, [token, onSessionExpired, onNeedsReviewerCount]);

  useEffect(load, [load, refreshKey]);

  // The queue changes by itself now (cases are placed automatically), so it refreshes quietly.
  useEffect(() => {
    const id = window.setInterval(load, 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  const filtered = (rows ?? []).filter((r) => view === "all" || needsReviewer(r));
  const shown = sort
    ? [...filtered].sort((a, b) => {
        const diff =
          sort.key === "severity"
            ? (TIER_ORDER[a.final_severity_tier ?? a.severity_tier ?? ""] ?? 0) -
              (TIER_ORDER[b.final_severity_tier ?? b.severity_tier ?? ""] ?? 0)
            : Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? ""); // older first when "ascending" age
        return sort.dir === "ASC" ? diff : -diff;
      })
    : filtered;
  const toggleSort = (key: SortKey) =>
    setSort((cur) => (cur?.key === key ? { key, dir: cur.dir === "ASC" ? "DESC" : "ASC" } : { key, dir: "DESC" }));
  const sortProps = (key: SortKey) => ({
    isSortable: true,
    isSortHeader: sort?.key === key,
    sortDirection: sort?.key === key ? sort.dir : ("NONE" as const),
    onClick: () => toggleSort(key),
  });

  async function take(row: FallbackCaseRow) {
    setBusy(row.case_id);
    setNotice(null);
    setError(null);
    try {
      await takeCase(row.case_id, token);
      setNotice(`${row.case_id} is now in your queue. Open it from My cases.`);
      onChanged();
      load();
    } catch (err) {
      if (!onSessionExpired(err)) setError(errorText(err));
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  return (
    <section id="fallback-queue" aria-labelledby="fallback-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="fallback-title" style={{ fontSize: 16, lineHeight: "22px", fontWeight: 600 }}>
          Fallback queue
        </h2>
        <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
          Cases wait here when no Auditor is free, and are placed automatically the moment one is. Take one only if it
          can&apos;t wait.
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
        <Tabs
          selectedIndex={view === "needs" ? 0 : 1}
          onChange={({ selectedIndex }) => setView(selectedIndex === 1 ? "all" : "needs")}
        >
          <TabList aria-label="Fallback queue views" contained fullWidth>
            <Tab>{`Needs a reviewer (${rows.filter(needsReviewer).length})`}</Tab>
            <Tab>{`All open cases (${rows.length})`}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel className="rcs-tab-panel-flush">
              {view === "needs" && (
                <>
                  {rows && shown.length === 0 && (
                    <div
                      className="flex items-center justify-center px-4 py-6"
                      style={{ backgroundColor: "var(--cds-layer-01)" }}
                    >
                      <p style={{ fontSize: 14, color: "var(--cds-text-secondary)" }}>
                        {view === "needs" ? "No cases need a reviewer right now." : "No open cases."}
                      </p>
                    </div>
                  )}

                  {rows && shown.length > 0 && (
                    <Layer>
                      <Table aria-label="Fallback queue" className="rcs-actions-end">
                        <TableHead>
                          <TableRow>
                            <TableHeader>Case ID</TableHeader>
                            <TableHeader {...sortProps("severity")}>Severity</TableHeader>
                            <TableHeader>Status</TableHeader>
                            <TableHeader {...sortProps("age")}>Waiting</TableHeader>
                            <TableHeader>Reason</TableHeader>
                            <TableHeader>Owner</TableHeader>
                            <TableHeader>Visible to</TableHeader>
                            <TableHeader>Actions</TableHeader>
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
                                    <span style={{ fontSize: 14, color: "var(--cds-text-secondary)" }}>
                                      Not yet assessed
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>{statusLabel(row)}</TableCell>
                                <TableCell>{ageLabel(row.created_at, clock)}</TableCell>
                                <TableCell>{reasonLabel(row)}</TableCell>
                                <TableCell>{ownerLabel(row)}</TableCell>
                                <TableCell>
                                  <DefinitionTooltip definition={visibleToReason(row)} openOnHover align="bottom-start">
                                    <StatusTag
                                      tone={row.case_visibility === "AVAILABLE_TO_AUDITORS" ? "info" : "neutral"}
                                      size="sm"
                                    >
                                      {visibleToLabel(row)}
                                    </StatusTag>
                                  </DefinitionTooltip>
                                  {placementNote(row, clock) && (
                                    <span
                                      style={{ display: "block", fontSize: 12, color: "var(--cds-text-secondary)" }}
                                    >
                                      {placementNote(row, clock)}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {unowned && (
                                    <Button
                                      kind="tertiary"
                                      size="sm"
                                      disabled={!canTake || busy !== null}
                                      aria-label={`Take case ${row.case_id}`}
                                      onClick={() => setConfirming(row)}
                                    >
                                      Take case
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Layer>
                  )}
                </>
              )}
            </TabPanel>
            <TabPanel className="rcs-tab-panel-flush">
              {view === "all" && (
                <>
                  {rows && shown.length === 0 && (
                    <div
                      className="flex items-center justify-center px-4 py-6"
                      style={{ backgroundColor: "var(--cds-layer-01)" }}
                    >
                      <p style={{ fontSize: 14, color: "var(--cds-text-secondary)" }}>No open cases.</p>
                    </div>
                  )}

                  {rows && shown.length > 0 && (
                    <Layer>
                      <Table aria-label="Fallback queue" className="rcs-actions-end">
                        <TableHead>
                          <TableRow>
                            <TableHeader>Case ID</TableHeader>
                            <TableHeader {...sortProps("severity")}>Severity</TableHeader>
                            <TableHeader>Status</TableHeader>
                            <TableHeader {...sortProps("age")}>Waiting</TableHeader>
                            <TableHeader>Reason</TableHeader>
                            <TableHeader>Owner</TableHeader>
                            <TableHeader>Visible to</TableHeader>
                            <TableHeader>Actions</TableHeader>
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
                                    <span style={{ fontSize: 14, color: "var(--cds-text-secondary)" }}>
                                      Not yet assessed
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>{statusLabel(row)}</TableCell>
                                <TableCell>{ageLabel(row.created_at, clock)}</TableCell>
                                <TableCell>{reasonLabel(row)}</TableCell>
                                <TableCell>{ownerLabel(row)}</TableCell>
                                <TableCell>
                                  <DefinitionTooltip definition={visibleToReason(row)} openOnHover align="bottom-start">
                                    <StatusTag
                                      tone={row.case_visibility === "AVAILABLE_TO_AUDITORS" ? "info" : "neutral"}
                                      size="sm"
                                    >
                                      {visibleToLabel(row)}
                                    </StatusTag>
                                  </DefinitionTooltip>
                                  {placementNote(row, clock) && (
                                    <span
                                      style={{ display: "block", fontSize: 12, color: "var(--cds-text-secondary)" }}
                                    >
                                      {placementNote(row, clock)}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {unowned && (
                                    <Button
                                      kind="tertiary"
                                      size="sm"
                                      disabled={!canTake || busy !== null}
                                      aria-label={`Take case ${row.case_id}`}
                                      onClick={() => setConfirming(row)}
                                    >
                                      Take case
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Layer>
                  )}
                </>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}

      <Modal
        open={confirming !== null}
        size="sm"
        modalHeading={confirming ? `Take case ${confirming.case_id}?` : "Take case?"}
        primaryButtonText={busy ? "Taking…" : "Take case"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={busy !== null}
        onRequestClose={() => setConfirming(null)}
        onRequestSubmit={() => confirming && void take(confirming)}
      >
        {confirming && (
          <div className="flex flex-col gap-3" style={{ fontSize: 14, lineHeight: "20px" }}>
            <p>
              Severity: {confirming.final_severity_tier ?? confirming.severity_tier ?? "not yet assessed"}. Status:{" "}
              {statusLabel(confirming)}.
            </p>
            <p>
              The case moves to your queue and nobody else will be given it. It opens on a content warning, and the time
              you spend reviewing it counts toward your daily exposure.
            </p>
          </div>
        )}
      </Modal>
    </section>
  );
}

/**
 * Cases a Manager or the Super Auditor released to Auditors. Shown only when there is
 * one. Queue metadata only; claiming adds the case to the Auditor's queue and doesn't
 * open it. Claiming follows the same wellbeing blocks as assignment.
 */
export function AvailableCasesSection({ token, refreshKey, onChanged, onSessionExpired }: SectionProps) {
  const [data, setData] = useState<AvailableCases | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Cases this Auditor passed on. Only their own list changes: the case stays available to everyone else.
  const [declined, setDeclined] = useState<Set<string>>(() => readDeclined());

  function decline(caseId: string) {
    const next = new Set(declined).add(caseId);
    setDeclined(next);
    try {
      sessionStorage.setItem(DECLINED_KEY, JSON.stringify([...next]));
    } catch {
      // The list still updates for this visit.
    }
  }

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

  const cases = data?.cases.filter((c) => !declined.has(c.case_id)) ?? [];
  if (!data || (cases.length === 0 && !notice && !error)) return null;

  return (
    <section aria-labelledby="available-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="available-title" style={{ fontSize: 16, lineHeight: "22px", fontWeight: 600 }}>
          Available to claim
        </h2>
        <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
          These cases were released because no one could take them. Claiming adds one to your queue; it doesn&apos;t
          open it. Declining only removes it from your list: other Auditors can still claim it.
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

      {cases.length > 0 && (
        <Layer>
          <Table aria-label="Available to claim">
            <TableHead>
              <TableRow>
                <TableHeader>Case ID</TableHeader>
                <TableHeader>Severity</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader className="rcs-actions-col">Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {cases.map((c) => (
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
                  <TableCell className="rcs-actions-col">
                    {/* Both actions in one right-aligned group, so they sit together at the row's end. */}
                    <span className="rcs-row-actions">
                      <Button
                        kind="tertiary"
                        size="sm"
                        disabled={!data.can_claim || busy !== null}
                        aria-label={`Claim case ${c.case_id}`}
                        onClick={() => claim(c.case_id)}
                      >
                        Claim case
                      </Button>
                      <Button
                        kind="ghost"
                        size="sm"
                        disabled={busy !== null}
                        aria-label={`Decline case ${c.case_id}`}
                        onClick={() => decline(c.case_id)}
                      >
                        Decline
                      </Button>
                    </span>
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
