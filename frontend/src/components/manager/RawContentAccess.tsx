import { Link as RouterLink } from "react-router-dom";
import { Button } from "@carbon/react";
import { Warning } from "@carbon/icons-react";

/**
 * The one way to ask for raw content (MR-CR-08), used on every Manager screen that offers it so it always looks
 * and reads the same: a short reason it is exceptional, then a button with a warning icon. It is a button, not a
 * link, because it starts a gated step (content warning, then access that is recorded).
 */
export function RawContentAccess({ caseId, returnTo }: { caseId: string; returnTo: string }) {
  return (
    <section className="rcs-section" aria-labelledby={`raw-access-${caseId}`}>
      <h2 id={`raw-access-${caseId}`} className="rcs-section-title">
        Exceptional access
      </h2>
      <p className="rcs-helper">
        Only when the summary is not enough to decide. You get the same content warning as an Auditor, and the access is
        recorded.
      </p>
      <div>
        <Button
          kind="tertiary"
          size="sm"
          renderIcon={Warning}
          as={RouterLink}
          to={`/manager/cases/${encodeURIComponent(caseId)}/raw?from=${encodeURIComponent(returnTo)}`}
        >
          View raw content
        </Button>
      </div>
    </section>
  );
}
