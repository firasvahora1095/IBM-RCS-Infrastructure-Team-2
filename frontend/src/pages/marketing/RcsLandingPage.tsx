import { useEffect, useState, type ComponentType, type ReactNode } from "react";
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
  Theme,
} from "@carbon/react";
import {
  ArrowDown,
  Collaborate,
  DocumentView,
  Locked,
  Security,
  Timer,
  UserMultiple,
  ViewOff,
  WarningAlt,
} from "@carbon/icons-react";
import { MarketingHeader, SITE_SECTIONS } from "../../components/shell/MarketingHeader";
import { RcsLogo } from "../../components/brand/RcsMark";
import { BlurRevealDemo } from "./BlurRevealDemo";
import { ProductTour } from "./ProductTour";

/**
 * The one worked example on the page. Every time and figure that describes it comes from here, so the page can never
 * quote two different numbers for the same thing. It is labelled as one synthetic case, not as an average.
 */
const EXAMPLE_CASE = {
  id: "RCS-7Q3M-K91X",
  steps: [
    { time: "09:12", label: "Reported from CommunityHub" },
    { time: "09:14", label: "AI pre-screen: S3 High" },
    { time: "09:41", label: "Decided by a Reviewer" },
    { time: "09:41", label: "Result delivered" },
  ],
  minutes: 29,
} as const;

/** Default daily viewing limit (backend `exposure_limit_minutes`, server default 120). Managers can set it lower. */
const DEFAULT_DAILY_LIMIT_MINUTES = 120;
/** Automatic delivery attempts before a Manager steps in (backend `MAX_AUTO_ATTEMPTS`). */
const DELIVERY_ATTEMPTS = 3;

/**
 * RMIT Team 6. `photo` is looked for in public/team (see the README there). Until a photo exists, the card shows the
 * person's initials on their own brand-gradient tile; both gradient stops carry white text at 5:1 or better.
 */
const TEAM = [
  {
    name: "Hyuna Bae",
    role: "Project Manager",
    did: "Ran the sprints and Client check-ins, built the AI Buddy and led end-to-end testing.",
    photo: "/team/hyuna-bae.jpg",
    tile: "linear-gradient(135deg, #5b45d6, #0f62fe)",
  },
  {
    name: "Janataarah Begum",
    role: "Business Analyst / QA",
    did: "Wrote the requirements and the wording of every status, then proved each feature against them in UAT.",
    photo: "/team/janataarah-begum.jpg",
    tile: "linear-gradient(135deg, #0b7a75, #005d5d)",
  },
  {
    name: "Aleeya Ahmad",
    role: "UX / Research",
    did: "Researched Reviewer wellbeing, designed every screen and built the Reviewer, Manager and Client interfaces.",
    photo: "/team/aleeya-ahmad.jpg",
    tile: "linear-gradient(135deg, #6929c4, #5b45d6)",
  },
  {
    name: "Firas Vahora",
    role: "Developer",
    did: "Built the FastAPI backend, weighted case assignment, video frame extraction and the watsonx Orchestrate integration.",
    photo: "/team/firas-vahora.jpg",
    tile: "linear-gradient(135deg, #1d3f91, #0b7a75)",
  },
  {
    name: "Aiden Brundell",
    role: "Developer",
    did: "Built the watsonx.governance checks, database persistence and the IBM Cloud deployment.",
    photo: "/team/aiden-brundell.jpg",
    tile: "linear-gradient(135deg, #0d1633, #5b45d6)",
  },
] as const;

/** The cost of doing nothing, set against what RCS does instead. Qualitative on purpose: no invented statistics. */
const BEFORE_AFTER = [
  {
    today: "Every flagged video opens in full.",
    rcs: "AI reads it first. The Reviewer sees a content warning, then footage that starts fully blurred.",
  },
  {
    today: "Exposure goes uncounted. Tools measure throughput, not harm.",
    rcs: `Viewing time is counted on every case, and at the daily limit (${DEFAULT_DAILY_LIMIT_MINUTES} minutes by default) no new cases are assigned.`,
  },
  {
    today: "When a video hurts someone, it is noticed late, if at all.",
    rcs: "SOS hides the content at once and alerts a Manager, who follows up with that person.",
  },
] as const;

type Icon = ComponentType<{ size?: number; "aria-hidden"?: boolean }>;

/** The four wellbeing protections: the main row of the design-rule section. */
const PROTECTIONS: { icon: Icon; title: string; body: string }[] = [
  {
    icon: WarningAlt,
    title: "Know before you look",
    body: "A content warning shows what was flagged and how severe it is. Proceed or decline; declining is a normal outcome.",
  },
  {
    icon: ViewOff,
    title: "Blurred by default",
    body: "Footage opens fully blurred and in grayscale. Reviewers lower the blur only as far as they need, or mute the sound.",
  },
  {
    icon: Timer,
    title: "A limit the system keeps",
    body: `Viewing time is counted while footage plays. ${DEFAULT_DAILY_LIMIT_MINUTES} minutes a day by default, and a Manager can set a lower limit for one person.`,
  },
  {
    icon: Collaborate,
    title: "Help in one click",
    body: "A cooldown follows severe cases. A wellbeing check-in is always available, and SOS brings in a Manager.",
  },
];

/** Accountability: the second, shorter row. */
const ACCOUNTABILITY: { icon: Icon; title: string; body: string }[] = [
  {
    icon: UserMultiple,
    title: "People decide",
    body: "The AI pre-screens and rates severity. A Reviewer makes every final call and can change the AI's severity.",
  },
  {
    icon: DocumentView,
    title: "Both views kept",
    body: "The AI's rating and the Reviewer's decision are both recorded, so differences can be reviewed later.",
  },
];

const INTEGRATION_STEPS = [
  {
    title: "Add the report button",
    body: "A link on each post. People report without making an account.",
  },
  {
    title: "Give RCS your results endpoint",
    body: "Each completed case arrives there as a small JSON result.",
  },
  {
    title: "Act on each result",
    body: "Your team removes or keeps the post, and records it in the Client portal.",
  },
] as const;

const RESULT_CONTAINS = ["Case and delivery IDs", "Outcome and final severity", "When the case was completed", "The post link"];
const RESULT_NEVER = ["Footage or frames", "AI summaries", "Who reviewed the case", "Wellbeing or SOS details"];

const SECURITY: { icon: Icon; title: string; body: string }[] = [
  {
    icon: Locked,
    title: "Footage stays in RCS",
    body: "Videos, AI summaries and Reviewer notes never leave RCS. Your platform receives the outcome, final severity, time and post link.",
  },
  {
    icon: UserMultiple,
    title: "Reviewers stay private",
    body: "Results and reports never say who reviewed a case, and never include wellbeing or SOS details.",
  },
  {
    icon: DocumentView,
    title: "Access is logged",
    body: "The Client portal is signed in and scoped to your organisation. Every view and download is logged.",
  },
  {
    icon: Security,
    title: "AI under governance",
    body: "AI use is monitored with IBM watsonx.governance, and a Reviewer is told when the AI could not analyse a video.",
  },
];

const IBM_STACK = [
  "watsonx.ai",
  "Watson Speech to Text",
  "watsonx Orchestrate",
  "watsonx.governance",
  "IBM Cloud Code Engine",
  "IBM Cloud Object Storage",
];

/** The result as the backend builds it for a Client (backend/app/b2b.py): the agreed minimum fields, unsigned. */
const RESULT_PAYLOAD = `POST https://your-platform.example/rcs-results
Content-Type: application/json

{
  "delivery_id": "DEL-${EXAMPLE_CASE.id}",
  "case_id": "${EXAMPLE_CASE.id}",
  "organisation_id": "COMMUNITYHUB",
  "outcome": "POLICY_VIOLATION_FOUND",
  "final_severity": "S3",
  "completed_at": "2026-10-05T09:41:00+11:00",
  "moderation_status": "COMPLETE",
  "source_url": "https://communityhub.example/post/4721"
}`;

const REPORT_BUTTON = `<!-- On each post, with the post's own URL -->
<a
  class="report-button"
  href="{RCS_HOST}/report?from=your-platform&source={POST_URL}"
  rel="noopener"
>
  Report harmful content
</a>`;

const FAQ = [
  {
    q: "Who decides what happens to a post?",
    a: "Your team does. RCS decides the moderation finding: whether a policy violation was found and how severe it is. Removing the post or acting on an account is your call.",
  },
  {
    q: "Does the AI make decisions?",
    a: "No. The AI pre-screens each video so the Reviewer knows what to expect. A trained person makes every final decision and can change the AI's severity.",
  },
  {
    q: "What happens if a Reviewer sees something they didn't expect?",
    a: "They press SOS. The content is hidden at once, a Manager is alerted and follows up with them, and a cooldown starts.",
  },
  {
    q: "What do we need to build?",
    a: "Two things: a report button on your posts, which is a link, and an endpoint that accepts a small JSON result. Organisation set-up walks you through both.",
  },
  {
    q: "What if our endpoint is down?",
    a: `RCS tries again automatically, up to ${DELIVERY_ATTEMPTS} attempts, with the same delivery ID so you never process a result twice. If it still can't deliver, an RCS Manager follows up with your integration contact.`,
  },
  {
    q: "Is this a live service?",
    a: "Not yet. RCS is an IBM × RMIT capstone prototype. The product runs as real software on IBM Cloud, but the platform it serves, CommunityHub, is simulated and every case is synthetic.",
  },
];

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
      ["Demo flow guide", "/flow"],
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
      ["The team", "/rcs#team"],
      ["About this prototype", "/rcs#prototype"],
      ["CommunityHub (simulated)", "/communityhub"],
      ["FAQ", "/rcs#faq"],
    ],
  },
] as const;

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}

/**
 * Marks the section crossing the middle of the screen in the header. Only the sections the header lists are watched,
 * so nothing is marked while the hero or a section outside the nav is being read.
 */
function useActiveSection(): string | undefined {
  const [active, setActive] = useState<string>();
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Set<string>();
    const order = SITE_SECTIONS.map((s) => s.id as string);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id)));
        setActive(order.find((id) => visible.has(id)));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    order.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  return active;
}

/**
 * The one section template every content section uses: a header block (eyebrow, H2, optional lede) on lg 10 of 16
 * columns, then the content on the full 16 columns, starting on the same left edge, after the same gap (spacing-09).
 * Inside the content, layouts are CSS grids, never nested Carbon columns, so nothing drifts off the shared edge.
 */
function Section({
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

/**
 * The Responsible Content Safety (RCS) product site, B2B flow stage 1: what a platform's trust-and-safety lead reads
 * before deciding. Built around one sentence, the problem, and one interaction, the protected first look at a flagged
 * case. Structure: hero, the cost of doing nothing, how it works, product tour, the team, outcomes, integration, trust
 * and security, FAQ, closing call to action and footer. Proof is honest only: no customer logos, testimonials, pricing
 * or invented metrics (B2B flow §17 scope fence).
 */
export function RcsLandingPage() {
  const navigate = useNavigate();
  const active = useActiveSection();

  return (
    <div className="rcs-site lp">
      <MarketingHeader activeId={active} />
      <main id="main-content" className="lp-main">
        {/* 1. Hero: the problem first, the product name spelled out, and the protections to try. */}
        <section id="top" className="lp-hero" aria-labelledby="hero-title">
          <div className="lp-hero-wash" aria-hidden="true" />
          <Grid className="lp-hero-grid">
            <Column sm={4} md={8} lg={8} className="lp-hero-text">
              <RcsLogo size={48} />
              <h1 id="hero-title" className="lp-hero-title">
                <span className="lp-hero-title-a">Every harmful-video report lands on a human.</span>{" "}
                <span className="lp-hero-title-b">Nothing protects them.</span>
              </h1>
              <p className="lp-hero-why">
                Moderators watch violence and abuse so no one else has to, and nothing in their tools limits how much
                they see.
              </p>
              <p className="lp-hero-sub">
                Responsible Content Safety (RCS) reviews the harmful video your users report, with protection for the
                Reviewer built into every case. You get a clear, human decision back.
              </p>
              <div className="lp-hero-actions">
                <Button onClick={() => navigate("/rcs/get-started")}>Get started</Button>
                <Button kind="tertiary" renderIcon={ArrowDown} onClick={() => navigate("/rcs#how-it-works")}>
                  See how it works
                </Button>
              </div>
              <div className="lp-hero-credit">
                <ul className="lp-hero-faces" aria-hidden="true">
                  {TEAM.map((m) => (
                    <li key={m.name} style={{ backgroundImage: m.tile }}>
                      {initialsOf(m.name)}
                    </li>
                  ))}
                </ul>
                <p>
                  Built by <strong>RMIT Team 6, with IBM</strong>. An IBM × RMIT capstone prototype on synthetic data.{" "}
                  <a className="cds--link" href="#team">
                    Meet the team
                  </a>
                </p>
              </div>
            </Column>
            <Column sm={4} md={8} lg={8} className="lp-hero-demo">
              <BlurRevealDemo />
            </Column>
          </Grid>
        </section>

        {/* 2. The cost of doing nothing, for the person who has to answer for it. */}
        <Section
          id="problem"
          eyebrow="Why it matters"
          title="Moderation tools clear the queue. Nobody protects the person clearing it."
          lede="If you run trust and safety, your Reviewers carry the harm your users report. Doing nothing asks them to absorb it without limit, with nothing to show for your duty of care. RCS makes that care part of the workflow."
        >
          <div className="lp-compare" role="table" aria-label="Today, and with RCS">
            <div className="lp-compare-head" role="row">
              <span role="columnheader">Today</span>
              <span role="columnheader">With RCS</span>
            </div>
            {BEFORE_AFTER.map((row) => (
              <div key={row.today} className="lp-compare-row" role="row">
                <p role="cell" className="lp-compare-today">
                  {row.today}
                </p>
                <p role="cell" className="lp-compare-rcs">
                  {row.rcs}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* 3. How a report is handled. */}
        <Section id="how-it-works" tint eyebrow="How it works" title="One report. Four steps. One human decision.">
          <ol className="lp-steps">
            <li className="lp-step">
              <span className="lp-step-num">01</span>
              <h3 className="lp-step-title">Your users report</h3>
              <p className="lp-step-body">
                Someone presses the report button on your platform and sends the video. No account needed. They get a
                case ID to follow its progress.
              </p>
            </li>
            <li className="lp-step">
              <span className="lp-step-num">02</span>
              <h3 className="lp-step-title">AI reads it first</h3>
              <p className="lp-step-body">
                It writes a short, safe summary, marks the flagged moments and rates severity from S1 to S4. It never
                decides the outcome.
              </p>
            </li>
            <Theme theme="g100" as="li" className="lp-step lp-step--decision">
              <span className="lp-step-num">03</span>
              <h3 className="lp-step-title">A trained Reviewer decides</h3>
              <p className="lp-step-body">
                They see what was flagged before choosing to proceed or decline, then review behind blur, within a daily
                viewing limit, with support one click away. This is the step RCS is built around.
              </p>
            </Theme>
            <li className="lp-step">
              <span className="lp-step-num">04</span>
              <h3 className="lp-step-title">You get the result</h3>
              <p className="lp-step-body">
                Your platform receives the outcome and final severity, and your team chooses the action. Footage and
                Reviewer details never leave RCS.
              </p>
            </li>
          </ol>
          <div className="lp-example">
            <ol className="lp-example-track" aria-label={`Example case ${EXAMPLE_CASE.id}`}>
              {EXAMPLE_CASE.steps.map((step) => (
                <li key={step.label}>
                  <span className="lp-example-time">{step.time}</span>
                  <span className="lp-example-label">{step.label}</span>
                </li>
              ))}
            </ol>
            <p className="lp-example-caption">
              One example case, {EXAMPLE_CASE.minutes} minutes from report to delivered result. Synthetic data.
            </p>
          </div>
        </Section>

        {/* 4. Product tour, one real screen per role. */}
        <Section
          id="product"
          eyebrow="Product tour"
          title="One service, three views."
          lede="Each person sees what their role needs, and nothing more."
        >
          <ProductTour />
        </Section>

        {/* 5. The team: who built it, credited as Emily asked. */}
        <Section
          id="team"
          tint
          eyebrow="Meet the team"
          title="Built by RMIT Team 6, with IBM."
          lede="Five students, one semester, one question: what would content moderation look like if it were designed around the people who do it? Responsible Content Safety is our answer."
        >
          <ul className="lp-team">
            {TEAM.map((member) => (
              <TeamCard key={member.name} member={member} />
            ))}
          </ul>
        </Section>

        {/* 6. Features, grouped by the outcome they deliver. */}
        <Section
          id="features"
          eyebrow="Our first design rule"
          title="When speed and wellbeing conflict, wellbeing wins."
          lede={
            <>
              Every protection is enforced by RCS on every case, so none depends on anyone&apos;s judgement in a hard
              moment. Try the Reviewer&apos;s first look at a case in the{" "}
              <a className="cds--link lp-inline-link" href="#top">
                demo at the top of the page
              </a>
              .
            </>
          }
        >
          <FeatureGrid items={PROTECTIONS} columns={4} />
          <FeatureGrid items={ACCOUNTABILITY} columns={2} />
        </Section>

        {/* 7. Integration: three steps, then the code and what a result contains. */}
        <Section
          id="integration"
          tint
          eyebrow="Integration"
          title="A report button in. A short, structured result out."
          lede="Two touchpoints connect your platform to RCS, and organisation set-up walks you through both."
        >
          <ol className="lp-int-steps">
            {INTEGRATION_STEPS.map((step, i) => (
              <li key={step.title} className="lp-int-step">
                <span className="lp-int-num">{i + 1}</span>
                <h3 className="lp-int-title">{step.title}</h3>
                <p className="lp-int-body">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="lp-int-detail">
            <div className="lp-int-code">
              <Tabs>
                <TabList aria-label="Integration code">
                  <Tab>Results payload</Tab>
                  <Tab>Report button</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel>
                    <CodeSnippet type="multi" feedback="Copied" aria-label="Results payload example" maxCollapsedNumberOfRows={20}>
                      {RESULT_PAYLOAD}
                    </CodeSnippet>
                  </TabPanel>
                  <TabPanel>
                    <CodeSnippet type="multi" feedback="Copied" aria-label="Report button snippet" maxCollapsedNumberOfRows={20}>
                      {REPORT_BUTTON}
                    </CodeSnippet>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </div>
            <div className="lp-int-facts">
              <h3 className="lp-int-facts-title">Every result contains</h3>
              <ul className="lp-check-list">
                {RESULT_CONTAINS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h3 className="lp-int-facts-title">and never contains</h3>
              <ul className="lp-cross-list">
                {RESULT_NEVER.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="lp-int-facts-note">
                A failed delivery is retried, up to {DELIVERY_ATTEMPTS} attempts, with the same delivery ID, so you never
                process a result twice.
              </p>
            </div>
          </div>
        </Section>

        {/* 8. Trust and security, and honest proof. */}
        <Section id="security" eyebrow="Trust and security" title="What leaves RCS is a finding. Nothing else.">
          <FeatureGrid items={SECURITY} columns={4} />
          <div className="lp-stack-ibm">
            <p className="lp-stack-ibm-label">Built with IBM, on IBM technology</p>
            <ul>
              {IBM_STACK.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
          <div id="prototype" className="lp-real" role="group" aria-labelledby="prototype-title">
            <div className="lp-real-head">
              <h3 id="prototype-title" className="lp-real-title">
                About this prototype
              </h3>
              <RouterLink className="cds--link" to="/flow">
                Walk the full flow in the demo guide
              </RouterLink>
            </div>
            <dl className="lp-real-list">
              <div>
                <dt>Real</dt>
                <dd>
                  The Reviewer workspace, Manager dashboard, Client portal, AI pre-screen, wellbeing rules and result
                  delivery run as working code on a real backend and database on IBM Cloud.
                </dd>
              </div>
              <div>
                <dt>Simulated pilot</dt>
                <dd>
                  CommunityHub, a simulated platform like Reddit, is our pilot Client: a feed, a report button on every
                  post and a moderation queue that receives RCS results. A student project can&apos;t get live API
                  access to a real platform.
                </dd>
              </div>
              <div>
                <dt>Synthetic</dt>
                <dd>
                  Every case, person, video and report is invented. No real footage and no real people appear anywhere.
                </dd>
              </div>
            </dl>
          </div>
        </Section>

        {/* 9. Questions platforms ask. */}
        <Section id="faq" tint eyebrow="FAQ" title="Questions platforms ask">
          <Accordion size="lg" className="lp-faq">
            {FAQ.map((item, i) => (
              <AccordionItem key={item.q} title={item.q} open={i === 0}>
                <p className="lp-faq-answer">{item.a}</p>
              </AccordionItem>
            ))}
          </Accordion>
        </Section>

        {/* 10. One dark close: the call to action and the footer. */}
        <Theme theme="g100" className="lp-close">
          <div className="lp-close-rule" aria-hidden="true" />
          <section className="lp-cta" aria-labelledby="cta-title">
            <Grid>
              <Column sm={4} md={5} lg={10} className="lp-section-head">
                <h2 id="cta-title" className="lp-h2">
                  Protect the people who review your reports.
                </h2>
                <p className="lp-lede">Set up your organisation, connect where results go and add the report button.</p>
              </Column>
              <Column sm={4} md={3} lg={6} className="lp-cta-actions">
                <Button onClick={() => navigate("/rcs/get-started")}>Get started</Button>
                <RouterLink className="cds--link" to="/flow">
                  Open the demo guide
                </RouterLink>
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
                  Responsible Content Safety (RCS) is an IBM × RMIT capstone prototype by RMIT Team 6, with IBM.
                  CommunityHub is simulated. Synthetic data only: no real organisations, people or footage.
                </p>
                <p>© 2026 RMIT Team 6</p>
              </Column>
            </Grid>
          </footer>
        </Theme>
      </main>
    </div>
  );
}

/** Equal-height feature tiles: one Carbon icon (24, brand deep purple), a heading-03 title and one short paragraph. */
function FeatureGrid({ items, columns }: { items: { icon: Icon; title: string; body: string }[]; columns: 2 | 4 }) {
  return (
    <ul className={`lp-features lp-features--${columns}`}>
      {items.map(({ icon: ItemIcon, title, body }) => (
        <li key={title} className="lp-feature">
          <ItemIcon size={24} aria-hidden />
          <h3 className="lp-feature-title">{title}</h3>
          <p className="lp-feature-body">{body}</p>
        </li>
      ))}
    </ul>
  );
}

/** One person: their photo if one has been added, their initials on a brand tile if not, then what they did. */
function TeamCard({ member }: { member: (typeof TEAM)[number] }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  return (
    <li className="lp-member">
      <div className="lp-member-photo" style={{ backgroundImage: member.tile }}>
        <span aria-hidden="true">{initialsOf(member.name)}</span>
        {!photoFailed && (
          <img src={member.photo} alt={member.name} loading="lazy" onError={() => setPhotoFailed(true)} />
        )}
      </div>
      <h3 className="lp-member-name">{member.name}</h3>
      <p className="lp-member-role">{member.role}</p>
      <p className="lp-member-did">{member.did}</p>
    </li>
  );
}
