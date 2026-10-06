import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Button,
  DatePicker,
  DatePickerInput,
  Dropdown,
  InlineLoading,
  InlineNotification,
  Layer,
  Modal,
  RadioButton,
  RadioButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { LoadState } from "../../components/manager/ManagerBits";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusTag } from "../../components/ui/StatusTag";
import { EmptyState } from "../../components/ui/Blocks";
import { generateReport, listReports } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import { useAuth } from "../../hooks/useAuth";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { useSessionExpiryHandler } from "../../hooks/useSessionExpiryHandler";
import { formatPeriod, formatShortDateTime } from "../../utils/formatPeriod";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type Preset = "previous-month" | "last-30" | "last-7" | "custom";

function presetRange(preset: Exclude<Preset, "custom">): [string, string] {
  const today = new Date();
  if (preset === "previous-month") {
    return [iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)), iso(new Date(today.getFullYear(), today.getMonth(), 0))];
  }
  const days = preset === "last-30" ? 30 : 7;
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1));
  return [iso(start), iso(end)];
}

/**
 * Client reports (B2B spec S9a). Reports are generated on demand for a
 * customer and period, from the same completed case records the Manager
 * sees elsewhere, then reviewed and released. Report cadence is on demand
 * by design (Sprint 3 extras §16.10).
 */
export function ManagerReportsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const handleSessionExpiry = useSessionExpiryHandler();
  const { data, error } = useStaffQuery(listReports);
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>("previous-month");
  const [custom, setCustom] = useState<[string, string] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const range = preset === "custom" ? custom : presetRange(preset);

  async function generate() {
    if (!token) return;
    if (!range) {
      setFormError("Choose a start and end date.");
      return;
    }
    setGenerating(true);
    setFormError(null);
    try {
      const draft = await generateReport(token, "COMMUNITYHUB", range[0], range[1]);
      navigate(`/manager/reports/${encodeURIComponent(draft.report_id)}`, { state: { justGenerated: true } });
    } catch (err) {
      if (handleSessionExpiry(err)) return;
      setFormError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
      setGenerating(false);
    }
  }

  return (
    <ManagerLayout>
      <PageHeader
        title="Client reports"
        subtitle="Aggregate service reports for CommunityHub. You review and release each one; individual case decisions are never re-approved here."
        actions={
          <>
            <Button kind="tertiary" onClick={() => navigate("/manager/customers/communityhub")}>
              Customer
            </Button>
            <Button onClick={() => setOpen(true)}>
              Generate report
            </Button>
          </>
        }
      />
      <LoadState error={error} loading={!data && !error} what="reports" />
      {data && data.length === 0 && (
        <EmptyState
          title="No reports yet"
          body="Generate a draft for a period. You'll review it before CommunityHub can see it."
          action={<Button onClick={() => setOpen(true)}>Generate report</Button>}
        />
      )}
      {data && data.length > 0 && (
        <Layer>
          <TableContainer>
            <Table aria-label="Client service reports">
              <TableHead>
                <TableRow>
                  <TableHeader>Period</TableHeader>
                  <TableHeader>Report</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Cases completed</TableHeader>
                  <TableHeader>Generated</TableHeader>
                  <TableHeader>Released</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.report_id}>
                    <TableCell>
                      <RouterLink className="cds--link" to={`/manager/reports/${encodeURIComponent(r.report_id)}`}>
                        {formatPeriod(r.period_start, r.period_end)}
                      </RouterLink>
                    </TableCell>
                    <TableCell className="rcs-mono">
                      {r.report_id} · v{r.version}
                    </TableCell>
                    <TableCell>
                      <StatusTag kind="report" value={r.status} />
                    </TableCell>
                    <TableCell className="rcs-mono">{r.metrics.cases_completed}</TableCell>
                    <TableCell>{formatShortDateTime(r.generated_at)}</TableCell>
                    <TableCell>
                      {r.released_at ? `${formatShortDateTime(r.released_at)} · ${r.released_by}` : "Not released"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Layer>
      )}

      <Modal
        open={open}
        modalHeading="Generate a client report"
        modalLabel="CommunityHub"
        primaryButtonText={generating ? "Generating…" : "Generate draft"}
        primaryButtonDisabled={generating}
        secondaryButtonText="Cancel"
        onRequestClose={() => {
          if (!generating) setOpen(false);
        }}
        onRequestSubmit={generate}
      >
        <div className="flex flex-col gap-6">
          <Dropdown
            id="report-customer"
            titleText="Customer"
            label="CommunityHub"
            items={["CommunityHub"]}
            initialSelectedItem="CommunityHub"
            helperText="CommunityHub is the only customer in this prototype."
          />
          <RadioButtonGroup
            legendText="Reporting period"
            name="report-period"
            orientation="vertical"
            valueSelected={preset}
            onChange={(value) => {
              setPreset(value as Preset);
              setFormError(null);
            }}
          >
            <RadioButton id="period-previous" value="previous-month" labelText="Previous calendar month" />
            <RadioButton id="period-30" value="last-30" labelText="Last 30 days" />
            <RadioButton id="period-7" value="last-7" labelText="Last 7 days" />
            <RadioButton id="period-custom" value="custom" labelText="Custom range" />
          </RadioButtonGroup>
          {preset === "custom" && (
            <DatePicker
              datePickerType="range"
              dateFormat="d/m/Y"
              locale="en"
              onChange={(dates: Date[]) => {
                setCustom(dates.length === 2 && dates[0] && dates[1] ? [iso(dates[0]), iso(dates[1])] : null);
                setFormError(null);
              }}
            >
              <DatePickerInput id="period-start" labelText="Start date" placeholder="dd/mm/yyyy" />
              <DatePickerInput id="period-end" labelText="End date" placeholder="dd/mm/yyyy" />
            </DatePicker>
          )}
          {range && (
            <p className="rcs-body">
              The draft will count cases completed between <strong>{formatPeriod(range[0], range[1])}</strong>, using
              the stored case records. Nothing is sent to CommunityHub until you release it.
            </p>
          )}
          <div aria-live="polite">
            {generating && <InlineLoading description="Calculating figures from case records…" />}
            {formError && (
              <InlineNotification kind="error" lowContrast hideCloseButton role="alert" title={formError} />
            )}
          </div>
        </div>
      </Modal>
    </ManagerLayout>
  );
}
