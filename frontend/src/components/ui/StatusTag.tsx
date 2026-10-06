import { Tag } from "@carbon/react";
import type { DeliveryStatus, ReportStatus } from "../../services/types";
import { DELIVERY_STATUS_LABEL, MODERATION_COMPLETE_LABEL } from "../../design-tokens/deliveryLabels";
import { REPORT_STATUS_LABEL } from "../../design-tokens/reportLabels";

type StatusTagProps =
  | { kind: "delivery"; value: DeliveryStatus }
  | { kind: "report"; value: ReportStatus }
  | { kind: "moderation"; value: "COMPLETE" };

/** Tags never stretch inside flex columns. */
const TAG_STYLE = { margin: 0, alignSelf: "flex-start" } as const;

/**
 * Status tags for the B2B screens, in the same visual language as the
 * existing Manager tags (ExposureStateTag, SOS badge): text-only Carbon Tags,
 * gray for routine states, red only for something that needs the Manager.
 * The status is always written out, so it never relies on colour alone
 * (UR-NFR-01).
 */
export function StatusTag(props: StatusTagProps) {
  if (props.kind === "delivery") {
    return (
      <Tag type={props.value === "NEEDS_ATTENTION" ? "red" : "gray"} size="md" style={TAG_STYLE}>
        {DELIVERY_STATUS_LABEL[props.value]}
      </Tag>
    );
  }
  if (props.kind === "report") {
    return (
      <Tag type="gray" size="md" style={TAG_STYLE}>
        {REPORT_STATUS_LABEL[props.value]}
      </Tag>
    );
  }
  return (
    <Tag type="gray" size="md" style={TAG_STYLE}>
      {MODERATION_COMPLETE_LABEL}
    </Tag>
  );
}
