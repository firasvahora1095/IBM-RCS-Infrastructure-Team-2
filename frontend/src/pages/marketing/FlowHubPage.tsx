import { Link as RouterLink } from "react-router-dom";
import { Column, Grid, Tag, Theme } from "@carbon/react";
import { MarketingHeader } from "../../components/shell/MarketingHeader";
import { isMockData } from "../../services";
import { DEMO_PASSWORD } from "../../services/mock/seed";

interface Stage {
  n: string;
  title: string;
  body: string;
  persona: string;
  to: string;
  signIn?: string;
}

/** The confirmed end-to-end flow (docs/ux/b2b-end-to-end-flow-spec.md §1), one tile per touchpoint. */
const STAGES: Stage[] = [
  {
    n: "01",
    title: "CommunityHub chooses RCS",
    body: "The RCS product page a platform reads before deciding.",
    persona: "Organisation",
    to: "/rcs",
  },
  {
    n: "02",
    title: "Organisation set-up",
    body: "Organisation details, results endpoint and the report button.",
    persona: "Organisation",
    to: "/rcs/get-started",
  },
  {
    n: "03",
    title: "Report button on CommunityHub",
    body: "A member of the public reports a post from the platform itself.",
    persona: "Public",
    to: "/communityhub",
  },
  {
    n: "04",
    title: "Report and case ID",
    body: "Upload the video, stay anonymous, get a case ID.",
    persona: "Reporter",
    to: "/",
  },
  {
    n: "05",
    title: "Check case status",
    body: "Received, Being Reviewed, Complete, and a plain outcome.",
    persona: "Reporter",
    to: "/status",
  },
  {
    n: "06",
    title: "AI pre-screen and protected review",
    body: "Content warning, blur, exposure limits, support and SOS. The reviewer decides.",
    persona: "Auditor",
    to: "/auditor",
    signIn: isMockData ? "auditor-1" : "auditor-01",
  },
  {
    n: "07",
    title: "Result delivered to CommunityHub",
    body: "Sent automatically on completion; the Manager only handles failures.",
    persona: "Manager",
    to: "/manager/deliveries",
    signIn: isMockData ? "manager-1" : "manager-01",
  },
  {
    n: "07b",
    title: "CommunityHub acts on the result",
    body: "The result lands in CommunityHub's moderation queue; their Trust & Safety team removes or keeps the post, and RCS is told.",
    persona: "CommunityHub Trust & Safety",
    to: "/communityhub/moderation",
    signIn: "ch-mod-04",
  },
  {
    n: "08",
    title: "Manager oversight",
    body: "SOS, reassignment, failed handoffs and reviewer exposure at a glance.",
    persona: "Manager",
    to: "/manager",
    signIn: isMockData ? "manager-1" : "manager-01",
  },
  {
    n: "09",
    title: "Service report review and release",
    body: "Generate a period report from case records, review it, release it.",
    persona: "Manager",
    to: "/manager/reports",
    signIn: isMockData ? "manager-1" : "manager-01",
  },
  {
    n: "10",
    title: "CommunityHub views the report",
    body: "An authorised CommunityHub user signs in to view and download it.",
    persona: "CommunityHub client",
    to: "/client/reports",
    signIn: "ch-user-17",
  },
];

interface HdFeature {
  title: string;
  persona: string;
  what: string;
  why: string;
  to: string;
  linkLabel: string;
}

/**
 * The Sprint 3 HD feature: the full Sprint 3 experience upgrade, shown as the
 * parts that connect end-to-end. Each says what was built and why it earns HD.
 */
const HD_FEATURES: HdFeature[] = [
  {
    title: "Manager Insights Dashboard",
    persona: "Manager",
    what: "Key figures (total, completed, open and needing action), what needs attention now, Auditor protection status, AI versus Auditor differences and CommunityHub delivery health, on one screen.",
    why: "It turns raw case records into the answers a Manager needs in seconds, and every figure opens the evidence behind it: its definition, the data it reads and the cases it counts. Insight you can check, not just charts.",
    to: "/manager",
    linkLabel: "Open the Manager dashboard",
  },
  {
    title: "Auditor dashboard: my work and protection",
    persona: "Auditor",
    what: "Each Auditor clearly sees their assigned work, today's exposure against their limit, any cooldown, and how to ask for a break or to talk.",
    why: "Wellbeing is built into the workflow, not bolted on. The protection rules are visible to the person they protect, with no quotas, rankings or speed pressure.",
    to: "/auditor",
    linkLabel: "Open the Auditor dashboard",
  },
  {
    title: "Automatic CommunityHub handoff",
    persona: "Manager",
    what: "When an Auditor completes a case, the result is sent to CommunityHub automatically, retried if it fails, and only reaches the Manager if it still needs attention.",
    why: "RCS now closes the loop with the customer reliably. Delivery is tracked separately from moderation, so a failed handoff never reopens a decided case.",
    to: "/manager/deliveries",
    linkLabel: "Open Deliveries",
  },
  {
    title: "Client service report, reviewed and released",
    persona: "Manager and CommunityHub",
    what: "The Manager generates a PDF service report from the same verified dashboard data, reviews it, then securely releases it to CommunityHub's authorised users.",
    why: "One source of truth from daily operations to client communication. Figures are frozen when the report is generated, and client access is deny-by-default and logged.",
    to: "/manager/reports",
    linkLabel: "Open Reports",
  },
];

/**
 * Flow Hub (B2B spec S0): every stage of the confirmed journey on one page,
 * each linking into the live screen, for walkthroughs and presentations.
 * Not part of the product itself.
 */
/** Local demo, or a deployed build that explicitly opts in (the test environment only). */
const showDemoAccounts = isMockData || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === "true";

export function FlowHubPage() {
  return (
    <>
      <MarketingHeader />
      <main style={{ paddingTop: 48, minHeight: "100vh", backgroundColor: "var(--cds-background)" }}>
        <Theme theme="g100">
          <section
            style={{ backgroundColor: "var(--cds-background)", paddingBlock: "4rem 3rem" }}
            aria-labelledby="flow-title"
          >
            <Grid>
              <Column sm={4} md={8} lg={12} className="flex flex-col gap-4">
                <p className="rcs-eyebrow">Demo flow guide</p>
                <h1 id="flow-title" className="rcs-hero-title" style={{ maxInlineSize: "22ch" }}>
                  From a report on CommunityHub to a released service report
                </h1>
                <p className="rcs-hero-lede">
                  Ten touchpoints across five roles. Open any stage to see the live screen; each one links on to the
                  next.
                </p>
              </Column>
            </Grid>
          </section>
        </Theme>

        <section style={{ paddingBlock: "3rem 1rem" }} aria-labelledby="hd-title">
          <Grid>
            <Column sm={4} md={8} lg={16} className="flex flex-col gap-3" style={{ marginBlockEnd: "2rem" }}>
              <Tag type="blue" size="md" style={{ margin: 0, alignSelf: "flex-start" }}>
                Sprint 3 HD feature
              </Tag>
              <h2 id="hd-title" className="rcs-page-title">
                The full Sprint 3 experience upgrade
              </h2>
              <p className="rcs-body" style={{ maxInlineSize: "72ch", color: "var(--cds-text-secondary)" }}>
                Four upgrades that connect end-to-end, so RCS is more useful for both Auditors and Managers instead of
                adding isolated screens.
              </p>
            </Column>
            {HD_FEATURES.map((feature, i) => (
              <Column key={feature.title} sm={4} md={4} lg={8} style={{ marginBlockEnd: "2rem" }}>
                <article className="rcs-section" style={{ blockSize: "100%" }} aria-labelledby={`hd-feature-${i}`}>
                  <Tag type="gray" size="sm" style={{ margin: 0, alignSelf: "flex-start" }}>
                    {feature.persona}
                  </Tag>
                  <h3 id={`hd-feature-${i}`} className="rcs-section-title">
                    {feature.title}
                  </h3>
                  <p className="rcs-body">{feature.what}</p>
                  <div
                    className="flex flex-col gap-1"
                    style={{ paddingInlineStart: "1rem", boxShadow: "inset 3px 0 0 var(--cds-support-info)" }}
                  >
                    <p className="rcs-subheading">Why it&apos;s HD</p>
                    <p className="rcs-body" style={{ color: "var(--cds-text-secondary)" }}>
                      {feature.why}
                    </p>
                  </div>
                  <RouterLink className="cds--link" to={feature.to} style={{ marginBlockStart: "auto" }}>
                    {feature.linkLabel}
                  </RouterLink>
                </article>
              </Column>
            ))}
            <Column sm={4} md={8} lg={16}>
              <div className="rcs-section" style={{ boxShadow: "inset 3px 0 0 var(--cds-support-info)" }}>
                <h3 className="rcs-section-title">Why it&apos;s HD-worthy as a whole</h3>
                <p className="rcs-body" style={{ maxInlineSize: "80ch" }}>
                  Every part connects: a report reaches a protected Auditor, the decision reaches CommunityHub
                  automatically, and the Manager sees operations, wellbeing and delivery in one place, then turns the
                  same verified data into a released client report. The journey below shows each step live.
                </p>
                <p className="rcs-mono" style={{ fontSize: 14, color: "var(--cds-text-secondary)" }}>
                  Reporter → AI pre-screen → Auditor → Manager → CommunityHub
                </p>
              </div>
            </Column>
          </Grid>
        </section>

        <section style={{ paddingBlock: "3rem" }} aria-label="Stages">
          <Grid>
            {STAGES.map((stage) => (
              <Column key={stage.n} sm={4} md={4} lg={4} style={{ marginBlockEnd: "2rem" }}>
                <RouterLink
                  to={stage.to}
                  className="rcs-stat-tile"
                  style={{ blockSize: "100%", gap: "0.75rem" }}
                  aria-label={`Stage ${stage.n}: ${stage.title}. ${stage.body}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="rcs-mono" style={{ fontSize: 14, color: "var(--cds-text-secondary)" }}>
                      {stage.n}
                    </span>
                    <Tag type="gray" size="sm" style={{ margin: 0 }}>
                      {stage.persona}
                    </Tag>
                  </span>
                  <span className="rcs-section-title">{stage.title}</span>
                  <span className="rcs-body" style={{ color: "var(--cds-text-secondary)" }}>
                    {stage.body}
                  </span>
                  <span className="rcs-stat-helper" style={{ marginBlockStart: "auto" }}>
                    {stage.signIn ? `Open (sign in as ${stage.signIn})` : "Open"}
                  </span>
                </RouterLink>
              </Column>
            ))}
          </Grid>
        </section>

        {/* Demo accounts for walkthroughs. The page is public, so on a deployed build they show only
            where the build opts in (the test environment); the live app never publishes logins. */}
        {showDemoAccounts && (
          <section style={{ paddingBlockEnd: "4rem" }} aria-labelledby="demo-accounts">
            <Grid>
              <Column sm={4} md={8} lg={10}>
                <div className="rcs-section">
                  <h2 id="demo-accounts" className="rcs-section-title">
                    Demo accounts
                  </h2>
                  <p className="rcs-helper">
                    Synthetic demo data. Every account uses the password{" "}
                    <span className="rcs-mono">{DEMO_PASSWORD}</span>.
                  </p>
                  <dl className="rcs-kv">
                    {[
                      {
                        role: "Auditor",
                        ids: isMockData
                          ? "auditor-1 (also auditor-2 to auditor-5)"
                          : "auditor-01 (also auditor-02 to auditor-04)",
                        scope: "Reviews cases",
                        to: "/staff/login",
                      },
                      {
                        role: "Manager",
                        ids: isMockData ? "manager-1" : "manager-01",
                        scope: "Oversight, deliveries, reports",
                        to: "/staff/login",
                      },
                      {
                        role: "CommunityHub · Reports",
                        ids: "ch-user-17",
                        scope: "Monthly service reports and messages",
                        to: "/client/login",
                      },
                      {
                        role: "CommunityHub · Trust & Safety",
                        ids: "ch-mod-04",
                        scope: "Case results and CommunityHub's moderation queue",
                        to: "/communityhub/moderation",
                      },
                      {
                        role: "CommunityHub · Admin",
                        ids: "ch-admin-01",
                        scope: "Everything a CommunityHub user can see",
                        to: "/client/login",
                      },
                    ].map(({ role, ids, scope, to }) => (
                      <div key={role} className="rcs-kv-row">
                        <dt>{role}</dt>
                        <dd>
                          <span className="rcs-mono">{ids}</span> · {scope} ·{" "}
                          <RouterLink className="cds--link" to={to}>
                            Sign in
                          </RouterLink>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </Column>
            </Grid>
          </section>
        )}
      </main>
    </>
  );
}
