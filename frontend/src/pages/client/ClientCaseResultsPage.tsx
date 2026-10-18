import { useEffect, useMemo, useRef, useState } from "react";
import {
  Column,
  Grid,
  Button,
  InlineNotification,
  Layer,
  Modal,
  RadioButton,
  RadioButtonGroup,
  Search,
  Select,
  SelectItem,
  SkeletonText,
  TextArea,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableContainer,
  TableHeader,
  TableRow,
  TableSelectAll,
  TableSelectRow,
} from "@carbon/react";
import { ClientLayout } from "../../components/layout/ClientLayout";
import { StatTile } from "../../components/ui/StatTile";
import { TablePagination, usePagination } from "../../components/ui/TablePagination";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/Blocks";
import { StatusTag } from "../../components/ui/StatusTag";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { clientCaseResultsSummary, clientListCaseResults, clientRecordPlatformAction } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import type { CaseResult, DeliveredOutcome, PlatformAction } from "../../services/types";
import { useClientQuery } from "../../hooks/useClientQuery";
import { CLIENT_RESULTS_CHANGED_EVENT } from "../../components/shell/ClientTopNav";
import { useClientAuth } from "../../hooks/useClientAuth";
import { PAYLOAD_OUTCOME_LABEL, PLATFORM_ACTION_LABEL } from "../../design-tokens/deliveryLabels";
import { ACCESS_DISCLOSURE } from "../../design-tokens/reportLabels";
import { formatShortDateTime } from "../../utils/formatPeriod";
import { safeHttpUrl } from "../../utils/safeUrl";

const OUTCOME_TONE = {
  POLICY_VIOLATION_FOUND: "error",
  NO_VIOLATION_FOUND: "neutral",
  CLOSED_NO_REASSIGNMENT: "warning",
} as const;

/** The post's own ID, readable in a table, from CommunityHub's post link. */
function postLabel(url: string | null): string {
  if (!url) return "Not attached";
  const match = url.match(/post\/([\w-]+)/);
  return match ? `Post ${match[1]}` : url;
}

/**
 * Case results (CommunityHub Trust & Safety and Admin): every result RCS has
 * sent, newest first, as a record CommunityHub can reconcile against its own
 * moderation queue. Agreed facts only: never a narrative, footage, transcript
 * or reviewer identity, and never RCS's delivery errors.
 */
export function ClientCaseResultsPage() {
  const { token } = useClientAuth();
  const { data, error, reload } = useClientQuery(clientListCaseResults);
  // The key figures come from the data source, worked out once, so they match everywhere they appear.
  const summary = useClientQuery(clientCaseResultsSummary);
  const [outcome, setOutcome] = useState<"ALL" | DeliveredOutcome>("ALL");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<"needs" | "all" | null>(null);
  const [acting, setActing] = useState<CaseResult | null>(null);
  const [choice, setChoice] = useState<PlatformAction["action"] | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [followAll, setFollowAll] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  // Selecting like a mail list: drag down the tick boxes to sweep a run of rows, or click one and shift-click another.
  const drag = useRef<{ anchor: number; value: boolean; base: Set<string>; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const lastTicked = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const stop = () => {
      if (drag.current?.moved) suppressClick.current = true; // the click that ends a drag must not also toggle
      drag.current = null;
      setDragging(false);
    };
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  // Only results that have reached CommunityHub: how RCS gets a result there is not the client's concern, and a result
  // that is still travelling can't be acted on yet. It appears here the moment it arrives.
  const results = (data ?? []).filter((r) => r.status === "DELIVERED");
  const needsAction = results.filter((r) => !r.platform_action);
  const sum = summary.data;
  const pct = (rate: number | null | undefined) => (rate == null ? "–" : `${Math.round(rate * 100)}%`);
  // Opens on what is waiting for the team, as the Manager's Deliveries opens on what needs attention.
  const view = picked ?? (needsAction.length > 0 ? "needs" : "all");
  // What RCS found points at the usual action: a violation is removed, a clear post is kept. A post RCS could not
  // review has no obvious answer, so it stays for a person.
  const suggested = needsAction
    .filter((r) => r.outcome !== "CLOSED_NO_REASSIGNMENT")
    .map((result) => ({
      result,
      action: (result.outcome === "POLICY_VIOLATION_FOUND" ? "REMOVED" : "KEPT") as PlatformAction["action"],
    }));
  const toRemove = suggested.filter((x) => x.action === "REMOVED").length;
  const toKeep = suggested.length - toRemove;
  const notReviewed = needsAction.length - suggested.length;
  const selectedRows = needsAction.filter((r) => selected.has(r.delivery_id));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (view === "needs" ? needsAction : results)
      .filter((r) => outcome === "ALL" || r.outcome === outcome)
      .filter((r) => !q || r.case_id.toLowerCase().includes(q) || (r.post_url ?? "").toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, view, outcome, query]);
  const paged = usePagination(rows, `${view}|${outcome}|${query}`);

  function open(result: CaseResult) {
    setActing(result);
    setChoice(null);
    setNote("");
    setSaveError(null);
  }

  /** Closes the loop: the team's decision is recorded, RCS is told, and the result leaves Needs action. */
  async function record() {
    if (!token || !acting || !choice) return;
    setSaving(true);
    setSaveError(null);
    try {
      await clientRecordPlatformAction(acting.delivery_id, token, choice, note);
      setNotice(`${acting.case_id}: ${PLATFORM_ACTION_LABEL[choice].toLowerCase()}. RCS has been told.`);
      setActing(null);
      reload();
      summary.reload();
      window.dispatchEvent(new Event(CLIENT_RESULTS_CHANGED_EVENT));
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  }

  /** Many results at once, as a platform with many reports a day would: one tap, not one dialog per post. */
  async function applyMany(items: { result: CaseResult; action: PlatformAction["action"] }[]) {
    if (!token || items.length === 0) return;
    setSaving(true);
    setBulkError(null);
    try {
      await Promise.all(
        items.map(({ result, action }) => clientRecordPlatformAction(result.delivery_id, token, action)),
      );
      setNotice(`${items.length} result${items.length === 1 ? "" : "s"} recorded. RCS has been told.`);
      setSelected(new Set());
      setFollowAll(false);
      reload();
      summary.reload();
      window.dispatchEvent(new Event(CLIENT_RESULTS_CHANGED_EVENT));
    } catch (err) {
      setBulkError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  }

  const onNeeds: boolean = view === "needs";
  const viewBody = (
    <div className="flex flex-col gap-4" style={{ paddingBlockStart: 16 }}>
      {onNeeds && (
        <p className="rcs-helper" style={{ fontSize: 14 }}>
          Delivered results your team hasn&apos;t acted on yet. Apply RCS decisions to remove violations and keep clear
          posts in one go, or select some, or open one. RCS is told, and each result moves to All results as actioned.
        </p>
      )}

      {rows.length === 0 && onNeeds && outcome === "ALL" && !query.trim() ? (
        <EmptyState
          title="Nothing needs action"
          body="Every delivered result has an action recorded. New results appear here as RCS sends them."
        />
      ) : (
        <>
          {onNeeds && selectedRows.length > 0 && (
            <div
              className="flex flex-wrap items-center gap-3 px-4 py-2"
              style={{ backgroundColor: "var(--cds-layer-01)" }}
              role="group"
              aria-label="Selected results"
            >
              <span style={{ fontSize: 14, fontWeight: 600 }}>{selectedRows.length} selected</span>
              <Button
                kind="tertiary"
                size="sm"
                disabled={saving}
                onClick={() => void applyMany(selectedRows.map((result) => ({ result, action: "REMOVED" as const })))}
              >
                Post removed
              </Button>
              <Button
                kind="tertiary"
                size="sm"
                disabled={saving}
                onClick={() => void applyMany(selectedRows.map((result) => ({ result, action: "KEPT" as const })))}
              >
                Post kept
              </Button>
              <Button kind="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          )}
          <div className="flex flex-wrap items-end gap-4">
            <div style={{ minWidth: 220 }}>
              <Select
                id="result-outcome"
                size="md"
                labelText="Outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as "ALL" | DeliveredOutcome)}
              >
                <SelectItem value="ALL" text="All outcomes" />
                <SelectItem value="POLICY_VIOLATION_FOUND" text={PAYLOAD_OUTCOME_LABEL.POLICY_VIOLATION_FOUND} />
                <SelectItem value="NO_VIOLATION_FOUND" text={PAYLOAD_OUTCOME_LABEL.NO_VIOLATION_FOUND} />
                <SelectItem value="CLOSED_NO_REASSIGNMENT" text={PAYLOAD_OUTCOME_LABEL.CLOSED_NO_REASSIGNMENT} />
              </Select>
            </div>
            <div style={{ flex: "1 1 260px", maxWidth: 420 }}>
              <Search
                size="md"
                labelText="Search by case ID or post link"
                placeholder="Search by case ID or post link"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <Layer>
            <TableContainer>
              <Table aria-label="Case results">
                <TableHead>
                  <TableRow>
                    {onNeeds && (
                      <TableSelectAll
                        id="select-all-results"
                        name="select-all-results"
                        ariaLabel="Select all results on this page"
                        checked={paged.rows.length > 0 && paged.rows.every((r) => selected.has(r.delivery_id))}
                        indeterminate={
                          paged.rows.some((r) => selected.has(r.delivery_id)) &&
                          !paged.rows.every((r) => selected.has(r.delivery_id))
                        }
                        onSelect={() => {
                          const all = paged.rows.every((r) => selected.has(r.delivery_id));
                          setSelected((cur) => {
                            const next = new Set(cur);
                            for (const r of paged.rows) {
                              if (all) next.delete(r.delivery_id);
                              else next.add(r.delivery_id);
                            }
                            return next;
                          });
                        }}
                      />
                    )}
                    <TableHeader>Case ID</TableHeader>
                    <TableHeader>Post</TableHeader>
                    <TableHeader>RCS result</TableHeader>
                    <TableHeader>Final severity</TableHeader>
                    <TableHeader>Decided</TableHeader>
                    <TableHeader>Your team&apos;s action</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody style={{ userSelect: dragging ? "none" : undefined }}>
                  {paged.rows.map((r: CaseResult, index: number) => (
                    <TableRow
                      key={r.delivery_id}
                      // A delivered result has something to open: record the action, or see what was recorded.
                      onClick={
                        r.status === "DELIVERED"
                          ? (e) => {
                              if ((e.target as HTMLElement).closest(".cds--table-column-checkbox")) return;
                              open(r);
                            }
                          : undefined
                      }
                      style={{ cursor: r.status === "DELIVERED" ? "pointer" : "default" }}
                      onMouseDown={(e) => {
                        if (!onNeeds || !(e.target as HTMLElement).closest(".cds--table-column-checkbox")) return;
                        drag.current = {
                          anchor: index,
                          value: !selected.has(r.delivery_id),
                          base: new Set(selected),
                          moved: false,
                        };
                        setDragging(true);
                      }}
                      onMouseEnter={() => {
                        const d = drag.current;
                        if (!d || !onNeeds || index === d.anchor) return;
                        d.moved = true;
                        const [from, to] = d.anchor < index ? [d.anchor, index] : [index, d.anchor];
                        const next = new Set(d.base);
                        for (const row of paged.rows.slice(from, to + 1)) {
                          if (d.value) next.add(row.delivery_id);
                          else next.delete(row.delivery_id);
                        }
                        setSelected(next);
                      }}
                    >
                      {onNeeds && (
                        <TableSelectRow
                          id={`select-${r.delivery_id}`}
                          name={`select-${r.delivery_id}`}
                          ariaLabel={`Select ${r.case_id}`}
                          checked={selected.has(r.delivery_id)}
                          onSelect={(event: unknown) => {
                            if (suppressClick.current) {
                              suppressClick.current = false;
                              return;
                            }
                            const shift = Boolean(
                              (event as { nativeEvent?: { shiftKey?: boolean } })?.nativeEvent?.shiftKey,
                            );
                            const turnOn = !selected.has(r.delivery_id);
                            setSelected((cur) => {
                              const next = new Set(cur);
                              const anchor = lastTicked.current;
                              const rows =
                                shift && anchor !== null
                                  ? paged.rows.slice(Math.min(anchor, index), Math.max(anchor, index) + 1)
                                  : [r];
                              for (const row of rows) {
                                if (turnOn) next.add(row.delivery_id);
                                else next.delete(row.delivery_id);
                              }
                              return next;
                            });
                            lastTicked.current = index;
                          }}
                        />
                      )}
                      <TableCell style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                        {r.case_id}
                      </TableCell>
                      <TableCell>
                        {safeHttpUrl(r.post_url) ? (
                          <a
                            className="cds--link"
                            href={safeHttpUrl(r.post_url)!}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {postLabel(r.post_url)}
                          </a>
                        ) : r.post_url ? (
                          // Not an http(s) link: shown as text, never made clickable.
                          <span style={{ overflowWrap: "anywhere" }}>{r.post_url}</span>
                        ) : (
                          <span className="rcs-helper">Not attached</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusTag tone={OUTCOME_TONE[r.outcome]}>{PAYLOAD_OUTCOME_LABEL[r.outcome]}</StatusTag>
                      </TableCell>
                      <TableCell>
                        {r.final_severity ? <SeverityTag tier={r.final_severity} size="sm" /> : "—"}
                      </TableCell>
                      <TableCell>{formatShortDateTime(r.completed_at)}</TableCell>

                      {/* The status and its one action sit together, so a row reads left to right with no gap between them. */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {r.platform_action ? (
                            <StatusTag tone={r.platform_action.action === "REMOVED" ? "success" : "neutral"}>
                              {PLATFORM_ACTION_LABEL[r.platform_action.action]}
                            </StatusTag>
                          ) : r.status === "DELIVERED" ? (
                            <>
                              <StatusTag tone="action">Needs action</StatusTag>
                              <Button
                                kind="tertiary"
                                size="sm"
                                aria-label={`Record action for ${r.case_id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  open(r);
                                }}
                              >
                                Record action
                              </Button>
                            </>
                          ) : (
                            "—"
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Layer>
          <TablePagination paged={paged} />
          {rows.length === 0 && <p className="rcs-helper">No results match these filters.</p>}
        </>
      )}
    </div>
  );

  return (
    <ClientLayout maxWidth={1320}>
      <PageHeader
        title="Case results"
        subtitle="Every result RCS has sent to CommunityHub. RCS decides whether a post broke policy; your team decides what happens to it."
        actions={
          suggested.length > 0 ? (
            <Button disabled={saving} onClick={() => setFollowAll(true)}>
              Apply RCS decisions
            </Button>
          ) : undefined
        }
      />
      {bulkError && (
        <InlineNotification
          kind="error"
          lowContrast
          role="alert"
          title="That wasn't recorded."
          subtitle={bulkError}
          onClose={() => setBulkError(null)}
          style={{ maxWidth: "100%" }}
        />
      )}
      {notice && (
        <InlineNotification
          kind="success"
          lowContrast
          role="status"
          title={notice}
          onClose={() => setNotice(null)}
          style={{ maxWidth: "100%" }}
        />
      )}
      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          role="alert"
          title="Couldn't load case results."
          subtitle={error.message}
          style={{ maxWidth: "100%" }}
        />
      )}
      {!data && !error && <SkeletonText paragraph lineCount={6} />}
      {data && data.length === 0 && (
        <EmptyState title="No results yet" body="Results appear here as soon as RCS sends them." />
      )}
      {data && data.length > 0 && (
        <>
          {/* What a CommunityHub moderator wants at a glance: how much RCS flagged, how much of it came down, and whether
              the team has caught up. */}
          <Grid className="rcs-grid" condensed>
            <Column sm={4} md={2} lg={5}>
              <StatTile
                label="Violations found"
                value={sum ? sum.violations : "–"}
                helper={sum ? `${pct(sum.violation_rate)} of ${sum.decided} decided` : undefined}
              />
            </Column>
            <Column sm={4} md={3} lg={5}>
              <StatTile
                label="Posts removed"
                value={sum ? sum.removed : "–"}
                helper={sum ? `${pct(sum.removal_rate)} of violations` : undefined}
              />
            </Column>
            <Column sm={4} md={3} lg={6}>
              <StatTile
                label="Team has acted on"
                value={sum ? `${sum.actioned} of ${sum.delivered}` : "–"}
                helper={
                  sum ? (sum.needs_action ? `${sum.needs_action} still need action` : "All caught up") : undefined
                }
              />
            </Column>
          </Grid>

          {/* Two views of one table. Carbon's line tabs, the same underline as the section tabs above, not a
              black-and-white switcher that looks like a button. */}
          <Tabs
            selectedIndex={view === "needs" ? 0 : 1}
            onChange={({ selectedIndex }) => setPicked(selectedIndex === 0 ? "needs" : "all")}
          >
            <TabList aria-label="Case result views">
              <Tab>{`Needs action (${needsAction.length})`}</Tab>
              <Tab>{`All results (${results.length})`}</Tab>
            </TabList>
            <TabPanels>
              <TabPanel className="rcs-tab-panel-flush">{view === "needs" && viewBody}</TabPanel>
              <TabPanel className="rcs-tab-panel-flush">{view === "all" && viewBody}</TabPanel>
            </TabPanels>
          </Tabs>
        </>
      )}

      {followAll && (
        <Modal
          open
          size="sm"
          modalHeading="Apply RCS decisions?"
          primaryButtonText={saving ? "Recording…" : "Apply"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={saving}
          onRequestClose={() => setFollowAll(false)}
          onRequestSubmit={() => void applyMany(suggested)}
        >
          <div className="flex flex-col gap-4" style={{ fontSize: 14, lineHeight: "20px" }}>
            <p>Your team will record these actions, matching what RCS decided:</p>
            <ul className="flex flex-col gap-2" style={{ paddingInlineStart: 20, listStyle: "disc" }}>
              {toRemove > 0 && (
                <li>
                  <strong>Remove {toRemove === 1 ? "1 post" : `${toRemove} posts`}</strong> that RCS found in violation
                  of policy.
                </li>
              )}
              {toKeep > 0 && (
                <li>
                  <strong>Keep {toKeep === 1 ? "1 post" : `${toKeep} posts`}</strong> that RCS found no violation in.{" "}
                  {toKeep === 1 ? "It stays" : "They stay"} published.
                </li>
              )}
            </ul>
            {notReviewed > 0 && (
              <p className="rcs-helper" style={{ fontSize: 14 }}>
                {notReviewed === 1 ? "1 result was" : `${notReviewed} results were`} not reviewed by RCS, so{" "}
                {notReviewed === 1 ? "it stays" : "they stay"} in Needs action for your team to decide.
              </p>
            )}
            <p className="rcs-helper" style={{ fontSize: 14 }}>
              RCS is notified of each decision when you apply. You can open any result afterwards to see what was
              recorded.
            </p>
          </div>
        </Modal>
      )}

      {acting && (
        <Modal
          open
          size="sm"
          // An actioned result opens read-only: what was recorded, by whom and when.
          passiveModal={Boolean(acting?.platform_action)}
          modalHeading={
            acting?.platform_action
              ? `${acting.case_id}`
              : acting
                ? `Record action for ${acting.case_id}`
                : "Record action"
          }
          primaryButtonText={saving ? "Recording…" : "Record action"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!choice || saving}
          onRequestClose={() => setActing(null)}
          onRequestSubmit={() => void record()}
        >
          {acting?.platform_action ? (
            <dl className="flex flex-col gap-3" style={{ fontSize: 14 }}>
              <div>
                <dt className="rcs-helper">RCS result</dt>
                <dd>{PAYLOAD_OUTCOME_LABEL[acting.outcome]}</dd>
              </div>
              <div>
                <dt className="rcs-helper">Your team&apos;s action</dt>
                <dd>{PLATFORM_ACTION_LABEL[acting.platform_action.action]}</dd>
              </div>
              <div>
                <dt className="rcs-helper">Recorded</dt>
                <dd>
                  {formatShortDateTime(acting.platform_action.at)} by {acting.platform_action.by}
                </dd>
              </div>
              {acting.platform_action.note && (
                <div>
                  <dt className="rcs-helper">Note</dt>
                  <dd>{acting.platform_action.note}</dd>
                </div>
              )}
            </dl>
          ) : (
            <div className="flex flex-col gap-5">
              <RadioButtonGroup
                name="platform-action"
                legendText="What did your team do with the post?"
                orientation="vertical"
                valueSelected={choice ?? undefined}
                onChange={(value) => setChoice(value as PlatformAction["action"])}
              >
                <RadioButton id="action-removed" value="REMOVED" labelText={PLATFORM_ACTION_LABEL.REMOVED} />
                <RadioButton id="action-kept" value="KEPT" labelText={PLATFORM_ACTION_LABEL.KEPT} />
              </RadioButtonGroup>
              <TextArea
                id="action-note"
                labelText="Note (optional)"
                helperText="Only your team and RCS see this."
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              {saveError && (
                <InlineNotification
                  kind="error"
                  lowContrast
                  hideCloseButton
                  role="alert"
                  title="That wasn't recorded."
                  subtitle={saveError}
                  style={{ maxWidth: "100%" }}
                />
              )}
            </div>
          )}
        </Modal>
      )}
      <p className="rcs-helper">
        Results include only the case ID, the post link, the outcome, the final severity and when it was decided. RCS
        never shares footage, summaries or who reviewed a case. {ACCESS_DISCLOSURE}
      </p>
    </ClientLayout>
  );
}
