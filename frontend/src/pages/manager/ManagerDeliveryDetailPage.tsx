import { useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Accordion,
  AccordionItem,
  Button,
  CodeSnippet,
  Column,
  Grid,
  InlineLoading,
  InlineNotification,
  Modal,
  TextArea,
} from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { LoadState, ManagerBreadcrumb } from "../../components/manager/ManagerBits";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusTag } from "../../components/ui/StatusTag";
import { KeyValueList, Section, TimelineList, type TimelineItem } from "../../components/ui/Blocks";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { escalateDelivery, getDelivery, retryDelivery } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE, type Delivery } from "../../services/types";
import { useAuth } from "../../hooks/useAuth";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { useSessionExpiryHandler } from "../../hooks/useSessionExpiryHandler";
import {
  DELIVERY_BOUNDARY_NOTE,
  DELIVERY_SPLIT_SENTENCE,
  IDEMPOTENCY_NOTE,
  PAYLOAD_OUTCOME_LABEL,
} from "../../design-tokens/deliveryLabels";
import { formatShortDateTime } from "../../utils/formatPeriod";

/** The structured payload CommunityHub receives (Sprint 3 extras §4.2). Facts only, no narrative. */
function payloadFor(d: Delivery): string {
  const payload: Record<string, string> = {
    delivery_id: d.delivery_id,
    case_id: d.case_id,
    outcome: d.outcome,
    final_severity: d.final_severity,
    completed_at: d.completed_at,
  };
  if (d.source_url) payload.source_url = d.source_url;
  return JSON.stringify(payload, null, 2);
}

function attemptItems(d: Delivery): TimelineItem[] {
  const items: TimelineItem[] = d.attempts.map((a) => ({
    title: `${a.manual ? "Manual retry" : `Attempt ${a.attempt}`} · ${a.result === "SUCCESS" ? "Delivered" : "Failed"}`,
    time: formatShortDateTime(a.at),
    detail: a.reason ?? (a.result === "SUCCESS" ? "CommunityHub accepted the result." : undefined),
    tone: a.result === "SUCCESS" ? "success" : "error",
  }));
  if (d.next_attempt_at) {
    items.push({
      title: d.attempts.length === 0 ? "First attempt scheduled" : "Next automatic attempt scheduled",
      time: formatShortDateTime(d.next_attempt_at),
      tone: "info",
    });
  } else if (d.delivery_status === "NEEDS_ATTENTION") {
    items.push({
      title: "No further automatic attempts · Waiting for a Manager",
      detail: "Retry once CommunityHub's endpoint is back, or escalate to the integration owner.",
      tone: "neutral",
    });
  }
  return items;
}

/**
 * Delivery detail (B2B spec S8b). The Manager handles the operational
 * problem, never the moderation decision: there is deliberately no control
 * here to approve or change the Auditor's outcome.
 */
export function ManagerDeliveryDetailPage() {
  const { deliveryId = "" } = useParams();
  const { token } = useAuth();
  const handleSessionExpiry = useSessionExpiryHandler();
  const { data, error, reload } = useStaffQuery((t) => getDelivery(deliveryId, t), deliveryId);
  const [retrying, setRetrying] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; title: string; subtitle?: string } | null>(null);
  const [escalating, setEscalating] = useState(false);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  async function retry() {
    if (!token || !data) return;
    setRetrying(true);
    setNotice(null);
    try {
      const updated = await retryDelivery(data.delivery_id, token);
      setNotice(
        updated.delivery_status === "SUCCESS"
          ? { kind: "success", title: "Delivered.", subtitle: "CommunityHub accepted the result." }
          : { kind: "error", title: "Still failing.", subtitle: updated.failure_reason ?? undefined },
      );
      reload();
    } catch (err) {
      if (handleSessionExpiry(err)) return;
      setNotice({ kind: "error", title: "Couldn't retry.", subtitle: err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE });
    } finally {
      setRetrying(false);
    }
  }

  async function submitEscalation() {
    if (!token || !data) return;
    if (!note.trim()) {
      setNoteError("Add a short note so the integration owner knows what to check.");
      return;
    }
    try {
      await escalateDelivery(data.delivery_id, token, note);
      setEscalating(false);
      setNote("");
      setNotice({ kind: "success", title: "Escalated.", subtitle: "The integration owner has your note." });
      reload();
    } catch (err) {
      if (handleSessionExpiry(err)) return;
      setNoteError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
    }
  }

  const failed = data?.delivery_status === "NEEDS_ATTENTION";
  const retryingAuto = data?.delivery_status === "RETRYING" || data?.delivery_status === "PENDING";

  return (
    <ManagerLayout>
      <PageHeader
        breadcrumb={
          <ManagerBreadcrumb trail={[{ label: "Deliveries", to: "/manager/deliveries" }, { label: deliveryId }]} />
        }
        title={<span className="rcs-mono">{deliveryId}</span>}
        meta={data && <StatusTag kind="delivery" value={data.delivery_status} />}
      />
      <LoadState error={error} loading={!data && !error} what="this delivery" />
      {data && (
        <Grid className="rcs-grid">
          <Column sm={4} md={8} lg={10} className="flex flex-col gap-6">
            {/* Two separate facts, side by side, never merged into one badge. */}
            <section className="rcs-section" aria-label="Status">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <span className="rcs-stat-label">Moderation status</span>
                  <StatusTag kind="moderation" value="COMPLETE" />
                  <span className="rcs-helper">Decided by the Auditor. Final.</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="rcs-stat-label">Delivery status</span>
                  <StatusTag kind="delivery" value={data.delivery_status} />
                  <span className="rcs-helper">
                    {data.delivery_status === "SUCCESS"
                      ? "CommunityHub has the result."
                      : retryingAuto
                        ? "RCS is retrying automatically."
                        : "Automatic retries have stopped."}
                  </span>
                </div>
              </div>
              {failed && <p className="rcs-body">{DELIVERY_SPLIT_SENTENCE}</p>}
            </section>

            {notice && (
              <InlineNotification
                kind={notice.kind}
                lowContrast
                role={notice.kind === "error" ? "alert" : "status"}
                title={notice.title}
                subtitle={notice.subtitle}
                onClose={() => setNotice(null)}
              />
            )}

            {failed && (
              <Section
                title="What went wrong"
                description="CommunityHub didn't accept this result after three automatic attempts."
              >
                <InlineNotification
                  kind="error"
                  lowContrast
                  hideCloseButton
                  title="Failure reason:"
                  subtitle={data.failure_reason ?? "Unknown"}
                />
                {data.escalated_at && (
                  <p className="rcs-helper">Escalated {formatShortDateTime(data.escalated_at)}.</p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  {retrying ? (
                    <InlineLoading description="Retrying delivery…" status="active" />
                  ) : (
                    <Button onClick={retry}>
                      Retry delivery
                    </Button>
                  )}
                  <Button kind="secondary" onClick={() => setEscalating(true)}>
                    Escalate issue
                  </Button>
                </div>
                <Accordion>
                  <AccordionItem title="View technical details">
                    <KeyValueList
                      mono={["Delivery ID", "Last response", "Destination"]}
                      items={[
                        { label: "Delivery ID", value: data.delivery_id },
                        { label: "Destination", value: "https://api.communityhub.example/••••••/rcs-results" },
                        {
                          label: "Last response",
                          value: data.failure_reason?.includes("503") ? "HTTP 503 Service Unavailable" : "No response within 10 s",
                        },
                        { label: "Automatic attempts", value: `${data.attempts.filter((a) => !a.manual).length} of 3` },
                      ]}
                    />
                  </AccordionItem>
                </Accordion>
              </Section>
            )}

            <Section title="Attempt history" description="Every attempt reuses the same delivery ID.">
              <TimelineList label="Delivery attempts" items={attemptItems(data)} />
            </Section>
          </Column>

          <Column sm={4} md={8} lg={6} className="flex flex-col gap-6">
            <Section title="What CommunityHub receives" description="Structured facts only. No narrative, footage or Auditor details.">
              <CodeSnippet type="multi" feedback="Copied" aria-label="Delivery payload" wrapText>
                {payloadFor(data)}
              </CodeSnippet>
              <p className="rcs-helper">{IDEMPOTENCY_NOTE}</p>
            </Section>

            <Section title="Case">
              <KeyValueList
                mono={["Case ID"]}
                items={[
                  {
                    label: "Case ID",
                    value: data.case_available ? (
                      <RouterLink className="cds--link" to={`/manager/cases/${encodeURIComponent(data.case_id)}/review`}>
                        {data.case_id}
                      </RouterLink>
                    ) : (
                      data.case_id
                    ),
                  },
                  { label: "Outcome", value: PAYLOAD_OUTCOME_LABEL[data.outcome] },
                  { label: "Final severity", value: <SeverityTag tier={data.final_severity} size="sm" /> },
                  { label: "Completed", value: formatShortDateTime(data.completed_at) },
                  { label: "Source link", value: data.source_url ?? "Not provided (optional)" },
                ]}
              />
              {!data.case_available && (
                <p className="rcs-helper">This older case is no longer in the live queue.</p>
              )}
            </Section>

            <p className="rcs-helper">{DELIVERY_BOUNDARY_NOTE}</p>
          </Column>
        </Grid>
      )}

      <Modal
        open={escalating}
        modalHeading="Escalate this delivery"
        modalLabel={deliveryId}
        primaryButtonText="Send to integration owner"
        secondaryButtonText="Cancel"
        onRequestClose={() => {
          setEscalating(false);
          setNoteError(null);
        }}
        onRequestSubmit={submitEscalation}
      >
        <p className="rcs-body" style={{ marginBottom: "1rem" }}>
          This sends the failure details and your note to the person who looks after the CommunityHub connection.
          The case itself stays complete.
        </p>
        <TextArea
          id="escalation-note"
          labelText="Note"
          helperText="What you've tried, and anything CommunityHub told you."
          value={note}
          maxCount={600}
          enableCounter
          invalid={Boolean(noteError)}
          invalidText={noteError ?? undefined}
          onChange={(e) => {
            setNote(e.target.value);
            setNoteError(null);
          }}
        />
      </Modal>
    </ManagerLayout>
  );
}
