import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Button,
  CodeSnippet,
  Column,
  Dropdown,
  Grid,
  InlineLoading,
  InlineNotification,
  ProgressIndicator,
  ProgressStep,
  TextInput,
} from "@carbon/react";
import { MarketingHeader } from "../../components/shell/MarketingHeader";
import { KeyValueList } from "../../components/ui/Blocks";
import { SMALL_SCREEN, useMediaQuery } from "../../hooks/useMediaQuery";

const STEPS = ["Organisation", "Results delivery", "Report button", "Review"] as const;

const ORG_TYPES = ["Social platform", "Video sharing", "Online community", "Marketplace", "Other"];
const VOLUMES = ["Under 100 reports a month", "100–1,000 a month", "1,000–10,000 a month", "Over 10,000 a month"];

const REPORT_LINK = "https://report.rcs.example/communityhub";

const SNIPPET = `<a href="${REPORT_LINK}?post={POST_URL}"
   class="report-button" rel="noopener">
  Report harmful content
</a>`;

/**
 * Organisation onboarding (B2B flow stage 2, "RCS / CommunityHub integration
 * is configured"). Deliberately high level and UI only, as agreed with
 * Naresh: no account is created and nothing is stored. It shows the three
 * things a platform sets up: who they are, where results go, and the report
 * button their users will press. No pricing, billing or contracts.
 */
export function OrganisationOnboardingPage() {
  const smallScreen = useMediaQuery(SMALL_SCREEN);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [orgName, setOrgName] = useState("CommunityHub");
  const [orgType, setOrgType] = useState(ORG_TYPES[0]);
  const [contact, setContact] = useState("trust-safety@communityhub.example");
  const [volume, setVolume] = useState(VOLUMES[1]);
  const [endpoint, setEndpoint] = useState("https://api.communityhub.example/rcs-results");
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function next() {
    const problems: Record<string, string> = {};
    if (step === 0) {
      if (!orgName.trim()) problems.orgName = "Enter your organisation's name.";
      if (!/^\S+@\S+\.\S+$/.test(contact.trim())) problems.contact = "Enter a work email we can reach.";
    }
    if (step === 1 && !/^https:\/\/\S+$/.test(endpoint.trim())) {
      problems.endpoint = "Enter an HTTPS address.";
    }
    setErrors(problems);
    if (Object.keys(problems).length === 0) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function runTest() {
    setTesting(true);
    // Simulated: the prototype doesn't call out to the customer's endpoint.
    window.setTimeout(() => {
      setTesting(false);
      setTested(true);
    }, 900);
  }

  return (
    <>
      <MarketingHeader />
      <main
        style={{ paddingTop: 48 + 48, paddingBottom: 64, backgroundColor: "var(--cds-layer-01)", minHeight: "100vh" }}
      >
        <Grid>
          <Column sm={4} md={8} lg={{ span: 10, offset: 3 }} className="flex flex-col gap-6">
            {done ? (
              <section className="rcs-section rcs-rise" aria-labelledby="ready-title" style={{ padding: "2rem" }}>
                <p className="rcs-eyebrow">Workspace ready</p>
                <h1 id="ready-title" className="rcs-page-title">
                  {orgName} is set up on RCS
                </h1>
                <p className="rcs-body" style={{ color: "var(--cds-text-secondary)" }}>
                  Reports from your report button now come to RCS. Each completed case is sent to your results endpoint,
                  and your team will be able to sign in to view service reports.
                </p>
                <KeyValueList
                  mono={["Reporting link", "Results endpoint"]}
                  items={[
                    { label: "Reporting link", value: REPORT_LINK },
                    { label: "Results endpoint", value: endpoint },
                    { label: "Client report access", value: `${contact} (invitation sent)` },
                  ]}
                />
                <InlineNotification
                  kind="info"
                  lowContrast
                  hideCloseButton
                  title="Prototype:"
                  subtitle="Onboarding is illustrative. The demo uses the existing CommunityHub workspace."
                  style={{ maxWidth: "100%" }}
                />
                <div className="flex flex-wrap gap-4">
                  <Button onClick={() => navigate("/communityhub")}>See the report button on CommunityHub</Button>
                  <Button kind="tertiary" onClick={() => navigate("/flow")}>
                    Back to the flow guide
                  </Button>
                </div>
              </section>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <p className="rcs-eyebrow">Bring RCS to your platform</p>
                  <h1 className="rcs-page-title">Set up your organisation</h1>
                  <p className="rcs-page-subtitle">
                    Three things: who you are, where results should go, and the report button your users will press.
                  </p>
                </div>

                {/* Carbon's guidance: a vertical progress indicator on small screens. */}
                <ProgressIndicator
                  currentIndex={step}
                  spaceEqually={!smallScreen}
                  vertical={smallScreen}
                  aria-label="Setup steps"
                >
                  {STEPS.map((label) => (
                    <ProgressStep key={label} label={label} />
                  ))}
                </ProgressIndicator>

                <section className="rcs-section" style={{ padding: "2rem", gap: "1.5rem" }} aria-label={STEPS[step]}>
                  {step === 0 && (
                    <>
                      <h2 className="rcs-section-title">Organisation</h2>
                      <TextInput
                        id="org-name"
                        labelText="Organisation name"
                        value={orgName}
                        invalid={Boolean(errors.orgName)}
                        invalidText={errors.orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                      />
                      <Dropdown
                        id="org-type"
                        titleText="Type of platform"
                        label="Choose a type"
                        items={ORG_TYPES}
                        selectedItem={orgType}
                        onChange={({ selectedItem }) => selectedItem && setOrgType(selectedItem)}
                      />
                      <TextInput
                        id="org-contact"
                        type="email"
                        labelText="Work email for your trust and safety team"
                        helperText="Used for service reports and integration notices."
                        value={contact}
                        invalid={Boolean(errors.contact)}
                        invalidText={errors.contact}
                        onChange={(e) => setContact(e.target.value)}
                      />
                      <Dropdown
                        id="org-volume"
                        titleText="Expected report volume"
                        label="Choose a range"
                        items={VOLUMES}
                        selectedItem={volume}
                        onChange={({ selectedItem }) => selectedItem && setVolume(selectedItem)}
                      />
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <h2 className="rcs-section-title">Where should results go?</h2>
                      <p className="rcs-body" style={{ color: "var(--cds-text-secondary)" }}>
                        When a reviewer completes a case, RCS sends the result here automatically. You decide what
                        action to take on your platform.
                      </p>
                      <TextInput
                        id="org-endpoint"
                        labelText="Results endpoint (HTTPS)"
                        value={endpoint}
                        invalid={Boolean(errors.endpoint)}
                        invalidText={errors.endpoint}
                        onChange={(e) => {
                          setEndpoint(e.target.value);
                          setTested(false);
                        }}
                      />
                      <div className="flex flex-wrap items-center gap-4" aria-live="polite">
                        {testing ? (
                          <InlineLoading description="Sending a test result…" />
                        ) : (
                          <Button kind="tertiary" size="md" onClick={runTest}>
                            Send a test result
                          </Button>
                        )}
                        {tested && <span className="rcs-body">Test result accepted.</span>}
                      </div>
                      <CodeSnippet type="multi" feedback="Copied" aria-label="Example result" wrapText>
                        {`{
  "delivery_id": "DEL-RCS-7Q3M-K91X",
  "case_id": "RCS-7Q3M-K91X",
  "outcome": "POLICY_VIOLATION_FOUND",
  "final_severity": "S3",
  "completed_at": "2026-10-05T14:22:00+11:00"
}`}
                      </CodeSnippet>
                      <p className="rcs-helper">
                        Facts only: no footage, narrative or reviewer details. Failed deliveries are retried
                        automatically with the same delivery ID.
                      </p>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <h2 className="rcs-section-title">Add the report button</h2>
                      <p className="rcs-body" style={{ color: "var(--cds-text-secondary)" }}>
                        Put this on each post. It opens RCS with the post link attached, so your users don&apos;t have
                        to copy it.
                      </p>
                      <KeyValueList
                        mono={["Your reporting link"]}
                        items={[{ label: "Your reporting link", value: REPORT_LINK }]}
                      />
                      <CodeSnippet type="multi" feedback="Copied" aria-label="Report button snippet" wrapText>
                        {SNIPPET}
                      </CodeSnippet>
                      <div className="flex flex-col gap-2">
                        <span className="rcs-stat-label">Preview</span>
                        <div
                          className="flex items-center justify-between gap-4"
                          style={{ padding: "1rem", border: "1px solid var(--cds-border-subtle-01)" }}
                        >
                          <span className="rcs-body">A post on {orgName || "your platform"}</span>
                          <Button kind="ghost" size="sm" onClick={() => navigate("/communityhub")}>
                            Report harmful content
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <h2 className="rcs-section-title">Review</h2>
                      <KeyValueList
                        mono={["Results endpoint", "Reporting link"]}
                        items={[
                          { label: "Organisation", value: orgName },
                          { label: "Type", value: orgType },
                          { label: "Contact", value: contact },
                          { label: "Expected volume", value: volume },
                          { label: "Results endpoint", value: endpoint },
                          { label: "Reporting link", value: REPORT_LINK },
                        ]}
                      />
                      <p className="rcs-helper">
                        RCS decides the moderation finding for each report. {orgName || "Your organisation"} decides
                        what enforcement to apply.
                      </p>
                    </>
                  )}

                  <div className="flex flex-wrap gap-4">
                    {step > 0 && (
                      <Button kind="secondary" onClick={() => setStep((s) => s - 1)}>
                        Back
                      </Button>
                    )}
                    {step < STEPS.length - 1 ? (
                      <Button onClick={next}>Continue</Button>
                    ) : (
                      <Button onClick={() => setDone(true)}>Create workspace</Button>
                    )}
                  </div>
                </section>

                <p className="rcs-helper">
                  Already set up?{" "}
                  <RouterLink className="cds--link" to="/client/login">
                    Sign in to view your reports
                  </RouterLink>
                </p>
              </>
            )}
          </Column>
        </Grid>
      </main>
    </>
  );
}
