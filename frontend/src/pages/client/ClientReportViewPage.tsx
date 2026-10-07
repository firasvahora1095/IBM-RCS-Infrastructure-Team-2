import { useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { Button, InlineNotification, SkeletonText } from "@carbon/react";
import { ClientHeader } from "../../components/shell/ClientHeader";
import { StaffPage } from "../../components/layout/StaffPage";
import { ManagerBreadcrumb } from "../../components/manager/ManagerBits";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/Blocks";
import { ReportSheet } from "../../components/reports/ReportSheet";
import { clientGetReport, clientRecordDownload } from "../../services";
import { ApiError } from "../../services/types";
import { useClientQuery } from "../../hooks/useClientQuery";
import { useClientAuth } from "../../hooks/useClientAuth";
import { ACCESS_DISCLOSURE, CLIENT_DENIED } from "../../design-tokens/reportLabels";
import { formatPeriod } from "../../utils/formatPeriod";

/**
 * Client report view (B2B spec S12b): the released report, read-only, in
 * the same document layout the Manager approved. Download uses the browser's
 * print-to-PDF with a print stylesheet; each view and download is logged.
 * A report that isn't released or isn't theirs shows one neutral "no
 * access" state, the same as a report that doesn't exist.
 */
export function ClientReportViewPage() {
  const { reportId = "" } = useParams();
  const { token } = useClientAuth();
  const { data, error } = useClientQuery((t) => clientGetReport(reportId, t), reportId);
  const [downloadNote, setDownloadNote] = useState<string | null>(null);

  const denied = error instanceof ApiError && (error.status === 404 || error.status === 403);

  async function download() {
    if (!token || !data) return;
    try {
      await clientRecordDownload(data.report_id, token);
      setDownloadNote("Your browser's print dialog is open. Choose Save as PDF.");
      window.print();
    } catch {
      setDownloadNote("We couldn't prepare the download. Please try again.");
    }
  }

  return (
    <>
      <ClientHeader />
      <StaffPage maxWidth={1056}>
        <div className="rcs-no-print">
          <ManagerBreadcrumb trail={[{ label: "Service reports", to: "/client/reports" }, { label: reportId }]} />
        </div>
        {denied && (
          <EmptyState
            title={CLIENT_DENIED}
            body="It may not have been released yet, or it belongs to another organisation."
            action={
              <RouterLink className="cds--link" to="/client/reports">
                Back to your reports
              </RouterLink>
            }
          />
        )}
        {error && !denied && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            role="alert"
            title="Couldn't load this report."
            subtitle={error.message}
            style={{ maxWidth: "100%" }}
          />
        )}
        {!data && !error && <SkeletonText paragraph lineCount={6} />}
        {data && (
          <>
            <div className="rcs-no-print">
              <PageHeader
                title={formatPeriod(data.period_start, data.period_end)}
                subtitle="Released by RCS. Figures are aggregate and come from completed case records."
                actions={<Button onClick={download}>Download PDF</Button>}
              />
            </div>
            <div aria-live="polite" className="rcs-no-print">
              {downloadNote && <p className="rcs-helper">{downloadNote}</p>}
            </div>
            <ReportSheet report={data} />
            <p className="rcs-helper rcs-no-print">{ACCESS_DISCLOSURE}</p>
          </>
        )}
      </StaffPage>
    </>
  );
}
