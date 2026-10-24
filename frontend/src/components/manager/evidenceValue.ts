import type { EvidenceKey, ManagerIntelligence, SeverityTier } from "../../services/types";

const TIERS: SeverityTier[] = ["S1", "S2", "S3", "S4"];
const percent = (share: number) => `${(share * 100).toFixed(1)}%`;

/** The headline value an evidence dialog shows for a figure. */
export function evidenceValue(data: ManagerIntelligence, key: EvidenceKey): string {
  switch (key) {
    case "total_cases":
      return String(data.kpis.total_cases);
    case "completed":
      return String(data.kpis.completed);
    case "open_cases":
    case "case_flow":
      return String(data.kpis.open_cases);
    case "needs_manager_action":
      return String(data.kpis.needs_manager_action);
    case "outcomes":
      return String(data.outcomes.violation + data.outcomes.no_violation);
    case "severity":
      return String(TIERS.reduce((sum, t) => sum + data.outcomes.severity[t], 0));
    case "override_rate":
      return data.comparison.eligible ? percent(data.comparison.override_rate) : "Not enough cases";
    case "delivery_success_rate":
      return data.delivery.success_rate === null ? "No finished deliveries" : percent(data.delivery.success_rate);
    case "protection":
      return `${data.evidence.protection.records_included} Auditors`;
  }
}
