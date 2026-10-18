import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, InlineLoading } from "@carbon/react";
import { generateReport } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import { useAuth } from "../../hooks/useAuth";
import { ORGANISATION_ID } from "../../hooks/useManagerIntelligence";

/**
 * Generate Report for the period on screen, then open the draft. It is offered where the figures are read (Overview
 * and Insights) as well as on Reports, because the natural next step after reviewing a period is to report on it
 * (BA extra-features §11.1: keep it reachable from the dashboard). The caller shows any error.
 */
export function GenerateReportButton({
  start,
  end,
  disabled,
  kind = "primary",
  onError,
}: {
  start: string;
  end: string;
  disabled?: boolean;
  kind?: "primary" | "tertiary";
  onError: (message: string | null) => void;
}) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [generating, setGenerating] = useState(false);

  async function generate() {
    if (!token) return;
    setGenerating(true);
    onError(null);
    try {
      const report = await generateReport(token, ORGANISATION_ID, start, end);
      navigate(`/manager/reports/${encodeURIComponent(report.report_id)}`);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
      setGenerating(false);
    }
  }

  return generating ? (
    <InlineLoading description="Generating the report…" />
  ) : (
    <Button kind={kind} onClick={generate} disabled={disabled}>
      Generate Report
    </Button>
  );
}
