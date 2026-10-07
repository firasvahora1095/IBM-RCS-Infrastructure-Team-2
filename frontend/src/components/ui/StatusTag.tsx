import type { CSSProperties, ReactNode } from "react";
import { Tag } from "@carbon/react";
import type { DeliveryStatus, ReportStatus } from "../../services/types";
import { DELIVERY_STATUS_LABEL, MODERATION_COMPLETE_LABEL } from "../../design-tokens/deliveryLabels";
import { REPORT_STATUS_LABEL } from "../../design-tokens/reportLabels";
import { DELIVERY_TONE, REPORT_TONE, type StatusTone } from "../../design-tokens/statusTones";

/** Tags never stretch inside flex columns. */
const BASE: CSSProperties = { margin: 0, alignSelf: "flex-start", whiteSpace: "nowrap", fontWeight: 600 };

/**
 * Figma foundation Tag fills (Info, Success, Warning, Error, and the S1 gray),
 * on Carbon's Tag with the Carbon status tokens, as SeverityTag does. One
 * deliberate deviation: Success uses dark text, because white on the success
 * green is 3.3:1 and fails WCAG AA for tag-size text (dark text is 5.4:1).
 */
const TONE: Record<StatusTone, CSSProperties> = {
  success: { backgroundColor: "var(--cds-support-success)", color: "var(--cds-text-primary)" },
  info: { backgroundColor: "var(--cds-support-info)", color: "var(--cds-text-on-color)" },
  warning: { backgroundColor: "var(--cds-support-warning)", color: "var(--cds-text-primary)" },
  error: { backgroundColor: "var(--cds-support-error)", color: "var(--cds-text-on-color)" },
  neutral: { backgroundColor: "var(--cds-tag-background-gray)", color: "var(--cds-text-primary)" },
};

type StatusTagProps = { size?: "sm" | "md" } & (
  | { kind: "delivery"; value: DeliveryStatus }
  | { kind: "report"; value: ReportStatus }
  | { kind: "moderation"; value: "COMPLETE" }
  | { tone: StatusTone; children: ReactNode }
);

/**
 * The single status tag for every screen: a Carbon Tag coloured by
 * design-tokens/statusTones.ts, with the status always written out.
 */
export function StatusTag(props: StatusTagProps) {
  let tone: StatusTone;
  let label: ReactNode;
  if ("tone" in props) {
    tone = props.tone;
    label = props.children;
  } else if (props.kind === "delivery") {
    tone = DELIVERY_TONE[props.value];
    label = DELIVERY_STATUS_LABEL[props.value];
  } else if (props.kind === "report") {
    tone = REPORT_TONE[props.value];
    label = REPORT_STATUS_LABEL[props.value];
  } else {
    tone = "neutral";
    label = MODERATION_COMPLETE_LABEL;
  }
  return (
    <Tag type="gray" size={props.size ?? "md"} style={{ ...BASE, ...TONE[tone] }}>
      {label}
    </Tag>
  );
}
