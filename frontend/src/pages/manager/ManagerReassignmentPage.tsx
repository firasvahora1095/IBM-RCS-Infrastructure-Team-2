import { useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { Button, Dropdown, InlineNotification, TextArea } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { LoadState, ManagerBreadcrumb, Panel } from "../../components/manager/ManagerBits";
import { mono, pageTitle, secondaryText } from "../../components/manager/managerStyles";
import { closeWithoutReassignment, getReassignmentContext, reassignCase } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE, type ReassignmentContext } from "../../services/types";
import { mapOutcomeToDisplay } from "../../design-tokens/outcomeLabels";
import { useAuth } from "../../hooks/useAuth";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { useInPlaceSessionExpiry } from "../../hooks/useInPlaceSessionExpiry";

type Candidate = ReassignmentContext["candidates"][number];

type Result = { kind: "reassigned"; name: string } | { kind: "closed"; note: string };

/**
 * Reassignment Action (Manager Figma 119:405) with its confirmations: No
 * reassignment (344:282), Reassignment confirmed (357:397), and Target
 * unavailable (197:321).
 *
 * The decision uses exposure headroom, not raw footage (MR-CR-03, MR-CR-05).
 * Only Auditors with headroom and no cooldown can be chosen, and the choice is
 * re-validated on confirm. "No reassignment needed" requires an audit-trail
 * note and closes the case as Complete with the content-neutral public outcome
 * (Manager handoff Rounds 4–5).
 */
export function ManagerReassignmentPage() {
  const { caseId = "" } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { data, error, reload } = useStaffQuery((t) => getReassignmentContext(caseId, t), caseId);
  const { handleSessionError, sessionModal } = useInPlaceSessionExpiry(
    "Your chosen Auditor and your note will be exactly as you left them.",
  );

  const [target, setTarget] = useState<Candidate | null>(null);
  // Remounting the Dropdown is how a Carbon Dropdown is cleared after a target turns out unavailable.
  const [dropdownKey, setDropdownKey] = useState(0);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"reassign" | "close" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function confirmReassignment() {
    if (!token || !target) return;
    setPending("reassign");
    setActionError(null);
    try {
      const { assigned_to_name } = await reassignCase(caseId, token, target.auditor_id);
      setResult({ kind: "reassigned", name: assigned_to_name });
    } catch (err) {
      if (handleSessionError(err)) return;
      setActionError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
      if (err instanceof ApiError && err.status === 409) {
        // Target unavailable: clear the choice and refresh who is available.
        setTarget(null);
        setDropdownKey((k) => k + 1);
        reload();
      }
    } finally {
      setPending(null);
    }
  }

  async function confirmNoReassignment() {
    if (!token || !note.trim()) return;
    setPending("close");
    setActionError(null);
    try {
      await closeWithoutReassignment(caseId, token, note);
      setResult({ kind: "closed", note: note.trim() });
    } catch (err) {
      if (handleSessionError(err)) return;
      setActionError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
    } finally {
      setPending(null);
    }
  }

  const trail = [
    { label: caseId, to: `/manager/cases/${encodeURIComponent(caseId)}/review` },
    { label: "Reassignment decision" },
  ];

  if (result) {
    const closed = result.kind === "closed";
    const publicOutcome = mapOutcomeToDisplay("CLOSED_NO_REASSIGNMENT");
    return (
      <ManagerLayout showNav={false}>
        <ManagerBreadcrumb trail={trail} />
        <h1 style={pageTitle}>
          {closed ? "No reassignment confirmed" : "Reassignment confirmed"} — {caseId}
        </h1>
        <Panel title="Decision recorded" maxWidth={760}>
          <InlineNotification
            kind="success"
            lowContrast
            hideCloseButton
            title="Success:"
            subtitle={
              closed
                ? `This case has not been reassigned and is now marked Complete. Your note has been stored to the audit trail for the record. Public status lookup shows: "${publicOutcome?.title} ${publicOutcome?.body}"`
                : `This case has been reassigned to ${result.name}.`
            }
            style={{ maxWidth: "100%" }}
          />
          <p style={{ fontSize: 14 }}>
            Case <span style={mono}>{caseId}</span> —{" "}
            {closed ? "Decision: No reassignment needed — Status: Complete" : `Reassigned to: ${result.name}`}
          </p>
          {closed ? (
            <>
              <h2 style={{ fontSize: 14, fontWeight: 600 }}>Manager&apos;s note (audit trail)</h2>
              <p style={{ fontSize: 14, lineHeight: "20px" }}>{result.note}</p>
            </>
          ) : (
            <p style={{ fontSize: 14, lineHeight: "20px" }}>
              This case is now active in {result.name}&apos;s queue. It is not yet marked Complete — that still happens
              on submission of their review, the same as any other case.
            </p>
          )}
          <div>
            <Button onClick={() => navigate("/manager")}>Return to Dashboard</Button>
          </div>
        </Panel>
      </ManagerLayout>
    );
  }

  const available = data?.candidates.filter((c) => c.available) ?? [];

  return (
    <ManagerLayout showNav={false}>
      {sessionModal}
      <ManagerBreadcrumb trail={trail} />
      <h1 style={pageTitle}>Reassignment decision — {caseId}</h1>
      <LoadState error={error} loading={!data && !error} what="reassignment details" />
      {data && (
        <>
          <Panel maxWidth={760}>
            {data.declining_auditor && (
              <>
                <h2 style={{ fontSize: 14, fontWeight: 600 }}>Declining Auditor&apos;s exposure status</h2>
                <dl className="grid grid-cols-[minmax(0,160px)_minmax(0,1fr)] gap-x-4 gap-y-2" style={{ fontSize: 14 }}>
                  <dt>{data.declining_auditor.name}</dt>
                  <dd style={mono}>
                    {data.declining_auditor.exposure_minutes_today} / {data.declining_auditor.exposure_limit_minutes}{" "}
                    min today
                  </dd>
                </dl>
              </>
            )}
            <h2 style={{ fontSize: 14, fontWeight: 600 }}>Candidate Auditors — exposure headroom</h2>
            <dl className="grid grid-cols-[minmax(0,160px)_minmax(0,1fr)] gap-x-4 gap-y-2" style={{ fontSize: 14 }}>
              {data.candidates.map((c) => (
                <div key={c.auditor_id} className="contents">
                  <dt>{c.name}</dt>
                  <dd style={{ ...mono, fontWeight: c.limited_headroom ? 600 : 400 }}>
                    {c.headroom_minutes} min headroom
                    {!c.available ? "  ·  Unavailable" : c.limited_headroom ? "  ·  Limited headroom" : ""}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Decision" maxWidth={760}>
            {actionError && (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                role="alert"
                title="Error:"
                subtitle={actionError}
                style={{ maxWidth: "100%" }}
              />
            )}
            <div style={{ maxWidth: 320 }}>
              <Dropdown<Candidate>
                id="reassign-target"
                titleText="Reassign to another Auditor"
                label="Select Auditor with available headroom..."
                items={available}
                key={dropdownKey}
                selectedItem={target ?? undefined}
                itemToString={(c) => (c ? `${c.name} — ${c.headroom_minutes} min headroom` : "")}
                onChange={({ selectedItem }) => setTarget(selectedItem ?? null)}
              />
            </div>
            <TextArea
              id="no-reassignment-note"
              labelText="No reassignment needed"
              helperText="This note is captured for the audit trail and is required to confirm this option."
              placeholder="Note (required) — add context for the audit trail..."
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex flex-wrap gap-3">
              <Button disabled={!target || pending !== null} onClick={confirmReassignment}>
                {pending === "reassign" ? "Reassigning…" : "Confirm reassignment"}
              </Button>
              <Button kind="secondary" disabled={!note.trim() || pending !== null} onClick={confirmNoReassignment}>
                {pending === "close" ? "Confirming…" : "Confirm no reassignment"}
              </Button>
            </div>
            <div>
              <Button kind="tertiary" onClick={() => navigate(`/manager/cases/${encodeURIComponent(caseId)}/review`)}>
                ← Back to Case Review Detail
              </Button>
            </div>
            <p style={{ ...secondaryText, fontSize: 12 }}>
              Structured signals not enough to decide?
              <br />
              <RouterLink
                className="cds--link"
                style={{ fontSize: 12 }}
                to={`/manager/cases/${encodeURIComponent(caseId)}/raw?from=${encodeURIComponent(`/manager/cases/${caseId}/reassign`)}`}
              >
                View raw content (exceptional access, same protections as an Auditor)
              </RouterLink>
            </p>
          </Panel>
        </>
      )}
    </ManagerLayout>
  );
}
