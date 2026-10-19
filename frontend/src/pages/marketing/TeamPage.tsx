import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Button, Column, Grid, Tag } from "@carbon/react";
import { Checkmark, Copy, LogoGithub } from "@carbon/icons-react";
import { MarketingHeader } from "../../components/shell/MarketingHeader";
import { Section, SiteClose } from "./siteKit";
import { REPO_URL, TEAM, initialsOf, type TeamMember } from "./team";

const FACTS = [
  ["Industry partner", "IBM"],
  ["Programme", "RMIT capstone"],
  ["Timeline", "12 weeks, 3 sprints"],
  ["Status", "Working prototype on IBM Cloud"],
] as const;

const ASKED = [
  "A way for the public to report suspected abusive or violent video, with a case ID to follow it.",
  "AI that analyses each video first, so human Reviewers aren't exposed to it raw.",
  "Exposure limits, cooldowns and an SOS that brings in a Manager when something goes wrong.",
  "A Manager view to oversee Reviewers, respond to SOS and decide declined cases.",
  "Deployment on IBM Cloud, using synthetic or staged footage only.",
];

const DELIVERED = [
  "Public reporting with anonymous case IDs and a status page in plain language.",
  "An AI pre-screen on watsonx.ai and Watson Speech to Text: a severity, a safe summary and a timeline.",
  "A Reviewer workspace with a content warning, blur by default, a 120-minute daily limit, cooldowns and SOS.",
  "A Manager dashboard for oversight, SOS, reassignment, AI-versus-Reviewer validation and service reports.",
  "A B2B layer: a simulated pilot platform, CommunityHub, with a report button, result delivery and a Client portal.",
];

const STACK = [
  { group: "IBM AI", items: ["watsonx.ai", "Watson Speech to Text", "watsonx Orchestrate", "watsonx.governance"] },
  { group: "IBM Cloud", items: ["Code Engine", "Cloud Object Storage"] },
  { group: "Application", items: ["React", "TypeScript", "IBM Carbon", "Python", "FastAPI", "PostgreSQL"] },
  { group: "Delivery", items: ["Figma", "GitHub", "GitHub Actions", "Microsoft Planner"] },
];

const SPRINTS = [
  {
    name: "Sprint 1",
    title: "Design and set-up",
    body: "Requirements, personas and an expert interview, Figma prototypes for every role, and the IBM Cloud services connected.",
  },
  {
    name: "Sprint 2",
    title: "The core product",
    body: "The working MVP: real AI analysis, the Reviewer and Manager screens on a live backend, and end-to-end UAT.",
  },
  {
    name: "Sprint 3",
    title: "Refine and extend",
    body: "Wellbeing logic, validation and audit, the Client portal and B2B flow, edge-case QA and the final deploy.",
  },
];

/**
 * The team page: who built Responsible Content Safety, what IBM asked for, and exactly what each person did, sprint by
 * sprint, with resume-ready highlights. Written for two readers: the markers and IBM, who want the brief and the
 * evidence, and hiring managers, who want each person's contribution in their own words. Credits follow the team's
 * official contribution table (see team.ts).
 */
export function TeamPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "The team · Responsible Content Safety (RCS)";
  }, []);

  return (
    <div className="rcs-site lp">
      <MarketingHeader activeId="team" />
      <main id="main-content" className="lp-main">
        <section className="lp-hero tp-hero" aria-labelledby="team-hero-title">
          <div className="lp-hero-wash" aria-hidden="true" />
          <Grid className="lp-hero-grid">
            <Column sm={4} md={8} lg={10} className="lp-hero-text">
              <p className="lp-eyebrow">RMIT Team 6, with IBM</p>
              <h1 id="team-hero-title" className="tp-title">
                The team behind Responsible Content Safety.
              </h1>
              <p className="lp-hero-sub">
                Five RMIT students built Responsible Content Safety (RCS) in one semester for IBM: a service that reviews
                reported harmful video while protecting the people who review it.
              </p>
              <div className="lp-hero-actions">
                <Button href={REPO_URL} target="_blank" rel="noopener noreferrer" renderIcon={LogoGithub}>
                  View the code on GitHub
                </Button>
                <Button kind="tertiary" onClick={() => navigate("/flow")}>
                  Try the demo
                </Button>
              </div>
            </Column>
            <Column sm={4} md={8} lg={16}>
              <dl className="tp-facts">
                {FACTS.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <nav aria-label="Team members" className="tp-index">
                <ul>
                  {TEAM.map((m) => (
                    <li key={m.slug}>
                      <a href={`#${m.slug}`}>
                        <span className="tp-index-face" style={{ backgroundImage: m.tile }} aria-hidden="true">
                          {initialsOf(m.name)}
                        </span>
                        <span className="tp-index-text">
                          <span className="tp-index-name">{m.name}</span>
                          <span className="tp-index-role">{m.role}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </Column>
          </Grid>
        </section>

        <Section
          id="brief"
          eyebrow="The brief"
          title="IBM asked for a safer way to review harmful video."
          lede="The people who review reported abuse and violence carry its harm. IBM's brief: let AI take the first look, and build the protection for the human into the product."
        >
          <div className="tp-brief">
            <div>
              <h3 className="tp-brief-title">What IBM asked for</h3>
              <ul className="lp-check-list">
                {ASKED.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="tp-brief-title">What we delivered</h3>
              <ul className="lp-check-list">
                {DELIVERED.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="tp-brief-links">
                <RouterLink className="cds--link" to="/rcs">
                  Read the product overview
                </RouterLink>
                <RouterLink className="cds--link" to="/flow">
                  Walk the full flow in the demo guide
                </RouterLink>
              </p>
            </div>
          </div>
        </Section>

        <Section
          id="contributions"
          tint
          eyebrow="Contributions"
          title="Who did what."
          lede="Each person's work by sprint, from the team's official contribution record, with highlights written to go straight onto a resume."
        >
          <div className="tp-people">
            {TEAM.map((member) => (
              <PersonProfile key={member.slug} member={member} />
            ))}
          </div>
        </Section>

        <Section id="stack" eyebrow="Built with" title="IBM technology, end to end.">
          <dl className="tp-stack">
            {STACK.map(({ group, items }) => (
              <div key={group}>
                <dt>{group}</dt>
                <dd>
                  {items.map((item) => (
                    <Tag key={item} type="gray" size="md">
                      {item}
                    </Tag>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section id="how-we-worked" tint eyebrow="How we worked" title="Three sprints, one shared product.">
          <ol className="lp-steps tp-sprints">
            {SPRINTS.map((sprint) => (
              <li key={sprint.name} className="lp-step">
                <span className="lp-step-num">{sprint.name}</span>
                <h3 className="lp-step-title">{sprint.title}</h3>
                <p className="lp-step-body">{sprint.body}</p>
              </li>
            ))}
          </ol>
        </Section>

        <SiteClose
          title="See what we built."
          lede="Walk through every role in the demo guide, or read the code on GitHub."
          actions={
            <>
              <Button onClick={() => navigate("/flow")}>Demo guide</Button>
              <a className="cds--link" href={REPO_URL} target="_blank" rel="noopener noreferrer">
                View the code on GitHub
              </a>
            </>
          }
        />
      </main>
    </div>
  );
}

/** One person: photo or initials, role and skills, then their sprints and resume highlights with a copy button. */
function PersonProfile({ member }: { member: TeamMember }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copyHighlights() {
    const text = [
      `${member.role}, Responsible Content Safety (IBM × RMIT capstone), 2026`,
      ...member.highlights.map((h) => `• ${h}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article id={member.slug} className="tp-person" aria-labelledby={`${member.slug}-name`}>
      <div className="tp-person-id">
        <div className="tp-person-photo" style={{ backgroundImage: member.tile }}>
          <span aria-hidden="true">{initialsOf(member.name)}</span>
          {!photoFailed && (
            <img src={member.photo} alt={member.name} loading="lazy" onError={() => setPhotoFailed(true)} />
          )}
        </div>
        <h3 id={`${member.slug}-name`} className="tp-person-name">
          {member.name}
        </h3>
        <p className="tp-person-role">{member.role}</p>
        <ul className="tp-person-skills" aria-label={`${member.name}'s skills`}>
          {member.skills.map((skill) => (
            <li key={skill}>
              <Tag type="cool-gray" size="sm">
                {skill}
              </Tag>
            </li>
          ))}
        </ul>
      </div>

      <div className="tp-person-work">
        <h4 className="tp-person-label">By sprint</h4>
        <dl className="tp-person-sprints">
          {member.sprints.map((work, i) => (
            <div key={work}>
              <dt>Sprint {i + 1}</dt>
              <dd>{work}</dd>
            </div>
          ))}
        </dl>

        <div className="tp-person-highlights-head">
          <h4 className="tp-person-label">Highlights</h4>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={copied ? Checkmark : Copy}
            onClick={copyHighlights}
            aria-label={`Copy ${member.name}'s highlights`}
          >
            {copied ? "Copied" : "Copy highlights"}
          </Button>
        </div>
        <ul className="tp-person-highlights">
          {member.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <span className="cds--visually-hidden" aria-live="polite">
          {copied ? `${member.name}'s highlights copied` : ""}
        </span>
      </div>
    </article>
  );
}
