import { useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Accordion,
  AccordionItem,
  Button,
  CodeSnippet,
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
import { useClients } from "../../hooks/useClientScope";
import { useSessionExpiryHandler } from "../../hooks/useSessionExpiryHandler";
import {
  DELIVERY_BOUNDARY_NOTE,
  DELIVERY_SPLIT_SENTENCE,
  IDEMPOTENCY_NOTE,
  PAYLOAD_OUTCOME_LABEL,
  PLATFORM_ACTION_LABEL,
} from "../../design-tokens/deliveryLabels";
import { formatShortDateTime } from "../../utils/formatPeriod";

/** The structured payload CommunityHub receives (Sprint 3 extras §4.2). Facts only, no narrative. */
function payloadFor(d: Delivery): string {
  const payload: Record<string, string | null> = {
    delivery_id: d.delivery_id,
    case_id: d.case_id,
    outcome: d.outcome,
    final_severity: d.final_severity,
    completed_at: d.completed_at,
  };
  if (d.source_url) payload.source_url = d.source_url;
  return JSON.stringify(payload, null, 2);
}

/** What went wrong, as a Manager would say it. The raw reason stays in the technical details. */
function plainReason(reason: string | null, client: string): string {
  if (!reason) return `${client}'s system didn't accept it.`;
  if (/503|unavailable/i.test(reason)) return `${client}'s system was down when RCS sent it.`;
  if (/timeout|respond/i.test(reason)) return `${client}'s system didn't answer in time.`;
  return reason;
}

function attemptItems(d: Delivery, client: string): TimelineItem[] {
  const items: TimelineItem[] = d.attempts.map((a) => ({
    title: `${a.manual ? "You retried" : `Try ${a.attempt}`}: ${a.result === "SUCCESS" ? "delivered" : "didn't arrive"}`,
    time: formatShortDateTime(a.at),
    detail: a.result === "SUCCESS" ? `${client} accepted the result.` : plainReason(a.reason ?? null, client),
    tone: a.result === "SUCCESS" ? "success" : "error",
  }));
  if (d.next_attempt_at) {
    items.push({
      title: d.attempts.length === 0 ? "First try scheduled" : "RCS will try again",
      time: formatShortDateTime(d.next_attempt_at),
      tone: "info",
    });
  } else if (d.delivery_status === "NEEDS_ATTENTION") {
    items.push({
      title: "RCS stopped trying. Waiting for you.",
      detail: `Retry once ${client}'s system is back, or tell the integration owner.`,
      tone: "neutral",
    });
  }
  return items;
}

/**
 * Delivery detail (B2B spec S8b), written for the Manager: one plain statement of where the result is and what to do,
 * then the case and what happened, with IDs, the endpoint and the payload one step away for the integration owner.
 * The Manager handles the delivery, never the moderation decision: there is deliberately no control here to change
 * the Auditor's outcome.
 */
export function ManagerDeliveryDetailPage() {
  const { deliveryId = "" } = useParams();
  const { token } = useAuth();
  const handleSessionExpiry = useSessionExpiryHandler();
  const { data, error, reload } = useStaffQuery((t) => getDelivery(deliveryId, t), deliveryId);
  const { clients } = useClients();
  // The delivery's own Client, not the one selected in the header: a link can open any Client's delivery.
  const clientName = clients.find((c) => c.organisation_id === data?.organisation_id)?.name ?? "the Client";
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
          ? { kind: "success", title: "Delivered.", subtitle: `${clientName} accepted the result.` }
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

  const autoTries = data ? data.attempts.filter((a) => !a.manual).length : 0;
  const headline = !data
    ? ""
    : data.delivery_status === "SUCCESS"
      ? `${clientName} has this result`
      : failed
        ? `This result didn't reach ${clientName}`
        : `RCS is still sending this result to ${clientName}`;

  return (
    <ManagerLayout>
      <PageHeader
        breadcrumb={
          <ManagerBreadcrumb trail={[{ label: "Deliveries", to: "/manager/deliveries" }, { label: data?.case_id ?? deliveryId }]} />
        }
        title={`Result for ${clientName}`}
        subtitle={data ? `Case ${data.case_id} · ${PAYLOAD_OUTCOME_LABEL[data.outcome]}` : undefined}
      />
      <LoadState error={error} loading={!data && !error} what="this delivery" />
      {data && (
        <div className="rcs-client-page">
          <Section
            id="delivery-status"
            title={headline}
            description={
              data.delivery_status === "SUCCESS"
                ? `Delivered ${formatShortDateTime(data.attempts.at(-1)?.at ?? data.completed_at)}.`
                : failed
                  ? `${plainReason(data.failure_reason, clientName)} RCS tried ${autoTries} ${autoTries === 1 ? "time" : "times"} and stopped.`
                  : data.next_attempt_at
                    ? `Next try ${formatShortDateTime(data.next_attempt_at)}. Nothing for you to do yet.`
                    : "Nothing for you to do yet."
            }
            actions={
              data.delivery_status === "NEEDS_ATTENTION" && data.escalated_at ? (
                <StatusTag tone="info">Escalated</StatusTag>
              ) : (
                <StatusTag kind="delivery" value={data.delivery_status} />
              )
            }
          >
            {failed &&
              (data.escalated_at ? (
                // The loop has a way out: the owner fixes it, the Manager retries, it is delivered. If nobody
                // answers, it comes back to Needs you after a day.
                <>
                  <p className="rcs-body">
                    <strong>With the integration owner</strong> since {formatShortDateTime(data.escalated_at)}.
                  </p>
                  <ol className="flex flex-col gap-1" style={{ paddingInlineStart: "1.25rem", listStyle: "decimal", fontSize: 14 }}>
                    <li>The integration owner fixes the problem at {clientName}.</li>
                    <li>When they confirm, retry. A delivered result closes this.</li>
                    <li>If there is no answer within a day, this comes back to you as overdue.</li>
                  </ol>
                </>
              ) : (
                <p className="rcs-body">
                  Try again first: this is usually a short outage at {clientName}. If it still fails, tell the
                  integration owner.
                </p>
              ))}
            {failed && (
              <div className="flex flex-wrap items-center gap-3">
                {retrying ? (
                  <InlineLoading description="Retrying delivery…" status="active" />
                ) : (
                  <Button onClick={retry}>Retry delivery</Button>
                )}
                {!data.escalated_at && (
                  <Button kind="tertiary" onClick={() => setEscalating(true)}>
                    Escalate issue
                  </Button>
                )}
              </div>
            )}
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
            {failed && <p className="rcs-helper">{DELIVERY_SPLIT_SENTENCE}</p>}
          </Section>

          <div className="rcs-client-columns">
            <Section title="About this case">
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
                  {
                    label: "Final severity",
                    value: data.final_severity ? <SeverityTag tier={data.final_severity} size="sm" /> : "None (closed without a decision)",
                  },
                  {
                    label: `What ${clientName} did`,
                    value: data.platform_action
                      ? `${PLATFORM_ACTION_LABEL[data.platform_action.action]}, ${formatShortDateTime(data.platform_action.at)}${data.platform_action.note ? ` — "${data.platform_action.note}"` : ""}`
                      : data.delivery_status === "SUCCESS"
                        ? `Waiting for ${clientName}'s moderators`
                        : "Nothing yet: they don't have the result",
                  },
                  { label: "Reviewed", value: formatShortDateTime(data.completed_at) },
                ]}
              />
              {!data.case_available && <p className="rcs-helper">This older case is no longer in the live queue.</p>}
              <p className="rcs-helper">{DELIVERY_BOUNDARY_NOTE}</p>
            </Section>

            <Section title="What happened" description="RCS tries three times on its own before asking you.">
              <TimelineList label="Delivery attempts" items={attemptItems(data, clientName)} />
            </Section>
          </div>

          {/* IDs, the endpoint and the payload are for whoever maintains the connection. */}
          <Accordion>
            <AccordionItem title="Technical details for the integration owner">
              <div className="flex flex-col gap-6">
                <KeyValueList
                  mono={["Delivery ID", "Last response", "Destination"]}
                  items={[
                    { label: "Delivery ID", value: data.delivery_id },
                    { label: "Destination", value: "https://api.communityhub.example/••••••/rcs-results" },
                    ...(failed
                      ? [
                          {
                            label: "Last response",
                            value: data.failure_reason?.includes("503") ? "HTTP 503 Service Unavailable" : "No response within 10 s",
                          },
                        ]
                      : []),
                    { label: "Automatic attempts", value: `${autoTries} of 3` },
                    { label: "Source link", value: data.source_url ?? "Not provided (optional)" },
                  ]}
                />
                <div className="flex flex-col gap-2">
                  <h3 className="rcs-subheading">What {clientName} receives</h3>
                  <CodeSnippet type="multi" feedback="Copied" aria-label="Delivery payload" wrapText>
                    {payloadFor(data)}
                  </CodeSnippet>
                  <p className="rcs-helper">Structured facts only. No narrative, footage or Auditor details. {IDEMPOTENCY_NOTE}</p>
                </div>
              </div>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      <Modal
        open={escalating}
        modalHeading="Escalate this delivery"
        modalLabel={deliveryId}
        primaryButtonText="Send escalation"
        secondaryButtonText="Cancel"
        onRequestClose={() => {
          setEscalating(false);
          setNoteError(null);
        }}
        onRequestSubmit={submitEscalation}
      >
        {/* The failure stays in view so the note can refer to it, and what happens next is said once. */}
        <dl className="rcs-kv" style={{ marginBottom: "1rem" }}>
          <div className="rcs-kv-row">
            <dt>Failure</dt>
            <dd>{data?.failure_reason ?? "Unknown"}</dd>
          </div>
          <div className="rcs-kv-row">
            <dt>Attempts</dt>
            <dd>{data?.attempts.length ?? 0}</dd>
          </div>
        </dl>
        <p className="rcs-body" style={{ marginBottom: "1rem" }}>
          The integration owner receives the failure details and your note. The case stays complete.
        </p>
        <TextArea
          id="escalation-note"
          labelText="Note for the integration owner"
          placeholder="What you have tried, and anything the Client told you."
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
