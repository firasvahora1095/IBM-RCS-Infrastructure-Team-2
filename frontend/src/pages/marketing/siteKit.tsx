import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Column, Grid, Theme } from "@carbon/react";
import { RcsLogo } from "../../components/brand/RcsMark";

/**
 * The one section template every product-site section uses: a header block (eyebrow, H2, optional lede) on lg 10 of
 * 16 columns, then the content on the full 16 columns, starting on the same left edge, after the same gap
 * (spacing-09). Inside the content, layouts are CSS grids, never nested Carbon columns, so nothing drifts off the edge.
 */
export function Section({
  id,
  eyebrow,
  title,
  lede,
  tint = false,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lede?: ReactNode;
  tint?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`lp-section${tint ? " lp-section--tint" : ""}`} aria-labelledby={`${id}-title`}>
      <Grid>
        <Column sm={4} md={8} lg={10} className="lp-section-head">
          <p className="lp-eyebrow">{eyebrow}</p>
          <h2 id={`${id}-title`} className="lp-h2">
            {title}
          </h2>
          {lede && <p className="lp-lede">{lede}</p>}
        </Column>
        <Column sm={4} md={8} lg={16} className="lp-section-body">
          {children}
        </Column>
      </Grid>
    </section>
  );
}

const FOOTER = [
  {
    title: "Product",
    links: [
      ["How it works", "/rcs#how-it-works"],
      ["Product tour", "/rcs#product"],
      ["Features", "/rcs#features"],
      ["Integration", "/rcs#integration"],
      ["Security", "/rcs#security"],
    ],
  },
  {
    title: "Get started",
    links: [
      ["Set up your organisation", "/rcs/get-started"],
      ["Client sign in", "/client/login"],
      ["Staff sign in", "/staff/login"],
      ["Demo guide", "/flow"],
    ],
  },
  {
    title: "For the public",
    links: [
      ["Report content", "/report"],
      ["Check a case status", "/report/status"],
      ["Contact us", "/report/contact"],
    ],
  },
  {
    title: "About",
    links: [
      ["The team", "/rcs/team"],
      ["About this prototype", "/rcs#prototype"],
      ["CommunityHub (simulated)", "/communityhub"],
      ["FAQ", "/rcs#faq"],
    ],
  },
] as const;

/** One dark close for every product-site page: a call to action, then the full footer, in one g100 block. */
export function SiteClose({ title, lede, actions }: { title: string; lede: string; actions: ReactNode }) {
  return (
    <Theme theme="g100" className="lp-close">
      <div className="lp-close-rule" aria-hidden="true" />
      <section className="lp-cta" aria-labelledby="cta-title">
        <Grid>
          <Column sm={4} md={5} lg={10} className="lp-section-head">
            <h2 id="cta-title" className="lp-h2">
              {title}
            </h2>
            <p className="lp-lede">{lede}</p>
          </Column>
          <Column sm={4} md={3} lg={6} className="lp-cta-actions">
            {actions}
          </Column>
        </Grid>
      </section>

      <footer className="lp-footer">
        <Grid>
          <Column sm={4} md={8} lg={4} className="lp-footer-brand">
            <RcsLogo size={36} variant="onDark" tagline />
            <p>Safer content. Healthier people. Stronger communities.</p>
          </Column>
          {FOOTER.map((col) => (
            <Column key={col.title} sm={2} md={2} lg={3} className="lp-footer-col">
              <h2 className="lp-footer-heading">{col.title}</h2>
              <ul>
                {col.links.map(([label, to]) => (
                  <li key={label}>
                    <RouterLink className="cds--link" to={to}>
                      {label}
                    </RouterLink>
                  </li>
                ))}
              </ul>
            </Column>
          ))}
          <Column sm={4} md={8} lg={16} className="lp-footer-legal">
            <p>
              Responsible Content Safety (RCS) is an IBM × RMIT capstone prototype built by RMIT Team 6. CommunityHub is
              simulated. Synthetic data only: no real organisations, people or footage.
            </p>
            <p>© 2026 RMIT Team 6</p>
          </Column>
        </Grid>
      </footer>
    </Theme>
  );
}
