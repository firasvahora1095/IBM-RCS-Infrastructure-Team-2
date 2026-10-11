import { Link as RouterLink } from "react-router-dom";
import { Column, Grid, Tag, Theme } from "@carbon/react";
import { MarketingHeader } from "../../components/shell/MarketingHeader";
import { isMockData } from "../../services";
import { STAGES } from "./flowStages";
import { DEMO_PASSWORD } from "../../services/mock/seed";

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
                  Eleven stages across five roles, in the order a report travels. Open any stage to see the live screen,
                  signed in as the person who uses it.
                </p>
              </Column>
            </Grid>
          </section>
        </Theme>

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
