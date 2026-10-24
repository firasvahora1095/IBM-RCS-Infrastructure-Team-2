import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DatePicker,
  DatePickerInput,
  Dropdown,
  InlineLoading,
  InlineNotification,
  Modal,
  RadioButton,
  RadioButtonGroup,
} from "@carbon/react";
import { generateReport } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import { useAuth } from "../../hooks/useAuth";
import { useClients } from "../../hooks/useClientScope";
import { useSessionExpiryHandler } from "../../hooks/useSessionExpiryHandler";
import { formatPeriod } from "../../utils/formatPeriod";

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
 * The one Generate report dialog, opened from Reports and from Insights so a report is made the same way wherever it
 * is started: pick the Client, pick the period, get a draft to review. With a Client selected in the header it is
 * already chosen; the Manager can still change it here, because a report is always for exactly one Client.
 */
export function GenerateReportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const handleSessionExpiry = useSessionExpiryHandler();
  const { clients, selected } = useClients();
  const [chosenClient, setChosenClient] = useState("");
  const [preset, setPreset] = useState<Preset>("previous-month");
  const [custom, setCustom] = useState<[string, string] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reportClient = chosenClient || selected?.organisation_id || clients[0]?.organisation_id || "";
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
      const draft = await generateReport(token, reportClient, range[0], range[1]);
      navigate(`/manager/reports/${encodeURIComponent(draft.report_id)}`, { state: { justGenerated: true } });
    } catch (err) {
      if (handleSessionExpiry(err)) return;
      setFormError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
      setGenerating(false);
    }
  }

  const clientName = clients.find((c) => c.organisation_id === reportClient)?.name ?? "Client";

  return (
    <Modal
      open={open}
      modalHeading="Generate report"
      modalLabel={clientName}
      primaryButtonText={generating ? "Generating…" : "Generate draft"}
      primaryButtonDisabled={generating || !reportClient}
      secondaryButtonText="Cancel"
      onRequestClose={() => {
        if (!generating) onClose();
      }}
      onRequestSubmit={generate}
    >
      <div className="flex flex-col gap-6">
        <Dropdown
          id="report-customer"
          titleText="Client"
          label="Choose a Client"
          items={clients}
          itemToString={(c) => (c ? c.name : "")}
          selectedItem={clients.find((c) => c.organisation_id === reportClient) ?? null}
          onChange={({ selectedItem }) => setChosenClient(selectedItem?.organisation_id ?? "")}
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
            The draft will count cases completed between <strong>{formatPeriod(range[0], range[1])}</strong>, using the
            stored case records. Nothing is sent to {clientName} until you release it.
          </p>
        )}
        <div aria-live="polite">
          {generating && <InlineLoading description="Calculating figures from case records…" />}
          {formError && <InlineNotification kind="error" lowContrast hideCloseButton role="alert" title={formError} />}
        </div>
      </div>
    </Modal>
  );
}
