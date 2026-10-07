import { Link as RouterLink } from "react-router-dom";
import { CheckmarkOutline, ChevronRight, ErrorFilled, WarningAltFilled } from "@carbon/icons-react";
import type { AttentionKind } from "../../services/types";
import { ATTENTION, ATTENTION_ORDER } from "../../design-tokens/intelligenceLabels";
import { StatusTag } from "../ui/StatusTag";

interface AttentionListProps {
  items: { kind: AttentionKind; count: number }[];
  /** Overrides a row's destination, e.g. the first Auditor with a break request. */
  targets?: Partial<Record<AttentionKind, string>>;
}

/**
 * Needs Attention (Sprint 3 extras §1.2 widget 1): only items that need a
 * Manager decision. Every row stays visible at zero ("All clear"), so the
 * Manager can see what RCS is watching. Rows that need action carry the SOS
 * Inbox's 3px error accent, an icon and a written status, never colour alone.
 */
export function AttentionList({ items, targets = {} }: AttentionListProps) {
  const counts = new Map(items.map((item) => [item.kind, item.count]));
  return (
    <ul className="rcs-attention" aria-label="Items that need you">
      {ATTENTION_ORDER.map((kind) => {
        const wording = ATTENTION[kind];
        const count = counts.get(kind) ?? 0;
        const urgent = count > 0;
        const Icon = !urgent ? CheckmarkOutline : wording.tone === "error" ? ErrorFilled : WarningAltFilled;
        const to = targets[kind] ?? wording.to;
        return (
          <li key={kind}>
            <RouterLink
              to={to}
              className="rcs-attention-row"
              data-urgent={urgent ? wording.tone : undefined}
              aria-label={`${wording.label}: ${count}. ${urgent ? wording.status : "All clear"}.`}
            >
              <Icon aria-hidden="true" className="rcs-attention-icon" size={16} />
              <span className="rcs-attention-label">{wording.label}</span>
              <span className="rcs-attention-status">
                {urgent ? (
                  <StatusTag tone={wording.tone} size="sm">
                    {wording.status}
                  </StatusTag>
                ) : (
                  <span className="rcs-helper">All clear</span>
                )}
              </span>
              <span className="rcs-attention-count">{count}</span>
              <ChevronRight aria-hidden="true" className="rcs-attention-chevron" />
            </RouterLink>
          </li>
        );
      })}
    </ul>
  );
}
