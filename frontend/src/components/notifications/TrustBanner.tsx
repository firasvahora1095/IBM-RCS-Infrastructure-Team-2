import { useRef, useState } from "react";
import { InformationFilled } from "@carbon/icons-react";
import { PolicyDialog, type PolicyKind } from "./PolicyDialog";

/**
 * The "Trust Banner (UR-NFR-02)" at the top of the Upload screen (Figma
 * node 110:84): Blue 10 fill, 4px Blue 60 left border, info icon, title,
 * body and two policy links.
 *
 * Not a Carbon InlineNotification: that component is a live status region
 * and Carbon forbids interactive children inside it (the two policy links
 * would make screen readers announce a "notification" that is really
 * static page content). A labelled <section> keeps the same look while
 * being announced as what it is.
 */
export function TrustBanner({
  heading = "Your report is reviewed carefully and confidentially",
  body = "We check every report against our content policy before taking action.",
}: {
  heading?: string;
  body?: string;
}) {
  const [open, setOpen] = useState<PolicyKind | null>(null);
  const policyRef = useRef<HTMLButtonElement>(null);
  const privacyRef = useRef<HTMLButtonElement>(null);
  return (
    <section
      aria-labelledby="trust-banner-title"
      className="flex gap-3.5 p-4"
      style={{
        backgroundColor: "var(--cds-notification-background-info)",
        borderLeft: "4px solid var(--cds-border-interactive)",
      }}
    >
      <InformationFilled
        size={20}
        style={{ fill: "var(--cds-icon-interactive)", flexShrink: 0, marginTop: 2 }}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-1.5">
        <h2 id="trust-banner-title" style={{ fontSize: 16, fontWeight: 600, color: "var(--cds-text-primary)" }}>
          {heading}
        </h2>
        <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>{body}</p>
        <div className="flex flex-wrap gap-4">
          {/* Real controls, not dead anchors: each opens its document over the form, and focus returns here. */}
          <button ref={policyRef} type="button" className="cds--link rcs-link-button" onClick={() => setOpen("policy")}>
            View content policy
          </button>
          <button
            ref={privacyRef}
            type="button"
            className="cds--link rcs-link-button"
            onClick={() => setOpen("privacy")}
          >
            View privacy notice
          </button>
        </div>
      </div>
      {open && (
        <PolicyDialog
          kind={open}
          onClose={() => setOpen(null)}
          launcherRef={open === "policy" ? policyRef : privacyRef}
        />
      )}
    </section>
  );
}
