import { useNavigate, useParams } from "react-router-dom";
import { Button, Tag } from "@carbon/react";
import { EntityPills } from "../../components/review/AiEvidencePanels";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { Figure, LoadState, ManagerBreadcrumb, Panel } from "../../components/manager/ManagerBits";
import { mono, pageTitle, secondaryText } from "../../components/manager/managerStyles";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { getManagerCaseReview } from "../../services";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { scoreToTier } from "../../design-tokens/severity";
import { declineReasonLabel } from "../../design-tokens/declineReasons";

function tierAndScore(score: number | null): string {
  return score === null ? "—" : `${scoreToTier(score)} · ${score}`;
}

/**
 * Case Review Detail (Manager Figma 118:198): the AI output, the Auditor's
 * assessment and comment, and the decline reason, so a routine reassignment
 * decision never needs the raw footage (MR-CR-01, MR-CR-05).
 */
export function ManagerCaseReviewPage() {
  const { caseId = "" } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { data, error } = useStaffQuery((t) => getManagerCaseReview(caseId, t), caseId);

  const aiScore = data?.effective_severity_score ?? null;
  const auditorScore = data?.auditor_severity_score ?? null;

  return (
    <ManagerLayout showNav={false}>
      <ManagerBreadcrumb trail={[{ label: "Reassignment Queue", to: "/manager/reassignment" }, { label: caseId }]} />
      <h1 style={pageTitle}>Case {caseId}</h1>
      <LoadState error={error} loading={!data && !error} what="this case" />
      {data && (
        <>
          <Panel title="AI-generated analysis" maxWidth={680}>
            <div className="flex flex-wrap items-center gap-3">
              {data.severity_tier && <SeverityTag tier={data.severity_tier} />}
              {aiScore !== null && <span style={{ ...mono, fontSize: 14 }}>CVI {aiScore}</span>}
            </div>
            <p style={{ fontSize: 14, lineHeight: "20px" }}>
              {data.narrative_summary ?? "No narrative summary is available for this case."}
            </p>
            {data.flagged_entities.length > 0 && (
              <>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--cds-text-secondary)" }}>Flagged entities</h3>
                <EntityPills entities={data.flagged_entities} />
              </>
            )}
          </Panel>

          <Panel title={`Auditor assessment — ${data.auditor_name ?? "Unknown"}`} maxWidth={680}>
            <dl className="flex flex-wrap gap-12">
              <Figure label="AI-original CVI" value={tierAndScore(aiScore)} />
              <Figure
                label="Auditor-adjusted CVI"
                value={
                  auditorScore === null || auditorScore === aiScore
                    ? `${tierAndScore(aiScore)} (unchanged)`
                    : tierAndScore(auditorScore)
                }
              />
            </dl>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--cds-text-secondary)" }}>Auditor comment</h3>
            <p style={data.auditor_comment ? { fontSize: 14, lineHeight: "20px" } : secondaryText}>
              {data.auditor_comment ?? "No comment was added."}
            </p>
            {data.decline && (
              <>
                <hr style={{ border: 0, borderTop: "1px solid var(--cds-border-subtle-01)", margin: 0 }} />
                <div className="flex flex-wrap items-center gap-3">
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--cds-text-secondary)" }}>
                    Decline reason
                  </span>
                  <Tag type="gray" size="md" style={{ margin: 0 }}>
                    {declineReasonLabel(data.decline.reason)}
                  </Tag>
                </div>
                {data.decline.other_text && (
                  <p style={{ fontSize: 14, lineHeight: "20px" }}>&ldquo;{data.decline.other_text}&rdquo;</p>
                )}
              </>
            )}
          </Panel>

          {data.status !== "COMPLETE" && data.manager_flag === "DECLINED" && (
            <div>
              <Button onClick={() => navigate(`/manager/cases/${encodeURIComponent(caseId)}/reassign`)}>
                Continue to reassignment decision
              </Button>
            </div>
          )}
          {data.status === "COMPLETE" && <p style={secondaryText}>This case is Complete. No decision is needed.</p>}
        </>
      )}
    </ManagerLayout>
  );
}
