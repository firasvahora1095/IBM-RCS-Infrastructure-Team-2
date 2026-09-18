import type { ReactNode } from "react";

interface StaffPageProps {
  children: ReactNode;
  /** Centres a narrow column (e.g. the Auditor Submission Confirmation). */
  maxWidth?: number;
  /**
   * Whether this body sits directly under Carbon's fixed 48px header and so
   * must clear it. False when something in normal flow (the Manager TopNav)
   * already sits between the header and the body.
   */
  clearHeader?: boolean;
}

/**
 * The body layout of the Auditor and Manager screens: white background,
 * 48px side padding and 32px top padding (Figma "Body" frames, e.g. 10:18).
 */
export function StaffPage({ children, maxWidth, clearHeader = true }: StaffPageProps) {
  return (
    <main
      className="px-4 pb-12 sm:px-8 lg:px-12"
      style={{ paddingTop: (clearHeader ? 48 : 0) + 32, minHeight: "100vh" }}
    >
      {/* Capped at Carbon's max grid width and centred, so wide monitors don't stretch tables and text edge to edge. */}
      <div className="flex min-w-0 flex-col gap-6" style={{ maxWidth: maxWidth ?? 1584, marginInline: "auto" }}>
        {children}
      </div>
    </main>
  );
}
