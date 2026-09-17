import { Link } from "@carbon/react";
import { InformationFilled } from "@carbon/icons-react";

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
export function TrustBanner() {
  return (
    <section
      aria-labelledby="trust-banner-title"
      className="flex gap-3.5 p-4"
      style={{ backgroundColor: "#edf5ff", borderLeft: "4px solid #0f62fe", borderRadius: 8 }}
    >
      <InformationFilled size={20} style={{ fill: "#0f62fe", flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
      <div className="flex flex-col gap-1.5">
        <h2 id="trust-banner-title" style={{ fontSize: 16, fontWeight: 600, color: "#161616" }}>
          Your report is reviewed carefully and confidentially
        </h2>
        <p style={{ fontSize: 14, lineHeight: "20px", color: "#525252" }}>
          We check every report against our content policy before taking action.
        </p>
        <div className="flex flex-wrap gap-4">
          {/* Destinations aren't defined yet (no policy pages exist in this
              build) — anchors keep the approved design without inventing URLs. */}
          <Link href="#content-policy">View content policy</Link>
          <Link href="#privacy-notice">View privacy notice</Link>
        </div>
      </div>
    </section>
  );
}
