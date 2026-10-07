import type { ReactNode } from "react";

/** A titled content block on a Carbon layer-01 tile, the B2B screens' card. */
export function Section({
  title,
  description,
  actions,
  children,
  id,
  as = "section",
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  id?: string;
  as?: "section" | "div";
}) {
  const Tag = as;
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <Tag className="rcs-section" aria-labelledby={title ? headingId : undefined}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            {title && (
              <h2 id={headingId} className="rcs-section-title">
                {title}
              </h2>
            )}
            {description && <p className="rcs-helper">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </Tag>
  );
}

/** Labelled facts with definition-list semantics (Carbon StructuredList look, `dl` underneath). */
export function KeyValueList({ items, mono = [] }: { items: { label: string; value: ReactNode }[]; mono?: string[] }) {
  return (
    <dl className="rcs-kv">
      {items.map((item) => (
        <div key={item.label} className="rcs-kv-row">
          <dt>{item.label}</dt>
          <dd className={mono.includes(item.label) ? "rcs-mono" : undefined}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface TimelineItem {
  title: ReactNode;
  time?: ReactNode;
  detail?: ReactNode;
  tone?: "success" | "error" | "neutral" | "info";
}

/** A vertical event timeline (delivery attempts, report history). */
export function TimelineList({ items, label }: { items: TimelineItem[]; label: string }) {
  return (
    <ol className="rcs-timeline" aria-label={label}>
      {items.map((item, i) => {
        return (
          <li key={i} className={`rcs-timeline-item rcs-timeline-${item.tone ?? "neutral"}`}>
            <span className="rcs-timeline-dot" aria-hidden="true" />
            <div className="flex flex-col gap-0.5">
              <span className="rcs-timeline-title">{item.title}</span>
              {item.time && <span className="rcs-helper rcs-mono">{item.time}</span>}
              {item.detail && <span className="rcs-helper">{item.detail}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** A designed empty / denied state: heading, one sentence, optional action. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rcs-empty">
      <h2 className="rcs-section-title">{title}</h2>
      {body && <p className="rcs-helper" style={{ maxWidth: 480 }}>{body}</p>}
      {action}
    </div>
  );
}
