import type { ReactNode } from "react";

interface StaffPageProps {
  children: ReactNode;
  /** Centres a narrow column (e.g. the Auditor Submission Confirmation). */
  maxWidth?: number;
}

/**
 * The body layout of the Auditor and Manager screens: white background,
 * 48px side padding and 32px top padding (Figma "Body" frames, e.g. 10:18).
 * The extra 48px at the top clears Carbon's fixed-position header.
 */
export function StaffPage({ children, maxWidth }: StaffPageProps) {
  return (
    <main className="px-6 pb-12 sm:px-12" style={{ paddingTop: 48 + 32, minHeight: "100vh" }}>
      <div
        className="flex flex-col gap-6"
        style={maxWidth ? { maxWidth, marginInline: "auto" } : undefined}
      >
        {children}
      </div>
    </main>
  );
}
