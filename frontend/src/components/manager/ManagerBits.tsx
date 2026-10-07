import type { ReactNode } from "react";
import { Breadcrumb, BreadcrumbItem, InlineNotification, SkeletonText } from "@carbon/react";
import { Link as RouterLink } from "react-router-dom";
import type { ExposureState } from "../../services/types";
import { EXPOSURE_STATE_LABEL } from "../../design-tokens/managerLabels";
import { mono } from "./managerStyles";
import { StatusTag } from "../ui/StatusTag";
import { EXPOSURE_TONE } from "../../design-tokens/statusTones";

/** Exposure state tag (MR-OV-05), coloured by the shared status scheme (design-tokens/statusTones.ts). */
export function ExposureStateTag({ state }: { state: ExposureState }) {
  return <StatusTag tone={EXPOSURE_TONE[state]}>{EXPOSURE_STATE_LABEL[state]}</StatusTag>;
}

/** A bordered white panel, as the Manager Figma cards (e.g. 86:109). */
export function Panel({ children, title, maxWidth }: { children: ReactNode; title?: string; maxWidth?: number }) {
  return (
    <section
      className="flex flex-col gap-3 px-6 py-5"
      style={{ border: "1px solid var(--cds-border-subtle-01)", maxWidth }}
      aria-label={title}
    >
      {title && <h2 style={{ fontSize: 16, lineHeight: "22px", fontWeight: 600 }}>{title}</h2>}
      {children}
    </section>
  );
}

/** A label-over-value figure, e.g. "Today's exposure / 94 / 120 min". */
export function Figure({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{label}</dt>
      <dd style={{ ...mono, fontSize: 20, lineHeight: "28px" }}>{value}</dd>
    </div>
  );
}

export function ManagerBreadcrumb({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <Breadcrumb noTrailingSlash>
      {trail.map((item) =>
        item.to ? (
          <BreadcrumbItem key={item.label}>
            <RouterLink to={item.to}>{item.label}</RouterLink>
          </BreadcrumbItem>
        ) : (
          <BreadcrumbItem key={item.label} isCurrentPage>
            {item.label}
          </BreadcrumbItem>
        ),
      )}
    </Breadcrumb>
  );
}

/** Loading and error states shared by every Manager page. Returns null once data is ready. */
export function LoadState({ error, loading, what }: { error: string | null; loading: boolean; what: string }) {
  if (error) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        role="alert"
        title={`Couldn't load ${what}.`}
        subtitle={error}
        style={{ maxWidth: "100%" }}
      />
    );
  }
  if (loading) return <SkeletonText paragraph lineCount={4} />;
  return null;
}
