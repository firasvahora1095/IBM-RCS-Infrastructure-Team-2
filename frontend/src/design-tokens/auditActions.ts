/**
 * Every action the audit log records, with a readable name, so the Manager
 * can pick one from a list instead of guessing a code (Audit history filter).
 * Codes match backend/app/main.py; the mock data source writes the same codes.
 */
export const AUDIT_ACTIONS: ReadonlyArray<{ code: string; label: string }> = [
  { code: "CASE_CREATED", label: "Case created" },
  { code: "CASE_ASSIGNED", label: "Case assigned" },
  { code: "AI_ANALYSIS_COMPLETED", label: "AI analysis completed" },
  { code: "AI_ANALYSIS_FAILED", label: "AI analysis failed" },
  { code: "CONTENT_WARNING_ACKNOWLEDGED", label: "Content warning acknowledged" },
  { code: "CASE_RESOLVED", label: "Case resolved by Auditor" },
  { code: "CASE_DECLINED", label: "Case declined" },
  { code: "RETURNED_AT_DAILY_LIMIT", label: "Case returned at daily limit" },
  { code: "CASE_REASSIGNED", label: "Case reassigned" },
  { code: "CASE_CLOSED_BY_MANAGER", label: "Case closed without reassignment" },
  { code: "EXCEPTIONAL_ACCESS_RECORDED", label: "Exceptional raw-content access" },
  { code: "SOS_TRIGGERED", label: "SOS raised" },
  { code: "SOS_ACKNOWLEDGED", label: "SOS acknowledged" },
  { code: "SOS_FOLLOW_UP_LOGGED", label: "SOS follow-up logged" },
  { code: "UNEXPECTED_EXPOSURE", label: "Unexpected exposure (AI failed mid-review)" },
  { code: "WELLBEING_SUPPORT_REQUESTED", label: "Support requested" },
  { code: "WELLBEING_REQUEST_WITHDRAWN", label: "Support request withdrawn" },
  { code: "WELLBEING_FOLLOWED_UP", label: "Support request followed up" },
  { code: "BREAK_APPROVED", label: "Break approved" },
  { code: "EXPOSURE_LIMIT_SET", label: "Exposure limit changed" },
  { code: "SHIFT_STOPPED", label: "Shift stopped" },
  { code: "SHIFT_STOPPED_CASE_RETURNED", label: "Case returned when shift stopped" },
  { code: "MOCK_AI_RESULT_INSERTED", label: "Test AI result inserted" },
  { code: "CLIENT_MESSAGE_SEEN", label: "Client message opened" },
  { code: "CLIENT_MESSAGE_REPLIED", label: "Client message answered" },
  { code: "DELIVERY_RETRIED", label: "Delivery retried" },
  { code: "DELIVERY_ESCALATED", label: "Delivery escalated" },
  { code: "REPORT_GENERATED", label: "Report generated" },
  { code: "REPORT_REGENERATED", label: "Report refreshed" },
  { code: "REPORT_RELEASED", label: "Report released" },
  { code: "INTEGRATION_TESTED", label: "Connection tested" },
];

export function auditActionLabel(code: string): string {
  return AUDIT_ACTIONS.find((a) => a.code === code)?.label ?? readable(code);
}

/** An action nobody has named yet still reads as words, not as a code: CLIENT_MESSAGE_SEEN becomes "Client message seen". */
function readable(code: string): string {
  const words = code.toLowerCase().replaceAll("_", " ");
  return words.replace(/^./, (c) => c.toUpperCase());
}
