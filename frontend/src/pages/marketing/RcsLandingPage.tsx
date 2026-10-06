import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Column, Grid, Theme } from "@carbon/react";
import { MarketingHeader } from "../../components/shell/MarketingHeader";
import { RESPONSIBILITY_BOUNDARY } from "../../design-tokens/deliveryLabels";

/** One numbered step or feature, in the same white bordered panel as the rest of the app. */
function Feature({ number, title, children }: { number?: string; title: string; children: ReactNode }) {
  return (
    <div className="rcs-section" style={{ blockSize: "100%" }}>
      {number && (
        <span className="rcs-mono" style={{ fontSize: 14, color: "var(--cds-text-secondary)" }}>
          {number}
        </span>
      )}
      <h3 className="rcs-section-title">{title}</h3>
      <p className="rcs-body" style={{ color: "var(--cds-text-secondary)" }}>
        {children}
      </p>
    </div>
  );
}

function SectionHeading({ id, eyebrow, title, lede }: { id: string; eyebrow: string; title: string; lede: string }) {
  return (
    <div className="flex flex-col gap-3" style={{ maxInlineSize: 720 }}>
      <p className="rcs-eyebrow">{eyebrow}</p>
      <h2 id={id} style={{ fontSize: "2rem", lineHeight: "2.5rem", fontWeight: 400 }}>
        {title}
      </h2>
      <p className="rcs-body" style={{ color: "var(--cds-text-secondary)", fontSize: 16, lineHeight: "24px" }}>
        {lede}
      </p>
    </div>
  );
}

const sectionStyle = { paddingBlock: "4rem" } as const;

/**
 * RCS product landing page (B2B flow stage 1, "CommunityHub chooses RCS").
 * Kept to what a platform needs to decide, per the scope fence: what RCS
 * does, how reviewer wellbeing is built in, what the platform gets back, and
 * who decides enforcement. No pricing, billing or contracts (B2B flow §17).
 * Carbon expressive type for the hero only; everything else uses the same
 * panels and type scale as the product.
 */
export function RcsLandingPage() {
  const navigate = useNavigate();

  return (
    <>
      <MarketingHeader />
      <main style={{ paddingTop: 48, backgroundColor: "var(--cds-background)" }}>
        <Theme theme="g100">
          <section aria-labelledby="hero-title" style={{ backgroundColor: "var(--cds-background)", paddingBlock: "5rem 4rem" }}>
            <Grid>
              <Column sm={4} md={8} lg={10} className="flex flex-col gap-6">
                <p className="rcs-eyebrow">IBM × RMIT · Responsible Content Safety</p>
                <h1 id="hero-title" className="rcs-hero-title" style={{ maxInlineSize: "20ch" }}>
                  Content moderation that protects the people who do it.
                </h1>
                <p className="rcs-hero-lede">
                  RCS reviews harmful video reported on your platform. AI pre-screens every report, trained human
                  reviewers make every decision under built-in wellbeing protections, and the result comes straight
                  back to you.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button onClick={() => navigate("/rcs/get-started")}>Bring RCS to your platform</Button>
                  <Button kind="tertiary" href="#how-it-works">
                    See how it works
                  </Button>
                </div>
              </Column>
              <Column sm={4} md={8} lg={6} className="flex flex-col justify-end">
                <dl className="flex flex-col" aria-label="RCS at a glance" style={{ marginBlockStart: "2rem" }}>
                  {[
                    ["Every decision", "made by a trained human reviewer"],
                    ["120 min", "daily exposure limit per reviewer, by default"],
                    ["Automatic", "result delivery to your platform"],
                  ].map(([value, label]) => (
                    <div
                      key={value}
                      className="flex flex-col gap-1"
                      style={{ paddingBlock: "1rem", borderBlockStart: "1px solid var(--cds-border-subtle-01)" }}
                    >
                      <dt className="rcs-mono" style={{ fontSize: 24, lineHeight: "32px" }}>
                        {value}
                      </dt>
                      <dd style={{ fontSize: 14, color: "var(--cds-text-secondary)" }}>{label}</dd>
                    </div>
                  ))}
                </dl>
              </Column>
            </Grid>
          </section>
        </Theme>

        <section aria-labelledby="how-it-works" style={sectionStyle}>
          <Grid>
            <Column sm={4} md={8} lg={16}>
              <SectionHeading
                id="how-it-works"
                eyebrow="How it works"
                title="From a report on your platform to a decision you can act on"
                lede="Your users report harmful video with your own report button. RCS handles review end to end and sends you a structured result for every case."
              />
            </Column>
            <Column sm={4} md={4} lg={4} className="mt-8">
              <Feature number="01" title="Your users report">
                Your report button opens RCS. People upload the video, can stay anonymous, and get a case ID to check
                progress.
              </Feature>
            </Column>
            <Column sm={4} md={4} lg={4} className="mt-8">
              <Feature number="02" title="AI pre-screens">
                Each video is analysed first: a severity rating, a safe written summary and a timeline of flagged
                moments, before any person sees it.
              </Feature>
            </Column>
            <Column sm={4} md={4} lg={4} className="mt-8">
              <Feature number="03" title="A person decides">
                A trained reviewer makes the final call, with blur, warnings and exposure limits. The AI never makes
                the decision.
              </Feature>
            </Column>
            <Column sm={4} md={4} lg={4} className="mt-8">
              <Feature number="04" title="You get the result">
                The outcome and final severity arrive at your endpoint automatically. Your team decides what action to
                take on your platform.
              </Feature>
            </Column>
          </Grid>
        </section>

        <section
          aria-labelledby="wellbeing"
          style={{ ...sectionStyle, backgroundColor: "var(--cds-layer-01)" }}
        >
          <Grid>
            <Column sm={4} md={8} lg={16}>
              <SectionHeading
                id="wellbeing"
                eyebrow="Reviewer wellbeing"
                title="Protection is built into the workflow, not left to willpower"
                lede="Wellbeing always comes before moderation speed. These protections are enforced by the system for every reviewer."
              />
            </Column>
            <Column sm={4} md={4} lg={5} className="mt-8">
              <Feature title="Exposure limits">
                Time spent viewing harmful footage is measured. At the daily limit, no more cases are assigned that
                day.
              </Feature>
            </Column>
            <Column sm={4} md={4} lg={5} className="mt-8">
              <Feature title="Warnings, blur and the right to decline">
                Reviewers see what was flagged before choosing to proceed. Footage starts blurred, and declining is
                always an option.
              </Feature>
            </Column>
            <Column sm={4} md={8} lg={6} className="mt-8">
              <Feature title="Cooldowns, support and SOS">
                Cooldowns follow high-severity cases. Reviewers can ask for support at any time, or press SOS to stop
                immediately and alert their manager.
              </Feature>
            </Column>
          </Grid>
        </section>

        <section aria-labelledby="platforms" style={sectionStyle}>
          <Grid>
            <Column sm={4} md={8} lg={16}>
              <SectionHeading
                id="platforms"
                eyebrow="For platforms"
                title="What your organisation gets"
                lede="A light integration: a report button for your users, a results endpoint for your systems, and service reports for your team."
              />
            </Column>
            <Column sm={4} md={4} lg={5} className="mt-8">
              <Feature title="A report button">
                Add RCS reporting to your posts with a link or a small snippet. The post link travels with the report.
              </Feature>
            </Column>
            <Column sm={4} md={4} lg={5} className="mt-8">
              <Feature title="Automatic result delivery">
                Structured, factual results for every completed case, retried automatically and never sent twice.
              </Feature>
            </Column>
            <Column sm={4} md={8} lg={6} className="mt-8">
              <Feature title="Service reports">
                Period reports on volumes, outcomes, timeliness and delivery, reviewed and released by an RCS manager.
              </Feature>
            </Column>
            <Column sm={4} md={8} lg={16} className="mt-8">
              <div className="rcs-section">
                <h3 className="rcs-section-title">Who decides what</h3>
                <p className="rcs-body">{RESPONSIBILITY_BOUNDARY}</p>
              </div>
            </Column>
          </Grid>
        </section>

        <Theme theme="g100">
          <section
            aria-labelledby="cta-title"
            style={{ backgroundColor: "var(--cds-background)", paddingBlock: "4rem" }}
          >
            <Grid>
              <Column sm={4} md={6} lg={10} className="flex flex-col gap-4">
                <h2 id="cta-title" style={{ fontSize: "2rem", lineHeight: "2.5rem", fontWeight: 400 }}>
                  Bring RCS to your platform
                </h2>
                <p className="rcs-hero-lede">
                  Set up your organisation, connect where results should go and add the report button. It takes a few
                  minutes.
                </p>
              </Column>
              <Column sm={4} md={2} lg={6} className="flex items-end justify-start lg:justify-end">
                <Button onClick={() => navigate("/rcs/get-started")}>Get started</Button>
              </Column>
            </Grid>
          </section>
        </Theme>

        <footer style={{ paddingBlock: "2rem" }}>
          <Grid>
            <Column sm={4} md={8} lg={16} className="flex flex-wrap items-center justify-between gap-4">
              <p className="rcs-helper">
                RMIT capstone prototype for IBM. Synthetic demo data only; no real organisations, people or footage.
              </p>
              <a className="cds--link" href="/flow">
                Demo flow guide
              </a>
            </Column>
          </Grid>
        </footer>
      </main>
    </>
  );
}
