import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  /** Small label above the title, e.g. "Customer organisation". */
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  /** A Carbon Breadcrumb, shown above everything else. */
  breadcrumb?: ReactNode;
  /** Right-aligned actions; put the one primary action last. */
  actions?: ReactNode;
  /** Status tag or meta line shown beside the title. */
  meta?: ReactNode;
}

/**
 * The page header used across the B2B screens: breadcrumb, eyebrow, a
 * heading-05 title (Carbon productive type), a secondary subtitle and a
 * right-aligned action group that wraps under the title on narrow screens.
 */
export function PageHeader({ title, eyebrow, subtitle, breadcrumb, actions, meta }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      {breadcrumb}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow && <p className="rcs-eyebrow">{eyebrow}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="rcs-page-title">{title}</h1>
            {meta}
          </div>
          {subtitle && <p className="rcs-page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}
