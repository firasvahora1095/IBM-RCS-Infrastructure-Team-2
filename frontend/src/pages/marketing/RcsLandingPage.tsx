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
import { MarketingHeader, SITE_SECTIONS } from "../../components/shell/MarketingHeader";
import { RcsMark } from "../../components/brand/RcsMark";
import { ExposureBar } from "../../components/exposure/ExposureBar";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { SegmentedBar } from "../../components/ui/Charts";
import { RESPONSIBILITY_BOUNDARY } from "../../design-tokens/deliveryLabels";
import { StatusTag } from "../../components/ui/StatusTag";

const SECTIONS = SITE_SECTIONS;

/**
 * RMIT Team 2. `photo` is a file in public/team (see the README there); until one is added the card shows the
 * person's initials, so the layout never shifts and a missing file is never a broken image.
 */
const TEAM = [
  {
    name: "Hyuna Bae",
    role: "Project manager",
    did: "Kept the sprint plan, the Client check-ins and the demo on track.",
    photo: "/team/hyuna-bae.jpg",
  },
  {
    name: "Janataarah Begum",
    role: "Business analyst / QA",
    did: "Wrote the requirements behind every screen, and tested every build against them.",
    photo: "/team/janataarah-begum.jpg",
  },
  {
    name: "Aleeya Ahmad",
    role: "UX / Research",
    did: "Researched reviewer wellbeing, then designed the reviewer, manager and Client experience around it.",
    photo: "/team/aleeya-ahmad.jpg",
  },
  {
    name: "Firas Vahora",
    role: "Developer",
    did: "Built the backend, the AI pipeline and the result delivery to Clients.",
    photo: "/team/firas-vahora.jpg",
  },
  {
    name: "Aiden Brundell",
    role: "Developer",
    did: "Built the frontend of the reviewer and manager tools against the design.",
    photo: "/team/aiden-brundell.jpg",
  },
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
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
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

/**
 * The blur-to-reveal mechanic, felt rather than described: a harmless placeholder frame starts blurred behind a
 * content warning, as a reviewer sees a flagged case first. Unlike the other previews this one is interactive, so it
 * is a real button and not an inert picture; the illustration itself is decorative.
 */
function BlurRevealDemo() {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rcs-preview rcs-reveal-card">
      <div className="rcs-preview-bar">
        <span style={{ fontSize: 14, fontWeight: 600 }}>What a reviewer sees first</span>
      </div>
      <div className="rcs-reveal-frame">
        <svg
          className={`rcs-reveal-image${revealed ? "" : " rcs-reveal-image--blurred"}`}
          viewBox="0 0 400 225"
          aria-hidden="true"
          focusable="false"
        >
          <rect width="400" height="225" fill="#a6c8ff" />
          <circle cx="320" cy="55" r="30" fill="#ffd6a5" />
          <path d="M0 160 160 90 240 150 320 110 400 170V225H0Z" fill="#4589ff" />
          <path d="M0 190 120 140 260 185 400 150V225H0Z" fill="#0f62fe" />
        </svg>
        {!revealed && (
          <div className="rcs-reveal-overlay">
            <span className="rcs-reveal-tag">Content warning</span>
            <p className="rcs-reveal-caption">Flagged for review. Nothing shows until you choose to proceed.</p>
            <Button size="sm" onClick={() => setRevealed(true)}>
              Proceed
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p style={{ fontSize: 12, margin: 0, color: "var(--cds-text-secondary)" }}>
          A harmless placeholder, not a real case. The same mechanic protects every reviewer, every time.
        </p>
        {revealed && (
          <Button size="sm" kind="ghost" onClick={() => setRevealed(false)}>
            Blur again
          </Button>
        )}
      </div>
    </div>
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
          Wellbeing check-in
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
        <StatusTag kind="report" value="RELEASED" size="sm" />
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
      <MarketingHeader activeId={active} />
      <main style={{ paddingTop: 48, backgroundColor: "var(--cds-background)" }}>
        <Theme theme="g100">
          <section
            id="overview"
            aria-labelledby="hero-title"
            style={{ backgroundColor: "var(--cds-background)", paddingBlock: "5rem" }}
          >
            <Grid>
              <Column sm={4} md={8} lg={8} className="flex flex-col gap-6">
                <p className="rcs-eyebrow rcs-eyebrow--brand">
                  <RcsMark size={18} />
                  IBM Responsible Content Safety
                </p>
                <h1 id="hero-title" className="rcs-hero-title" style={{ maxInlineSize: "17ch" }}>
                  Content moderation that protects the people who do it.
                </h1>
                {/* The problem, in the first thing anyone reads. */}
                <p className="rcs-hero-problem">
                  Every harmful-video report lands on a human. Nothing protects them.
                </p>
                <p className="rcs-hero-lede">
                  RCS puts AI in front of every video and enforced limits around every reviewer. A trained person makes
                  every decision, and the result returns to your platform.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button onClick={() => navigate("/rcs/get-started")}>Get started</Button>
                  <Button kind="secondary" onClick={() => navigate("/rcs#how-it-works")}>
                    See how it works
                  </Button>
                </div>
                <ul className="rcs-hero-facts">
                  <li>No account needed for your users</li>
                  <li>Results to your own endpoint</li>
                  <li>You decide enforcement</li>
                </ul>
                <BlurRevealDemo />
              </Column>
              <Column sm={4} md={8} lg={{ span: 7, offset: 9 }} className="mt-10 lg:mt-0 flex items-center">
                <div style={{ inlineSize: "100%" }}>
                  <CaseJourneyPreview />
                </div>
              </Column>
            </Grid>
          </section>
        </Theme>

        <section id="problem" className="rcs-site-section" aria-labelledby="problem-title">
          <Grid>
            <Column sm={4} md={8} lg={10} className="flex flex-col gap-4">
              <p className="rcs-eyebrow">The problem</p>
              <h2 id="problem-title" className="rcs-site-h2">
                The people who review harmful videos are exposed to them again and again.
              </h2>
              <p className="rcs-site-lede">
                Reviewers watch footage of abuse and violence as a core part of the job, and the tools they use have no
                built-in way to limit how much they see or to protect their wellbeing while they work. Moderation
                products are built to clear a queue. The person clearing it is left out of the design.
              </p>
            </Column>
            <Column sm={4} md={8} lg={{ span: 5, offset: 12 }} className="mt-6 lg:mt-0">
              <p className="rcs-eyebrow">What RCS changes</p>
              <ul className="rcs-problem-list">
                <li>AI reads each video first, so a reviewer starts from a summary, not raw footage.</li>
                <li>Exposure limits and cooldowns are enforced by the system, not left to willpower.</li>
                <li>One press of SOS brings in a manager. Wellbeing always comes before speed.</li>
              </ul>
            </Column>
          </Grid>
        </section>

        <section
          aria-label="Technology"
          style={{ paddingBlock: "2rem", borderBlockEnd: "1px solid var(--cds-border-subtle-01)" }}
        >
          <Grid>
            <Column sm={4} md={8} lg={16}>
              <dl className="rcs-builton">
                <dt>Built on IBM technology</dt>
                {[
                  "watsonx.ai",
                  "Watson Speech to Text",
                  "watsonx Orchestrate",
                  "IBM Cloud Code Engine",
                  "IBM Cloud Object Storage",
                ].map((name) => (
                  <dd key={name}>{name}</dd>
                ))}
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
                Your users report harmful video with your own report button. RCS handles review end to end and sends you
                a structured result for every case.
              </p>
            </Column>
            <Column sm={4} md={8} lg={16} className="mt-12">
              <ol className="rcs-rail">
                {[
                  [
                    "Your users report",
                    "Your report button opens RCS with the post attached. People upload the video, can stay anonymous, and get a case ID.",
                  ],
                  [
                    "AI pre-screens",
                    "Each video is analysed first: severity, a safe written summary and a timeline of flagged moments, before anyone sees it.",
                  ],
                  [
                    "A person decides",
                    "A trained reviewer makes the final call, with warnings, blur and exposure limits. The AI never decides.",
                  ],
                  [
                    "You get the result",
                    "The outcome and final severity arrive at your endpoint automatically. Your team decides what action to take.",
                  ],
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

        <section
          id="wellbeing"
          className="rcs-site-section"
          aria-labelledby="wellbeing-title"
          style={{ backgroundColor: "var(--cds-layer-01)" }}
        >
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

        <section
          id="reporting"
          className="rcs-site-section"
          aria-labelledby="reporting-title"
          style={{ backgroundColor: "var(--cds-layer-01)" }}
        >
          <Grid>
            <Column sm={4} md={8} lg={7} className="flex flex-col gap-6">
              <p className="rcs-eyebrow">Reporting</p>
              <h2 id="reporting-title" className="rcs-site-h2">
                Service reports your team can trust
              </h2>
              <p className="rcs-site-lede">
                Period reports on volumes, outcomes, timeliness and delivery, calculated from completed cases and
                reviewed by an RCS manager before your team can see them.
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
              <p className="rcs-eyebrow" style={{ marginBlockEnd: "1.5rem" }}>
                RCS in numbers
              </p>
              <dl className="rcs-stat-band">
                {[
                  ["100%", "Decisions made by a trained person", "The AI never decides an outcome."],
                  ["120 min", "Daily viewing limit per reviewer", "Enforced by the system, not by willpower."],
                  ["3", "Delivery attempts, then a human", "A result never quietly fails to arrive."],
                  ["0", "Wellbeing details in a Client report", "Reports are aggregate facts only."],
                ].map(([value, label, detail]) => (
                  <div key={label}>
                    <dt>{value}</dt>
                    <dd>
                      <span className="rcs-stat-label">{label}</span>
                      <span className="rcs-stat-detail">{detail}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </Column>
          </Grid>
        </section>

        <section
          id="team"
          className="rcs-site-section"
          aria-labelledby="team-title"
          style={{ backgroundColor: "var(--cds-layer-01)" }}
        >
          <Grid>
            <Column sm={4} md={8} lg={10} className="flex flex-col gap-4">
              <p className="rcs-eyebrow">Meet the team</p>
              <h2 id="team-title" className="rcs-site-h2">
                Built by RMIT Team 2, with IBM.
              </h2>
              <p className="rcs-site-lede">
                Five students, one semester, one question: what would content moderation look like if it were designed
                around the people who do it? RCS is our answer.
              </p>
            </Column>
            <Column sm={4} md={8} lg={16} className="mt-10">
              <ul className="rcs-team">
                {TEAM.map((member) => (
                  <TeamCard key={member.name} member={member} />
                ))}
              </ul>
            </Column>
          </Grid>
        </section>

        <section
          id="faq"
          className="rcs-site-section"
          aria-labelledby="faq-title"
          style={{ borderBlockStart: "1px solid var(--cds-border-subtle-01)" }}
        >
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
                    {RESPONSIBILITY_BOUNDARY} RCS tells you whether a policy violation was found and how severe it is;
                    any removal or account action is your team&apos;s call.
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
                    A small structured result per case: delivery ID, case ID, outcome, final severity, completion time
                    and the post link if one was given. No footage, narrative or reviewer details.
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
                    RCS retries automatically with the same delivery ID, so you never process a result twice. If it
                    still can&apos;t deliver, an RCS manager follows up with your integration contact.
                  </p>
                </AccordionItem>
              </Accordion>
            </Column>
          </Grid>
        </section>

        <section
          id="prototype"
          className="rcs-site-section"
          aria-labelledby="prototype-title"
          style={{ borderBlockStart: "1px solid var(--cds-border-subtle-01)" }}
        >
          <Grid>
            <Column sm={4} md={8} lg={6} className="flex flex-col gap-4">
              <p className="rcs-eyebrow">About this prototype</p>
              <h2 id="prototype-title" className="rcs-site-h2">
                What is real, and what is simulated
              </h2>
            </Column>
            <Column sm={4} md={8} lg={{ span: 9, offset: 7 }} className="mt-8 lg:mt-0">
              <dl className="rcs-disclosure">
                <div>
                  <dt>CommunityHub is a simulation</dt>
                  <dd>
                    CommunityHub is a stand-in for a real social platform such as Reddit. We could not get API access to
                    a live platform for a student project, so we built a faithful simulation of one: a feed, a report
                    button on every post, and a moderation queue that receives our results. Everything RCS does on its
                    side of that boundary is real.
                  </dd>
                </div>
                <div>
                  <dt>The RCS product is real software</dt>
                  <dd>
                    The reviewer workspace, manager dashboard, Client portal, AI pre-screen, wellbeing rules and result
                    delivery all run as working code against a real backend and database.
                  </dd>
                </div>
                <div>
                  <dt>All data is synthetic</dt>
                  <dd>
                    Every case, person, video and report is invented for this prototype. No real footage, no real
                    reports and no real people appear anywhere in it.
                  </dd>
                </div>
              </dl>
            </Column>
          </Grid>
        </section>

        {/* One continuous dark block to close the page: the call to action and the footer, not two theme switches. */}
        <Theme theme="g100">
          <div style={{ backgroundColor: "var(--cds-background)" }}>
            <section aria-labelledby="cta-title" style={{ paddingBlock: "4rem" }}>
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
                  <Button kind="secondary" onClick={() => navigate("/rcs/get-started")}>
                    Get started
                  </Button>
                </Column>
              </Grid>
            </section>

            <footer className="rcs-site-footer">
              <Grid>
                {[
                  {
                    title: "Product",
                    links: [
                      ["How it works", "/rcs#how-it-works"],
                      ["Reviewer wellbeing", "/rcs#wellbeing"],
                      ["Integration", "/rcs#integration"],
                      ["Reporting", "/rcs#reporting"],
                    ],
                  },
                  {
                    title: "Get started",
                    links: [
                      ["Set up your organisation", "/rcs/get-started"],
                      ["Client sign in", "/client/login"],
                      ["Staff sign in", "/staff/login"],
                    ],
                  },
                  {
                    title: "For the public",
                    links: [
                      ["Report content", "/report"],
                      ["Check a case status", "/report/status"],
                    ],
                  },
                  {
                    title: "This prototype",
                    links: [
                      ["What is simulated", "/rcs#prototype"],
                      ["CommunityHub (simulated)", "/communityhub"],
                      ["Demo flow guide", "/flow"],
                    ],
                  },
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
                  <p
                    className="flex flex-wrap items-center gap-3"
                    style={{ fontSize: 14, color: "var(--cds-text-secondary)" }}
                  >
                    <RcsMark size={20} />
                    IBM × RMIT capstone prototype. CommunityHub is a simulated platform. Synthetic data only: no real
                    organisations, people or footage.
                  </p>
                </Column>
              </Grid>
            </footer>
          </div>
        </Theme>
      </main>
    </div>
  );
}

/** One person: their photo if one has been added, their initials if not, then what they did on RCS. */
function TeamCard({ member }: { member: (typeof TEAM)[number] }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const initials = member.name
    .split(" ")
    .map((part) => part[0])
    .join("");
  return (
    <li className="rcs-team-card">
      {photoFailed ? (
        <span className="rcs-team-photo rcs-team-photo--initials" aria-hidden="true">
          {initials}
        </span>
      ) : (
        <img
          className="rcs-team-photo"
          src={member.photo}
          alt={member.name}
          width={120}
          height={120}
          loading="lazy"
          onError={() => setPhotoFailed(true)}
        />
      )}
      <span className="rcs-team-name">{member.name}</span>
      <span className="rcs-team-role">{member.role}</span>
      <span className="rcs-team-did">{member.did}</span>
    </li>
  );
}
