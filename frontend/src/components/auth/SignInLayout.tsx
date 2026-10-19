import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Theme } from "@carbon/react";
import { RcsLogo } from "../brand/RcsMark";

/**
 * The sign-in screen for both doors into RCS (staff and Client). A branded panel on the left says who the door is
 * for, in the product site's logo and wash; the form sits on white on the right, IBM sign-in style. Below the lg
 * breakpoint the panel collapses to the logo above the form, so a phone gets straight to the fields.
 */
export function SignInLayout({
  audience,
  statement,
  points,
  children,
}: {
  audience: string;
  statement: string;
  points: string[];
  children: ReactNode;
}) {
  return (
    <div className="si-page">
      <Theme theme="g100" className="si-brand">
        <div className="si-brand-wash" aria-hidden="true" />
        <RouterLink to="/rcs" className="si-brand-logo" aria-label="Responsible Content Safety (RCS) home">
          <RcsLogo size={40} variant="onDark" />
        </RouterLink>
        <div className="si-brand-copy">
          <p className="si-brand-audience">{audience}</p>
          <p className="si-brand-statement">{statement}</p>
          <ul className="si-brand-points">
            {points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <p className="si-brand-foot">An IBM × RMIT capstone prototype by RMIT Team 6. Synthetic data only.</p>
      </Theme>
      <main className="si-main">
        <RouterLink to="/rcs" className="si-mobile-logo" aria-label="Responsible Content Safety (RCS) home">
          <RcsLogo size={32} />
        </RouterLink>
        <div className="si-form-wrap">{children}</div>
      </main>
    </div>
  );
}
