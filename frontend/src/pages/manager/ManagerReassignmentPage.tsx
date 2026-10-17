import { useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { Button, InlineNotification, RadioButton, RadioButtonGroup, TextArea } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadState, ManagerBreadcrumb, Panel } from "../../components/manager/ManagerBits";
import { mono, secondaryText } from "../../components/manager/managerStyles";
import { closeWithoutReassignment, getReassignmentContext, reassignCase } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import { useAuth } from "../../hooks/useAuth";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { useInPlaceSessionExpiry } from "../../hooks/useInPlaceSessionExpiry";
import type { ManagerNotice } from "./managerNotice";

/**
 * Reassignment Action (Manager Figma 119:405), with its confirmations: No
 * reassignment (344:282) and Target unavailable (197:321).
 *
 * The decision uses exposure headroom, not raw footage (MR-CR-03, MR-CR-05).
 * Only Auditors with headroom and no cooldown can be chosen, and the choice is
 * re-validated on confirm. The first available Auditor (most headroom, fallback
 * reviewer last) is suggested and
 * already selected, so the usual decision is one click; the list is the only
 * place the candidates appear. After confirming, the Manager goes straight back
 * to the Overview, where the confirmation shows, instead of stopping on a
 * confirmation page. "No reassignment needed" requires an audit-trail note and
 * closes the case as Complete with the content-neutral public outcome (Manager
 * handoff Rounds 4–5).
 */
export function ManagerReassignmentPage() {
  const { caseId = "" } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { data, error, reload } = useStaffQuery((t) => getReassignmentContext(caseId, t), caseId);
  const { handleSessionError, sessionModal } = useInPlaceSessionExpiry(
    "Your chosen Auditor and your note will be exactly as you left them.",
  );

  // `null` means "the suggested Auditor"; a click on another one overrides it.
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [showNoReassign, setShowNoReassign] = useState(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"reassign" | "close" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const available = data?.candidates.filter((c) => c.available) ?? [];
  // The list arrives with standard Auditors by headroom and the fallback reviewer last.
  const suggested = available[0];
  const target = available.find((c) => c.auditor_id === (chosenId ?? suggested?.auditor_id));

  function finish(notice: ManagerNotice) {
    navigate("/manager", { state: { notice } });
  }

  async function confirmReassignment() {
    if (!token || !target) return;
    setPending("reassign");
    setActionError(null);
    try {
      const { assigned_to_name } = await reassignCase(caseId, token, target.auditor_id);
      finish({
        title: `Reassigned ${caseId} to ${assigned_to_name}.`,
        detail: "It is active in their queue and is marked Complete when they submit their review.",
      });
    } catch (err) {
      if (handleSessionError(err)) return;
      setActionError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
      if (err instanceof ApiError && err.status === 409) {
        // Target unavailable: drop the choice and refresh who is available.
        setChosenId(null);
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
      finish({
        title: `Closed ${caseId} with no reassignment.`,
        detail: "It is marked Complete and your note is in the audit trail.",
      });
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

  return (
    <ManagerLayout showNav={false}>
      {sessionModal}
      <ManagerBreadcrumb trail={trail} />
      <PageHeader
        title={`Reassignment decision — ${caseId}`}
        subtitle="Choose who takes this case. The suggested Auditor has the most exposure headroom; the fallback reviewer is last."
      />
      <LoadState error={error} loading={!data && !error} what="reassignment details" />
      {data && (
        <Panel maxWidth={760}>
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
          {data.declining_auditor && (
            <p style={secondaryText}>
              {data.declining_auditor.name} has {Math.round(data.declining_auditor.exposure_minutes_today)} of{" "}
              {data.declining_auditor.exposure_limit_minutes} min of exposure today.
            </p>
          )}
          <RadioButtonGroup
            legendText="Reassign to"
            name="reassign-target"
            orientation="vertical"
            valueSelected={target?.auditor_id}
            onChange={(value) => setChosenId(String(value))}
          >
            {data.candidates.map((c) => (
              <RadioButton
                key={c.auditor_id}
                id={`reassign-${c.auditor_id}`}
                value={c.auditor_id}
                disabled={!c.available}
                labelText={
                  <>
                    {c.name} <span style={{ ...mono, fontSize: 13 }}>{c.headroom_minutes} min headroom</span>
                    {c.auditor_id === suggested?.auditor_id && " · Suggested"}
                    {!c.available ? " · Unavailable" : c.limited_headroom ? " · Limited headroom" : ""}
                  </>
                }
              />
            ))}
          </RadioButtonGroup>
          {available.length === 0 && (
            <p style={secondaryText}>No Auditor is available right now. You can close the case below.</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!target || pending !== null} onClick={confirmReassignment}>
              {pending === "reassign" ? "Reassigning…" : target ? `Reassign to ${target.name}` : "Reassign"}
            </Button>
            <Button kind="ghost" onClick={() => setShowNoReassign((v) => !v)} aria-expanded={showNoReassign}>
              No reassignment needed
            </Button>
          </div>
          {showNoReassign && (
            <div className="flex flex-col gap-3">
              <TextArea
                id="no-reassignment-note"
                labelText="Note for the audit trail (required)"
                helperText="Closes the case as Complete with no reassignment."
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div>
                <Button kind="secondary" disabled={!note.trim() || pending !== null} onClick={confirmNoReassignment}>
                  {pending === "close" ? "Confirming…" : "Confirm no reassignment"}
                </Button>
              </div>
            </div>
          )}
          <p style={{ ...secondaryText, fontSize: 12 }}>
            <RouterLink
              className="cds--link"
              style={{ fontSize: 12 }}
              to={`/manager/cases/${encodeURIComponent(caseId)}/raw?from=${encodeURIComponent(`/manager/cases/${caseId}/reassign`)}`}
            >
              Not enough to decide? View raw content (exceptional access)
            </RouterLink>
          </p>
        </Panel>
      )}
    </ManagerLayout>
  );
}
