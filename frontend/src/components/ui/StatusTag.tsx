import type { ComponentType, CSSProperties, ReactNode } from "react";
import { CheckmarkFilled, ErrorFilled, InProgress, WarningAltFilled } from "@carbon/icons-react";
import { Tag } from "@carbon/react";
import type { DeliveryStatus, ReportStatus } from "../../services/types";
import { DELIVERY_STATUS_LABEL, MODERATION_COMPLETE_LABEL } from "../../design-tokens/deliveryLabels";
import { REPORT_STATUS_LABEL } from "../../design-tokens/reportLabels";
import { DELIVERY_TONE, REPORT_TONE, type StatusTone } from "../../design-tokens/statusTones";

/** Tags never stretch inside flex columns. */
const BASE: CSSProperties = { margin: 0, alignSelf: "flex-start", whiteSpace: "nowrap", fontWeight: 600 };

/**
 * Tag fills come from the RCS tag palette (index.scss, docs/ux/tag-colour-system.md), every value a Carbon palette
 * colour. Only the two outcomes that must stand out are solid (critical red, done green); the rest are light tints,
 * so a screen of tags stays calm and the solid ones are found at once.
 */
const TONE: Record<StatusTone, CSSProperties> = {
  error: { backgroundColor: "var(--rcs-tag-error-bg)", color: "var(--rcs-tag-error-fg)" },
  warning: { backgroundColor: "var(--rcs-tag-warning-bg)", color: "var(--rcs-tag-warning-fg)" },
  info: { backgroundColor: "var(--rcs-tag-info-bg)", color: "var(--rcs-tag-info-fg)" },
  success: { backgroundColor: "var(--rcs-tag-success-bg)", color: "var(--rcs-tag-success-fg)" },
  request: { backgroundColor: "var(--rcs-tag-request-bg)", color: "var(--rcs-tag-request-fg)" },
  neutral: { backgroundColor: "var(--rcs-tag-neutral-bg)", color: "var(--rcs-tag-neutral-fg)" },
};

/** A small icon per state, so the meaning does not rest on colour (UR-NFR-01). Neutral and request have none. */
const TONE_ICON: Partial<Record<StatusTone, ComponentType<{ size?: number }>>> = {
  error: ErrorFilled,
  warning: WarningAltFilled,
  info: InProgress,
  success: CheckmarkFilled,
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
    <Tag
      type="gray"
      size={props.size ?? "md"}
      className="rcs-status-tag"
      renderIcon={TONE_ICON[tone]}
      style={{ ...BASE, ...TONE[tone] }}
    >
      {label}
    </Tag>
  );
}
