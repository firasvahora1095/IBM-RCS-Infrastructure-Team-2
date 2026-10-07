import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Accordion,
  AccordionItem,
  Button,
  Column,
  Grid,
  InlineLoading,
  InlineNotification,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextArea,
} from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { LoadState, ManagerBreadcrumb } from "../../components/manager/ManagerBits";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusTag } from "../../components/ui/StatusTag";
import { ReportSheet } from "../../components/reports/ReportSheet";
import { generateReport, getReport, listReportAccess, releaseReport, updateReportNote } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import { useAuth } from "../../hooks/useAuth";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { useSessionExpiryHandler } from "../../hooks/useSessionExpiryHandler";
import { NOT_IN_CLIENT_REPORT, RELEASE_CONFIRM_BODY } from "../../design-tokens/reportLabels";
import { formatPeriod, formatShortDateTime } from "../../utils/formatPeriod";

const NOTE_LIMIT = 600;

/**
 * Report preview / approve (B2B spec S9b). The Manager reviews the exact
 * document CommunityHub will see and releases it. They approve client
 * communication, never individual Auditor decisions.
 */
export function ManagerReportDetailPage() {
  const { reportId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const handleSessionExpiry = useSessionExpiryHandler();
  const { data, error, reload } = useStaffQuery((t) => getReport(reportId, t), reportId);
  const access = useStaffQuery((t) => listReportAccess(reportId, t), `${reportId}:${data?.status ?? ""}`);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error" | "info"; title: string; subtitle?: string } | null>(
    (location.state as { justGenerated?: boolean } | null)?.justGenerated
      ? { kind: "info", title: "Draft created from completed case records.", subtitle: "Review it before releasing." }
      : null,
  );

  useEffect(() => {
    if (data) {
      setNote(data.manager_note ?? "");
      setNoteSaved(true);
    }
  }, [data]);

  const draft = data?.status === "DRAFT";

  function fail(err: unknown, title: string) {
    if (handleSessionExpiry(err)) return;
    setNotice({ kind: "error", title, subtitle: err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE });
  }

  async function saveNote() {
    if (!token || !data) return;
    setSavingNote(true);
    try {
      await updateReportNote(data.report_id, token, note);
      setNoteSaved(true);
      reload();
    } catch (err) {
      fail(err, "Couldn't save the note.");
    } finally {
      setSavingNote(false);
    }
  }

  async function release() {
    if (!token || !data) return;
    setReleasing(true);
    try {
      if (!noteSaved) await updateReportNote(data.report_id, token, note);
      await releaseReport(data.report_id, token);
      setConfirmOpen(false);
      setNotice({ kind: "success", title: "Report released.", subtitle: "CommunityHub's authorised users can now view it." });
      reload();
    } catch (err) {
      setConfirmOpen(false);
      fail(err, "Couldn't release the report.");
    } finally {
      setReleasing(false);
    }
  }

  async function newVersion() {
    if (!token || !data) return;
    try {
      const next = await generateReport(token, data.organisation_id, data.period_start, data.period_end);
      navigate(`/manager/reports/${encodeURIComponent(next.report_id)}`, { state: { justGenerated: true } });
    } catch (err) {
      fail(err, "Couldn't create a new version.");
    }
  }

  return (
    <ManagerLayout>
      <PageHeader
        breadcrumb={<ManagerBreadcrumb trail={[{ label: "Client reports", to: "/manager/reports" }, { label: reportId }]} />}
        title={data ? formatPeriod(data.period_start, data.period_end) : "Report"}
        meta={data && <StatusTag kind="report" value={data.status} />}
        subtitle={
          data &&
          (draft
            ? `Version ${data.version} · Draft generated ${formatShortDateTime(data.generated_at)}`
            : `Version ${data.version} · Released ${formatShortDateTime(data.released_at!)} by ${data.released_by}`)
        }
      />
      <LoadState error={error} loading={!data && !error} what="this report" />

      {notice && (
        <div className={notice.kind === "success" ? "rcs-rise" : undefined}>
          <InlineNotification
            kind={notice.kind}
            lowContrast
            role={notice.kind === "error" ? "alert" : "status"}
            title={notice.title}
            subtitle={notice.subtitle}
            onClose={() => setNotice(null)}
            style={{ maxInlineSize: "100%" }}
          />
        </div>
      )}

      {data && (
        <Grid className="rcs-grid">
          <Column sm={4} md={8} lg={11} className="flex flex-col gap-4">
            <p className="rcs-helper rcs-no-print">This is exactly what CommunityHub will see.</p>
            <ReportSheet report={{ ...data, manager_note: draft ? note.trim() || null : data.manager_note }} />
          </Column>

          <Column sm={4} md={8} lg={5} className="rcs-no-print">
            <div className="flex flex-col gap-6" style={{ position: "sticky", top: "4rem" }}>
              {draft ? (
                <section className="rcs-section" aria-labelledby="release-heading">
                  <h2 id="release-heading" className="rcs-section-title">
                    Review and release
                  </h2>
                  <TextArea
                    id="manager-note"
                    labelText="Service notes for CommunityHub (optional)"
                    helperText="Factual service or quality notes. Shown in the report."
                    value={note}
                    maxCount={NOTE_LIMIT}
                    enableCounter
                    rows={4}
                    onChange={(e) => {
                      setNote(e.target.value);
                      setNoteSaved(false);
                    }}
                  />
                  {savingNote ? (
                    <InlineLoading description="Saving…" />
                  ) : (
                    !noteSaved && (
                      <Button kind="tertiary" size="sm" onClick={saveNote} style={{ alignSelf: "flex-start" }}>
                        Save note
                      </Button>
                    )
                  )}
                  <p className="rcs-helper">
                    Figures come from completed case records. No individual wellbeing, SOS or internal information is
                    included.
                  </p>
                  <Button onClick={() => setConfirmOpen(true)}>
                    Approve and release
                  </Button>
                  <Button kind="ghost" onClick={() => window.print()}>
                    Download draft as PDF
                  </Button>
                </section>
              ) : (
                <section className="rcs-section" aria-labelledby="released-heading">
                  <h2 id="released-heading" className="rcs-section-title">
                    Released
                  </h2>
                  <p className="rcs-body">
                    CommunityHub's authorised users can view and download this version. Released reports can't be
                    edited.
                  </p>
                  <Button kind="tertiary" onClick={newVersion}>
                    Create a new version
                  </Button>
                  <Button kind="ghost" onClick={() => window.print()}>
                    Download as PDF
                  </Button>
                </section>
              )}

              <Accordion>
                <AccordionItem
                  open
                  title="Never included in a client report"
                >
                  <ul className="flex flex-col gap-2" style={{ listStyle: "disc", paddingInlineStart: "1.25rem" }}>
                    {NOT_IN_CLIENT_REPORT.map((item) => (
                      <li key={item} className="rcs-body">
                        {item}
                      </li>
                    ))}
                  </ul>
                </AccordionItem>
                {!draft && (
                  <AccordionItem title={`Client access (${access.data?.length ?? 0})`}>
                    {access.data && access.data.length > 0 ? (
                      <Table size="sm" aria-label="Client access log">
                        <TableHead>
                          <TableRow>
                            <TableHeader>When</TableHeader>
                            <TableHeader>User</TableHeader>
                            <TableHeader>Action</TableHeader>
                            <TableHeader>Result</TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {access.data.map((e, i) => (
                            <TableRow key={i}>
                              <TableCell>{formatShortDateTime(e.at)}</TableCell>
                              <TableCell className="rcs-mono">{e.user_id}</TableCell>
                              <TableCell>{e.action === "VIEW" ? "Viewed" : "Downloaded"}</TableCell>
                              <TableCell>{e.access_result === "SUCCESS" ? "Allowed" : `Denied (${e.reason})`}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="rcs-helper">No one has opened this report yet.</p>
                    )}
                  </AccordionItem>
                )}
              </Accordion>
            </div>
          </Column>
        </Grid>
      )}

      <Modal
        open={confirmOpen}
        danger={false}
        modalHeading="Release this report to CommunityHub?"
        modalLabel={data ? formatPeriod(data.period_start, data.period_end) : undefined}
        primaryButtonText={releasing ? "Releasing…" : "Release report"}
        primaryButtonDisabled={releasing}
        secondaryButtonText="Cancel"
        onRequestClose={() => !releasing && setConfirmOpen(false)}
        onRequestSubmit={release}
      >
        <p className="rcs-body">{RELEASE_CONFIRM_BODY}</p>
      </Modal>
    </ManagerLayout>
  );
}
