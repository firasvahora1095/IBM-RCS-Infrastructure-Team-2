import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Button, Column, Grid, Tag } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { MarketingHeader } from "../../components/shell/MarketingHeader";
import { isMockData } from "../../services";
import { DEMO_PASSWORD } from "../../services/mock/seed";
import { Section, SiteClose } from "./siteKit";
import { STAGES, type Stage } from "./flowStages";

/** Local demo, or a deployed build that explicitly opts in (the test environment only). */
const showDemoAccounts = isMockData || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === "true";

/** The journey in four phases, so eleven stages read as one story rather than a wall of tiles. */
const PHASES: { title: string; body: string; stages: string[] }[] = [
  { title: "The platform signs up", body: "CommunityHub reads about RCS and connects to it.", stages: ["01", "02"] },
  { title: "Someone reports a post", body: "A member of the public reports a video and follows it.", stages: ["03", "04", "05"] },
  {
    title: "RCS reviews and delivers",
    body: "A protected review, then the result goes back to CommunityHub.",
    stages: ["06", "06b", "07", "07b"],
  },
  { title: "Oversight and reporting", body: "The Manager oversees the work and releases a service report.", stages: ["08", "09", "10", "11"] },
];

/** One Carbon tag colour per role, so a role reads the same on every stage. */
const ROLE_TAG: Record<string, "cool-gray" | "teal" | "purple" | "blue" | "green"> = {
  Organisation: "cool-gray",
  Public: "teal",
  Reporter: "teal",
  Auditor: "purple",
  "Super Auditor": "purple",
  Manager: "blue",
  "CommunityHub Trust & Safety": "green",
  "CommunityHub Client": "green",
  "CommunityHub Admin": "green",
};

const ACCOUNTS = [
  {
    role: "Auditor",
    ids: isMockData ? "auditor-1 to auditor-5" : "auditor-01 to auditor-04",
    scope: "Reviews cases",
    to: "/staff/login",
  },
  {
    role: "Super Auditor",
    ids: isMockData ? "superauditor-1" : "superauditor-01",
    scope: "The fallback queue, and cases to review",
    to: "/staff/login",
  },
  { role: "Manager", ids: isMockData ? "manager-1" : "manager-01", scope: "Oversight, deliveries, reports", to: "/staff/login" },
  { role: "CommunityHub · Reports", ids: "ch-user-17", scope: "Service reports and messages", to: "/client/login" },
  {
    role: "CommunityHub · Trust & Safety",
    ids: "ch-mod-04",
    scope: "Case results and the moderation queue",
    to: "/communityhub/moderation",
  },
  { role: "CommunityHub · Admin", ids: "ch-admin-01", scope: "Everything a CommunityHub user can see", to: "/client/login" },
];

/**
 * Demo guide (B2B spec S0): every stage of the journey, in four phases, each opening the live screen for the person
 * who uses it. For walkthroughs and presentations; not part of the product itself. Built on the product site's
 * section template so it reads as part of the same site.
 */
export function FlowHubPage() {
  const navigate = useNavigate();
  const byNumber = new Map(STAGES.map((s) => [s.n, s]));

  return (
    <div className="rcs-site lp">
      <MarketingHeader />
      <main id="main-content" className="lp-main">
        <section className="lp-hero fl-hero" aria-labelledby="flow-title">
          <div className="lp-hero-wash" aria-hidden="true" />
          <Grid className="lp-hero-grid">
            <Column sm={4} md={8} lg={11} className="lp-hero-text">
              <p className="lp-eyebrow">Demo guide</p>
              <h1 id="flow-title" className="tp-title fl-title">
                From a report on CommunityHub to a released service report.
              </h1>
              <p className="lp-hero-sub">
                The full journey in {STAGES.length} stages, for every role, in the order a report travels. Open any stage to see the live
                screen, signed in as the person who uses it.
              </p>
            </Column>
            <Column sm={4} md={8} lg={5} className="fl-hero-side">
              <ol className="fl-phase-index">
                {PHASES.map((phase, i) => (
                  <li key={phase.title}>
                    <a href={`#phase-${i + 1}`}>
                      <span className="fl-phase-num">{i + 1}</span>
                      {phase.title}
                    </a>
                  </li>
                ))}
              </ol>
            </Column>
          </Grid>
        </section>

        <section className="lp-section fl-stages" aria-label="Stages">
          <Grid>
            <Column sm={4} md={8} lg={16}>
              {PHASES.map((phase, i) => (
                <div key={phase.title} id={`phase-${i + 1}`} className="fl-phase">
                  <div className="fl-phase-head">
                    <span className="fl-phase-num" aria-hidden="true">
                      {i + 1}
                    </span>
                    <div>
                      <h2 className="fl-phase-title">{phase.title}</h2>
                      <p className="fl-phase-body">{phase.body}</p>
                    </div>
                  </div>
                  <ul className="fl-cards">
                    {phase.stages.map((n) => {
                      const stage = byNumber.get(n);
                      return stage ? <StageCard key={n} stage={stage} /> : null;
                    })}
                  </ul>
                </div>
              ))}
            </Column>
          </Grid>
        </section>

        {showDemoAccounts && (
          <Section
            id="demo-accounts"
            tint
            eyebrow="Demo accounts"
            title="Sign in as anyone in the story."
            lede={
              <>
                Synthetic demo data only. Every account uses the password{" "}
                <span className="fl-mono">{DEMO_PASSWORD}</span>.
              </>
            }
          >
            <div className="fl-accounts-scroll" role="region" aria-label="Demo accounts" tabIndex={0}>
              <table className="fl-accounts">
                <thead>
                  <tr>
                    <th scope="col">Role</th>
                    <th scope="col">User ID</th>
                    <th scope="col">Can see</th>
                    <th scope="col">
                      <span className="cds--visually-hidden">Sign in</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ACCOUNTS.map((a) => (
                    <tr key={a.role}>
                      <th scope="row">{a.role}</th>
                      <td className="fl-mono">{a.ids}</td>
                      <td>{a.scope}</td>
                      <td>
                        <RouterLink className="cds--link" to={a.to} aria-label={`Sign in as ${a.role}`}>
                          Sign in
                        </RouterLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        <SiteClose
          title="Ready to bring RCS to your platform?"
          lede="Set up your organisation, connect where results go and add the report button."
          actions={
            <>
              <Button onClick={() => navigate("/rcs/get-started")}>Get started</Button>
              <RouterLink className="cds--link" to="/rcs">
                Product overview
              </RouterLink>
            </>
          }
        />
      </main>
    </div>
  );
}

/** One stage: the whole card is the link, with the role, what happens and who it signs in as. */
function StageCard({ stage }: { stage: Stage }) {
  return (
    <li>
      <RouterLink to={stage.to} className="fl-card">
        <span className="fl-card-top">
          <span className="fl-card-num">{stage.n}</span>
          <Tag type={ROLE_TAG[stage.persona] ?? "cool-gray"} size="sm">
            {stage.persona}
          </Tag>
        </span>
        <span className="fl-card-title">{stage.title}</span>
        <span className="fl-card-body">{stage.body}</span>
        <span className="fl-card-cta">
          {stage.signIn ? `Open, signed in as ${stage.signIn}` : "Open"}
          <ArrowRight size={16} aria-hidden />
        </span>
      </RouterLink>
    </li>
  );
}
