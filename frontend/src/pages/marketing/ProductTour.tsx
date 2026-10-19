import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@carbon/react";

/**
 * Product tour: the three views of RCS, one tab per role, each shown with a real screenshot of the running app (mock
 * data mode, 1440x900 at 2x, saved under public/landing). Footage stays at 100% blur and every person and case is
 * synthetic. The bullet points describe only what the screenshot shows.
 */
/** Bump `v` whenever the screenshots are retaken, so browsers never show a cached older capture. */
const VIEWS = [
  {
    tab: "Reviewer workspace",
    title: "The Reviewer starts from a summary, not raw footage",
    points: [
      "Footage opens at 100% blur and in grayscale, with SOS on the video itself",
      "The AI summary, severity and flagged moments sit beside the player",
      "Today's viewing time against the daily limit stays in the header",
      "A wellbeing check-in is one click away, and the case stays open",
    ],
    image: "/landing/reviewer-workspace.webp?v=3",
    window: "RCS · Review workspace",
    alt: "The RCS Reviewer workspace for case AR-2026-00417: the video is fully blurred at 100% with grayscale on and a red SOS button over it, the AI summary and S3 High severity are on the right, and the header shows 62 of 120 minutes of exposure used today.",
  },
  {
    tab: "Manager oversight",
    title: "The Manager sees who needs them, first",
    points: [
      "SOS alerts, break requests and talk requests at the top of one Needs you list",
      "Declined cases waiting for reassignment, with a suggested Reviewer",
      "Failed deliveries to a Client, with the reason",
      "Open cases, completed cases and delivery success for the period",
    ],
    image: "/landing/manager-overview.webp?v=3",
    window: "RCS · Manager overview",
    alt: "The RCS Manager overview: an SOS banner, figures for open cases, completed cases and delivery success, and a Needs you list led by an unacknowledged SOS alert, then break and talk requests and declined cases awaiting reassignment.",
  },
  {
    tab: "Client portal",
    title: "Your team sees every result, and decides the action",
    points: [
      "Every result RCS has delivered: outcome, final severity and when it was decided",
      "A Needs action view, so nothing waits unseen",
      "Apply RCS decisions in one go, or record an action post by post",
      "Never footage, summaries or who reviewed a case",
    ],
    image: "/landing/client-case-results.webp?v=3",
    window: "RCS · Client portal",
    alt: "The RCS Client portal case results for CommunityHub: figures for violations found, posts removed and results acted on, and a Needs action table listing each case ID, post, RCS result, final severity and a Record action button.",
  },
] as const;

export function ProductTour() {
  return (
    <>
      <Tabs>
        <TabList aria-label="Product tour by role" className="lp-tour-tabs">
          {VIEWS.map((v) => (
            <Tab key={v.tab}>{v.tab}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {VIEWS.map((v) => (
            <TabPanel key={v.tab} className="lp-tour-panel">
              <div className="lp-tour">
                <div className="lp-tour-copy">
                  <h3 className="lp-tour-title">{v.title}</h3>
                  <ul className="lp-check-list">
                    {v.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
                <figure className="lp-screen">
                  <div className="lp-screen-bar" aria-hidden="true">
                    <span className="lp-screen-dots">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>{v.window}</span>
                  </div>
                  <img src={v.image} alt={v.alt} width={1600} height={1000} loading="lazy" decoding="async" />
                </figure>
              </div>
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
      <p className="lp-tour-note">Real screens from the running prototype, with synthetic data. Footage stays blurred.</p>
    </>
  );
}
