import { useMemo, useState } from "react";
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
} from "@carbon/react";
import { ClientLayout } from "../../components/layout/ClientLayout";
import { StatTile } from "../../components/ui/StatTile";
import { TablePagination, usePagination } from "../../components/ui/TablePagination";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/Blocks";
import { StatusTag } from "../../components/ui/StatusTag";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { clientListCaseResults, clientRecordPlatformAction } from "../../services";
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
  const [outcome, setOutcome] = useState<"ALL" | DeliveredOutcome>("ALL");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<"needs" | "all" | null>(null);
  const [acting, setActing] = useState<CaseResult | null>(null);
  const [choice, setChoice] = useState<PlatformAction["action"] | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const results = data ?? [];
  const needsAction = results.filter((r) => r.status === "DELIVERED" && !r.platform_action);
  const onItsWay = results.filter((r) => r.status !== "DELIVERED").length;
  const actioned = results.filter((r) => r.platform_action).length;
  // Opens on what is waiting for the team, as the Manager's Deliveries opens on what needs attention.
  const view = picked ?? (needsAction.length > 0 ? "needs" : "all");

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
      window.dispatchEvent(new Event(CLIENT_RESULTS_CHANGED_EVENT));
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  }

  const onNeeds: boolean = view === "needs";
  const viewBody = (
    <div className="flex flex-col gap-4" style={{ paddingBlockStart: 16 }}>
      {onNeeds && (
        <p className="rcs-helper" style={{ fontSize: 14 }}>
          Delivered results your team hasn&apos;t acted on yet. Choose Record action once the post has been removed or
          kept: RCS is told, and the result moves to All results as actioned.
        </p>
      )}

      {rows.length === 0 && onNeeds && outcome === "ALL" && !query.trim() ? (
        <EmptyState
          title="Nothing needs action"
          body="Every delivered result has an action recorded. New results appear here as RCS sends them."
        />
      ) : (
        <>
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
              <Table aria-label="Case results" className="rcs-actions-end">
                <TableHead>
                  <TableRow>
                    <TableHeader>Case ID</TableHeader>
                    <TableHeader>Post</TableHeader>
                    <TableHeader>RCS result</TableHeader>
                    <TableHeader>Final severity</TableHeader>
                    <TableHeader>Completed</TableHeader>
                    <TableHeader>Received</TableHeader>
                    <TableHeader>Your team&apos;s action</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paged.rows.map((r: CaseResult) => (
                    <TableRow key={r.delivery_id}>
                      <TableCell style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                        {r.case_id}
                      </TableCell>
                      <TableCell>
                        {safeHttpUrl(r.post_url) ? (
                          <a className="cds--link" href={safeHttpUrl(r.post_url)!} target="_blank" rel="noreferrer">
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
                      <TableCell>
                        {r.status === "DELIVERED" && r.delivered_at ? (
                          formatShortDateTime(r.delivered_at)
                        ) : (
                          <StatusTag tone="info">On its way</StatusTag>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.platform_action ? (
                          <StatusTag tone={r.platform_action.action === "REMOVED" ? "success" : "neutral"}>
                            {PLATFORM_ACTION_LABEL[r.platform_action.action]}
                          </StatusTag>
                        ) : r.status === "DELIVERED" ? (
                          <StatusTag tone={r.outcome === "POLICY_VIOLATION_FOUND" ? "warning" : "neutral"}>
                            Needs action
                          </StatusTag>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {r.status === "DELIVERED" && !r.platform_action && (
                          <Button
                            kind="tertiary"
                            size="sm"
                            aria-label={`Record action for ${r.case_id}`}
                            onClick={() => open(r)}
                          >
                            Record action
                          </Button>
                        )}
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
      />
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
          <Grid className="rcs-grid" condensed>
            <Column sm={2} md={2} lg={4}>
              <StatTile label="On its way" value={onItsWay} helper="Sent by RCS, not yet received" />
            </Column>
            <Column sm={2} md={2} lg={4}>
              <StatTile label="Actioned" value={actioned} helper="Your team has recorded an action" />
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

      <Modal
        open={acting !== null}
        size="sm"
        modalHeading={acting ? `Record action for ${acting.case_id}` : "Record action"}
        primaryButtonText={saving ? "Recording…" : "Record action"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!choice || saving}
        onRequestClose={() => setActing(null)}
        onRequestSubmit={() => void record()}
      >
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
      </Modal>
      <p className="rcs-helper">
        Results include only the case ID, the post link, the outcome, the final severity and when it was decided. RCS
        never shares footage, summaries or who reviewed a case. {ACCESS_DISCLOSURE}
      </p>
    </ClientLayout>
  );
}
