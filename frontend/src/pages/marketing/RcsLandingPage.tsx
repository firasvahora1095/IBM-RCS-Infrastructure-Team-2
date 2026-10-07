import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionItem,
  Button,
  CodeSnippet,
  Column,
  Grid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Theme,
} from "@carbon/react";
import { MarketingHeader } from "../../components/shell/MarketingHeader";
import { ExposureBar } from "../../components/exposure/ExposureBar";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { SegmentedBar } from "../../components/ui/Charts";
import { RESPONSIBILITY_BOUNDARY } from "../../design-tokens/deliveryLabels";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "how-it-works", label: "How it works" },
  { id: "wellbeing", label: "Reviewer wellbeing" },
  { id: "integration", label: "Integration" },
  { id: "reporting", label: "Reporting" },
  { id: "faq", label: "FAQ" },
] as const;

const REPORT_BUTTON = `<a href="https://report.rcs.example/communityhub?post={POST_URL}"
   class="report-button" rel="noopener">
  Report harmful content
</a>`;

const WEBHOOK = `POST https://api.your-platform.example/rcs-results
Content-Type: application/json
X-RCS-Signature: sha256=…

{
  "delivery_id": "DEL-RCS-7Q3M-K91X",
  "case_id": "RCS-7Q3M-K91X",
  "outcome": "POLICY_VIOLATION_FOUND",
  "final_severity": "S3",
  "completed_at": "2026-10-05T14:22:00+11:00",
  "source_url": "https://communityhub.example/post/4721"
}`;

/** Highlights the section currently in view in the sticky bar. */
function useActiveSection(): string {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  return active;
}

/**
 * A picture of the product, built from real Carbon parts: one case moving
 * from a CommunityHub report to a delivered result. Decorative: it's inert
 * and has a single text description for assistive technology.
 */
function CaseJourneyPreview() {
  const steps = [
    { title: "Reported from CommunityHub", meta: "09:12", detail: "Video upload · post link attached" },
    { title: "AI pre-screen complete", meta: "09:14", detail: <SeverityTag tier="S3" size="sm" /> },
    { title: "Decided by a trained reviewer", meta: "09:41", detail: "Policy violation found" },
    { title: "Result delivered to CommunityHub", meta: "09:41", detail: "200 OK · delivered once" },
  ];
  return (
    <Theme theme="white">
      <figure
        className="rcs-preview"
        inert
        role="img"
        aria-label="Example case RCS-7Q3M-K91X: reported from CommunityHub, AI pre-screened as S3 High, decided by a trained reviewer, and the result delivered to CommunityHub."
        style={{ margin: 0 }}
      >
        <div className="rcs-preview-bar">
          <span className="rcs-mono" style={{ fontSize: 14 }}>
            Case RCS-7Q3M-K91X
          </span>
          <Tag type="gray" size="sm" style={{ margin: 0 }}>
            CommunityHub
          </Tag>
        </div>
        <ol className="rcs-preview-steps">
          {steps.map((step, i) => (
            <li key={step.title}>
              <span className={`rcs-preview-dot${i === steps.length - 1 ? "" : ""}`} aria-hidden="true" />
              <span className="flex flex-col gap-1">
                <span style={{ fontSize: 14, fontWeight: 600 }}>{step.title}</span>
                <span style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{step.detail}</span>
              </span>
              <span className="rcs-mono" style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
                {step.meta}
              </span>
            </li>
          ))}
        </ol>
        <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
          29 minutes from report to delivered result. No footage or reviewer details leave RCS.
        </p>
      </figure>
    </Theme>
  );
}

function WorkspacePreview() {
  return (
    <figure
      className="rcs-preview"
      inert
      role="img"
      aria-label="Example reviewer screen: 62 of 120 minutes of today's exposure used, a content warning with the flag reason, and Request support and SOS options."
      style={{ margin: 0 }}
    >
      <div className="rcs-preview-bar">
        <span style={{ fontSize: 14, fontWeight: 600 }}>Reviewer workspace</span>
        <ExposureBar
          surface="light"
          width={150}
          minutes={62}
          limit={120}
          label="62 / 120 min today"
          ariaLabel="Example exposure"
        />
      </div>
      <div className="flex flex-col gap-2" style={{ padding: "1rem", backgroundColor: "var(--cds-background)" }}>
        <span style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>Content warning</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>This case was flagged for: graphic violence</span>
        <div className="flex flex-wrap items-center gap-2">
          <SeverityTag tier="S3" size="sm" />
          <Tag type="gray" size="sm" style={{ margin: 0 }}>
            weapon_present
          </Tag>
        </div>
        <span style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>Footage starts at maximum blur.</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" kind="secondary">
          Proceed
        </Button>
        <Button size="sm" kind="secondary">
          Decline
        </Button>
        <span style={{ flex: 1 }} />
        <Button size="sm" kind="ghost">
          Request support
        </Button>
        <Button size="sm" kind="danger">
          SOS
        </Button>
      </div>
    </figure>
  );
}

function ReportPreview() {
  return (
    <figure
      className="rcs-preview"
      inert
      role="img"
      aria-label="Example service report for August: 39 cases completed, 21 policy violations found, median 1 hour 34 minutes from report to decision."
      style={{ margin: 0 }}
    >
      <div className="rcs-preview-bar">
        <span style={{ fontSize: 14, fontWeight: 600 }}>Service report · August 2026</span>
        <Tag type="gray" size="sm" style={{ margin: 0 }}>
          Released
        </Tag>
      </div>
      <dl className="grid grid-cols-3 gap-4">
        {[
          ["Completed", "39"],
          ["Violations", "21"],
          ["Median time", "1 h 34 min"],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1">
            <dt style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{label}</dt>
            <dd className="rcs-mono" style={{ fontSize: 20 }}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <SegmentedBar
        label="Outcomes"
        segments={[
          { key: "v", label: "Violation", value: 21, color: "var(--cds-support-error)" },
          { key: "n", label: "No violation", value: 18, color: "var(--cds-support-success)" },
        ]}
      />
    </figure>
  );
}

/**
 * RCS product site (B2B flow stage 1, "CommunityHub chooses RCS"), built to
 * read like an IBM product page: a sticky section bar, a hero with a picture
 * of the product, how it works, feature sections with previews, integration
 * code, reporting, an FAQ and a full footer. No pricing, billing or contracts
 * (B2B flow §17 scope fence). Anchors land below the fixed header.
 */
export function RcsLandingPage() {
  const navigate = useNavigate();
  const active = useActiveSection();

  return (
    <div className="rcs-site">
      <MarketingHeader />
      <main style={{ paddingTop: 48, backgroundColor: "var(--cds-background)" }}>
        <nav className="rcs-subnav" aria-label="On this page">
          <div className="rcs-subnav-inner">
            <span className="rcs-subnav-name">RCS</span>
            <ul className="rcs-subnav-links">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <RouterLink to={`/rcs#${s.id}`} aria-current={active === s.id ? "true" : undefined}>
                    {s.label}
                  </RouterLink>
                </li>
              ))}
            </ul>
            <span style={{ flex: 1 }} />
            <Button size="sm" onClick={() => navigate("/rcs/get-started")}>
              Get started
            </Button>
          </div>
        </nav>

        <Theme theme="g100">
          <section
            id="overview"
            aria-labelledby="hero-title"
            style={{ backgroundColor: "var(--cds-background)", paddingBlock: "5rem" }}
          >
            <Grid>
              <Column sm={4} md={8} lg={8} className="flex flex-col gap-6">
                <p className="rcs-eyebrow">IBM Responsible Content Safety</p>
                <h1 id="hero-title" className="rcs-hero-title" style={{ maxInlineSize: "16ch" }}>
                  Content moderation that protects the people who do it.
                </h1>
                <p className="rcs-hero-lede">
                  Send harmful-video reports from your platform to RCS. AI pre-screens every report, trained reviewers
                  make every decision under built-in wellbeing protections, and the result comes straight back to you.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button onClick={() => navigate("/rcs/get-started")}>Bring RCS to your platform</Button>
                  <Button kind="tertiary" onClick={() => navigate("/rcs#how-it-works")}>
                    See how it works
                  </Button>
                </div>
                <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
                  No account needed for your users · Results to your own endpoint · You decide enforcement
                </p>
              </Column>
              <Column sm={4} md={8} lg={{ span: 7, offset: 9 }} className="mt-10 lg:mt-0 flex items-center">
                <div style={{ inlineSize: "100%" }}>
                  <CaseJourneyPreview />
                </div>
              </Column>
            </Grid>
          </section>
        </Theme>

        <section aria-label="Technology" style={{ paddingBlock: "2rem", borderBlockEnd: "1px solid var(--cds-border-subtle-01)" }}>
          <Grid>
            <Column sm={4} md={8} lg={16}>
              <dl className="rcs-builton">
                <dt>Built on IBM technology</dt>
                {["watsonx.ai", "Watson Speech to Text", "watsonx Orchestrate", "IBM Cloud Code Engine", "IBM Cloud Object Storage"].map(
                  (name) => (
                    <dd key={name}>{name}</dd>
                  ),
                )}
              </dl>
            </Column>
          </Grid>
        </section>

        <section id="how-it-works" className="rcs-site-section" aria-labelledby="how-title">
          <Grid>
            <Column sm={4} md={8} lg={10} className="flex flex-col gap-4">
              <p className="rcs-eyebrow">How it works</p>
              <h2 id="how-title" className="rcs-site-h2">
                From a report on your platform to a decision you can act on
              </h2>
              <p className="rcs-site-lede">
                Your users report harmful video with your own report button. RCS handles review end to end and sends you a
                structured result for every case.
              </p>
            </Column>
            <Column sm={4} md={8} lg={16} className="mt-12">
              <ol className="rcs-rail">
                {[
                  ["Your users report", "Your report button opens RCS with the post attached. People upload the video, can stay anonymous, and get a case ID."],
                  ["AI pre-screens", "Each video is analysed first: severity, a safe written summary and a timeline of flagged moments, before anyone sees it."],
                  ["A person decides", "A trained reviewer makes the final call, with warnings, blur and exposure limits. The AI never decides."],
                  ["You get the result", "The outcome and final severity arrive at your endpoint automatically. Your team decides what action to take."],
                ].map(([title, body], i) => (
                  <li key={title} className="rcs-rail-step">
                    <span className="rcs-rail-node" aria-hidden="true">
                      {i + 1}
                    </span>
                    <h3 className="rcs-rail-title">{title}</h3>
                    <p className="rcs-body" style={{ color: "var(--cds-text-secondary)" }}>
                      {body}
                    </p>
                  </li>
                ))}
              </ol>
            </Column>
          </Grid>
        </section>

        <section id="wellbeing" className="rcs-site-section" aria-labelledby="wellbeing-title" style={{ backgroundColor: "var(--cds-layer-01)" }}>
          <Grid>
            <Column sm={4} md={8} lg={7} className="flex flex-col gap-6">
              <p className="rcs-eyebrow">Reviewer wellbeing</p>
              <h2 id="wellbeing-title" className="rcs-site-h2">
                Protection is built into the workflow, not left to willpower
              </h2>
              <p className="rcs-site-lede">
                Wellbeing always comes before moderation speed. These protections are enforced by the system for every
                reviewer, on every case.
              </p>
              <ul className="rcs-site-list">
                <li>Viewing time is measured; at the daily limit, no more cases are assigned that day.</li>
                <li>Reviewers see what was flagged before choosing to proceed, and can always decline.</li>
                <li>Footage starts blurred; grayscale and mute are one click away.</li>
                <li>Cooldowns follow high-severity cases. Support is a request away; SOS stops everything.</li>
              </ul>
            </Column>
            <Column sm={4} md={8} lg={{ span: 8, offset: 8 }} className="mt-10 lg:mt-0">
              <WorkspacePreview />
            </Column>
          </Grid>
        </section>

        <section id="integration" className="rcs-site-section" aria-labelledby="integration-title">
          <Grid>
            <Column sm={4} md={8} lg={8} className="order-2 mt-10 lg:order-1 lg:mt-0">
              <div className="rcs-preview" style={{ padding: 0, boxShadow: "none" }}>
                <Tabs>
                  <TabList aria-label="Integration examples">
                    <Tab>Report button</Tab>
                    <Tab>Results webhook</Tab>
                  </TabList>
                  <TabPanels>
                    <TabPanel>
                      <CodeSnippet type="multi" feedback="Copied" aria-label="Report button snippet" wrapText>
                        {REPORT_BUTTON}
                      </CodeSnippet>
                    </TabPanel>
                    <TabPanel>
                      <CodeSnippet type="multi" feedback="Copied" aria-label="Results webhook example" wrapText>
                        {WEBHOOK}
                      </CodeSnippet>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </div>
            </Column>
            <Column sm={4} md={8} lg={{ span: 7, offset: 9 }} className="order-1 flex flex-col gap-6 lg:order-2">
              <p className="rcs-eyebrow">Integration</p>
              <h2 id="integration-title" className="rcs-site-h2">
                A report button in, a structured result out
              </h2>
              <p className="rcs-site-lede">
                Two touchpoints, both small. Put the report button on your posts, and give RCS an endpoint for results.
              </p>
              <ul className="rcs-site-list">
                <li>Results are facts only: outcome, final severity, timestamps and the post link.</li>
                <li>Signed, retried automatically, and never sent twice for the same case.</li>
                <li>{RESPONSIBILITY_BOUNDARY}</li>
              </ul>
            </Column>
          </Grid>
        </section>

        <section id="reporting" className="rcs-site-section" aria-labelledby="reporting-title" style={{ backgroundColor: "var(--cds-layer-01)" }}>
          <Grid>
            <Column sm={4} md={8} lg={7} className="flex flex-col gap-6">
              <p className="rcs-eyebrow">Reporting</p>
              <h2 id="reporting-title" className="rcs-site-h2">
                Service reports your team can trust
              </h2>
              <p className="rcs-site-lede">
                Period reports on volumes, outcomes, timeliness and delivery, calculated from completed cases and reviewed
                by an RCS manager before your team can see them.
              </p>
              <ul className="rcs-site-list">
                <li>Signed-in access for your authorised users, scoped to your organisation.</li>
                <li>View in the browser or download as PDF. Every access is logged.</li>
                <li>Aggregate only: never reviewer wellbeing, SOS details or footage.</li>
              </ul>
            </Column>
            <Column sm={4} md={8} lg={{ span: 8, offset: 8 }} className="mt-10 lg:mt-0">
              <ReportPreview />
            </Column>
          </Grid>
        </section>

        <section className="rcs-site-section" aria-label="RCS in numbers">
          <Grid>
            <Column sm={4} md={8} lg={16}>
              <dl className="rcs-stat-band">
                {[
                  ["100%", "of moderation decisions made by trained human reviewers"],
                  ["120 min", "default daily exposure limit for each reviewer"],
                  ["3", "automatic delivery attempts before a manager steps in"],
                  ["0", "reviewer wellbeing records in any client report"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt>{value}</dt>
                    <dd>{label}</dd>
                  </div>
                ))}
              </dl>
            </Column>
          </Grid>
        </section>

        <section id="faq" className="rcs-site-section" aria-labelledby="faq-title" style={{ borderBlockStart: "1px solid var(--cds-border-subtle-01)" }}>
          <Grid>
            <Column sm={4} md={8} lg={5} className="flex flex-col gap-4">
              <p className="rcs-eyebrow">FAQ</p>
              <h2 id="faq-title" className="rcs-site-h2">
                Questions platforms ask
              </h2>
            </Column>
            <Column sm={4} md={8} lg={{ span: 10, offset: 6 }} className="mt-8 lg:mt-0">
              <Accordion size="lg">
                <AccordionItem title="Who decides what happens to the content?">
                  <p className="rcs-body">
                    {RESPONSIBILITY_BOUNDARY} RCS tells you whether a policy violation was found and how severe it is; any
                    removal or account action is your team&apos;s call.
                  </p>
                </AccordionItem>
                <AccordionItem title="Does the AI make decisions?">
                  <p className="rcs-body">
                    No. The AI pre-screens each video so reviewers know what to expect, but a trained person makes every
                    final decision and can change the AI&apos;s severity.
                  </p>
                </AccordionItem>
                <AccordionItem title="What do you send back to us?">
                  <p className="rcs-body">
                    A small structured result per case: delivery ID, case ID, outcome, final severity, completion time and
                    the post link if one was given. No footage, narrative or reviewer details.
                  </p>
                </AccordionItem>
                <AccordionItem title="How are reviewers protected?">
                  <p className="rcs-body">
                    Daily exposure limits, content warnings with the right to decline, blur by default, cooldowns after
                    high-severity cases, a support request, and an SOS that stops review and alerts a manager.
                  </p>
                </AccordionItem>
                <AccordionItem title="What if our endpoint is down?">
                  <p className="rcs-body">
                    RCS retries automatically with the same delivery ID, so you never process a result twice. If it still
                    can&apos;t deliver, an RCS manager follows up with your integration contact.
                  </p>
                </AccordionItem>
              </Accordion>
            </Column>
          </Grid>
        </section>

        <Theme theme="g100">
          <section aria-labelledby="cta-title" style={{ backgroundColor: "var(--cds-background)", paddingBlock: "4rem" }}>
            <Grid>
              <Column sm={4} md={6} lg={10} className="flex flex-col gap-4">
                <h2 id="cta-title" className="rcs-site-h2">
                  Bring RCS to your platform
                </h2>
                <p className="rcs-hero-lede">
                  Set up your organisation, connect where results should go and add the report button.
                </p>
              </Column>
              <Column sm={4} md={2} lg={6} className="mt-6 flex items-end lg:mt-0 lg:justify-end">
                <Button onClick={() => navigate("/rcs/get-started")}>Get started</Button>
              </Column>
            </Grid>
          </section>
        </Theme>

        <footer className="rcs-site-footer">
          <Grid>
            {[
              { title: "Product", links: [["How it works", "/rcs#how-it-works"], ["Reviewer wellbeing", "/rcs#wellbeing"], ["Integration", "/rcs#integration"], ["Reporting", "/rcs#reporting"]] },
              { title: "Get started", links: [["Set up your organisation", "/rcs/get-started"], ["Client sign in", "/client/login"], ["Staff sign in", "/staff/login"]] },
              { title: "For the public", links: [["Report content", "/"], ["Check a case status", "/status"]] },
              { title: "This prototype", links: [["Demo flow guide", "/flow"], ["CommunityHub (simulated)", "/communityhub"]] },
            ].map((col) => (
              <Column key={col.title} sm={2} md={2} lg={4} className="mb-8">
                <h2>{col.title}</h2>
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
            <Column sm={4} md={8} lg={16}>
              <p className="rcs-helper">
                IBM × RMIT capstone prototype. Synthetic demo data only; no real organisations, people or footage.
              </p>
            </Column>
          </Grid>
        </footer>
      </main>
    </div>
  );
}
