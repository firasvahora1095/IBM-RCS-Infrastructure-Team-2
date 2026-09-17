import type { ReactNode } from "react";

interface PublicPageProps {
  /** Card width from the Figma frame: 720px for Upload/Confirmation, 640px for Status. */
  cardWidth: 640 | 720;
  children: ReactNode;
}

/**
 * The shared body layout of every Normal User screen (Figma nodes 5:6, 6:6,
 * 7:19): a Gray 10 page background with one centred white content card
 * (40px padding, 8px radius, soft shadow).
 *
 * Carbon's UI Shell Header is `position: fixed` and 48px tall, so the body
 * starts with 48px + the design's 40px top padding — without this offset
 * the page heading would sit underneath the header.
 */
export function PublicPage({ cardWidth, children }: PublicPageProps) {
  return (
    <main
      className="flex justify-center px-4 pb-10"
      style={{ backgroundColor: "var(--cds-layer-01)", minHeight: "100vh", paddingTop: 88 }}
    >
      <div
        className="flex w-full flex-col gap-6 p-6 sm:p-10"
        style={{
          maxWidth: cardWidth,
          backgroundColor: "var(--cds-background)",
          borderRadius: 8,
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)",
        }}
      >
        {children}
      </div>
    </main>
  );
}
