import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Header,
  HeaderGlobalBar,
  HeaderName,
  InlineNotification,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  RadioButton,
  RadioButtonGroup,
  Search,
  Tag,
  Theme,
} from "@carbon/react";
import { ArrowDown, ArrowUp, Bookmark, Chat, PlayFilledAlt, Share } from "@carbon/icons-react";

interface Post {
  id: string;
  author: string;
  community: string;
  postedAgo: string;
  title: string;
  body: string;
  duration: string;
  votes: number;
  comments: number;
}

/** Neutral synthetic posts: no harmful content is shown or described. */
const POSTS: Post[] = [
  {
    id: "4721",
    author: "riverside_local",
    community: "Riverside Neighbourhood",
    postedAgo: "2 h",
    title: "Outside the station last night",
    body: "Filmed this on the way home. Posting so people know what's going on around here.",
    duration: "2:14",
    votes: 48,
    comments: 31,
  },
  {
    id: "4718",
    author: "weekend.footy",
    community: "Sunday League",
    postedAgo: "5 h",
    title: "Highlights from this morning's match",
    body: "Great turnout today. Full-time 3–2.",
    duration: "4:02",
    votes: 212,
    comments: 57,
  },
  {
    id: "4702",
    author: "cityfoodie",
    community: "Eat Local",
    postedAgo: "1 d",
    title: "New ramen place on Smith St",
    body: "Worth the queue. Get the miso.",
    duration: "0:48",
    votes: 96,
    comments: 12,
  },
];

const COMMUNITIES = ["Riverside Neighbourhood", "Sunday League", "Eat Local", "City Cyclists", "Gardening Club"];

type Reason = "spam" | "harassment" | "violent-video" | "misinformation" | "other";

const REASONS: { value: Reason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "violent-video", label: "Violent or harmful video" },
  { value: "misinformation", label: "False information" },
  { value: "other", label: "Something else" },
];

const postUrl = (id: string) => `https://communityhub.example/post/${id}`;
const initials = (name: string) =>
  name
    .split(/[\s._-]+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);

/**
 * A simulated CommunityHub (B2B flow stage 3). It stands in for the
 * customer's own platform, built to look like a real community product, to
 * show where the RCS report button lives. CommunityHub's own report dialog
 * offers its usual reasons; "Violent or harmful video" is handed to RCS, its
 * safety partner, with the post link attached. Other reasons stay with
 * CommunityHub's own team. Clearly labelled as simulated.
 */
export function CommunityHubPage() {
  const navigate = useNavigate();
  const [reporting, setReporting] = useState<Post | null>(null);
  const [reason, setReason] = useState<Reason | null>(null);
  const [handledLocally, setHandledLocally] = useState<string | null>(null);

  function openReport(post: Post) {
    setReporting(post);
    setReason(null);
  }

  function submitReport() {
    if (!reporting || !reason) return;
    if (reason === "violent-video") {
      const params = new URLSearchParams({ from: "communityhub", source: postUrl(reporting.id) });
      navigate(`/?${params.toString()}`);
      return;
    }
    setHandledLocally(reporting.title);
    setReporting(null);
  }

  return (
    <>
      <Theme theme="g100">
        <Header aria-label="CommunityHub (simulated)">
          <HeaderName href="/communityhub" prefix="">
            CommunityHub
          </HeaderName>
          <div className="hidden md:flex" style={{ flex: 1, maxWidth: 480, marginInline: "2rem", alignItems: "center" }}>
            <Search size="sm" labelText="Search CommunityHub" placeholder="Search CommunityHub" />
          </div>
          <HeaderGlobalBar className="items-center gap-3 pr-4 sm:pr-6">
            <Tag type="gray" size="md" style={{ margin: 0, whiteSpace: "nowrap" }}>
              Simulated platform
            </Tag>
            <Button size="sm" kind="primary">
              Create post
            </Button>
          </HeaderGlobalBar>
        </Header>
      </Theme>

      <main className="ch-shell">
        <div className="ch-layout">
          <aside className="ch-side" aria-label="CommunityHub navigation">
            <nav className="ch-card" aria-label="Feeds" style={{ paddingBlock: "0.5rem" }}>
              <a className="ch-nav-link" href="/communityhub" aria-current="page">
                Home
              </a>
              <a className="ch-nav-link" href="/communityhub">
                Popular
              </a>
              <a className="ch-nav-link" href="/communityhub">
                Saved
              </a>
            </nav>
            <nav className="ch-card" aria-label="Your communities" style={{ paddingBlock: "0.5rem" }}>
              <p className="rcs-eyebrow" style={{ padding: "0.5rem 0.75rem" }}>
                Your communities
              </p>
              {COMMUNITIES.map((c) => (
                <a key={c} className="ch-nav-link" href="/communityhub">
                  <span
                    className="ch-avatar"
                    aria-hidden="true"
                    style={{ inlineSize: "1.5rem", blockSize: "1.5rem", fontSize: 10 }}
                  >
                    {initials(c)}
                  </span>
                  {c}
                </a>
              ))}
            </nav>
          </aside>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="rcs-page-title">Home</h1>
              <p className="rcs-page-subtitle">
                A stand-in for CommunityHub. Use Report on a post to see how a harmful-video report reaches RCS.
              </p>
            </div>

            {handledLocally && (
              <InlineNotification
                kind="success"
                lowContrast
                title="Thanks for your report."
                subtitle={`CommunityHub's team will look at "${handledLocally}".`}
                onClose={() => setHandledLocally(null)}
                style={{ maxWidth: "100%" }}
              />
            )}

            <ul className="flex flex-col gap-4" aria-label="Posts">
              {POSTS.map((post) => (
                <li key={post.id}>
                  <article className="ch-card ch-post" aria-labelledby={`post-${post.id}`}>
                    <div className="ch-votes" role="img" aria-label={`${post.votes} votes`}>
                      <ArrowUp size={16} aria-hidden="true" />
                      <span aria-hidden="true">{post.votes}</span>
                      <ArrowDown size={16} aria-hidden="true" />
                    </div>
                    <div className="flex min-w-0 flex-col gap-3" style={{ padding: "1rem 1rem 0.5rem" }}>
                      <header className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="ch-avatar" aria-hidden="true">
                            {initials(post.community)}
                          </span>
                          <div className="flex flex-col">
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{post.community}</span>
                            <span className="rcs-helper">
                              {post.author} · {post.postedAgo}
                            </span>
                          </div>
                        </div>
                        <OverflowMenu
                          flipped
                          aria-label={`More options for "${post.title}"`}
                          iconDescription={`More options for "${post.title}"`}
                        >
                          <OverflowMenuItem itemText="Save" />
                          <OverflowMenuItem itemText="Hide" />
                          <OverflowMenuItem itemText="Report" hasDivider onClick={() => openReport(post)} />
                        </OverflowMenu>
                      </header>
                      <h2 id={`post-${post.id}`} style={{ fontSize: 18, lineHeight: "24px", fontWeight: 600 }}>
                        {post.title}
                      </h2>
                      <p className="rcs-body">{post.body}</p>
                      {/* A neutral placeholder, never real footage. */}
                      <div className="ch-media" role="img" aria-label={`Video, ${post.duration} (placeholder)`}>
                        <PlayFilledAlt size={32} aria-hidden="true" />
                        <span className="ch-media-time" aria-hidden="true">
                          {post.duration}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Button kind="ghost" size="sm" renderIcon={Chat}>
                          {`${post.comments} comments`}
                        </Button>
                        <Button kind="ghost" size="sm" renderIcon={Share}>
                          Share
                        </Button>
                        <Button kind="ghost" size="sm" renderIcon={Bookmark}>
                          Save
                        </Button>
                        <Button kind="ghost" size="sm" onClick={() => openReport(post)}>
                          Report
                        </Button>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </div>

          <aside className="ch-side" aria-label="About CommunityHub">
            <section className="ch-card flex flex-col gap-3" style={{ padding: "1rem" }} aria-labelledby="about-title">
              <h2 id="about-title" style={{ fontSize: 16, fontWeight: 600 }}>
                About CommunityHub
              </h2>
              <p className="rcs-body" style={{ color: "var(--cds-text-secondary)" }}>
                Local communities, sport, food and everything in between.
              </p>
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="rcs-helper">Members</dt>
                  <dd className="rcs-mono">1.2M</dd>
                </div>
                <div>
                  <dt className="rcs-helper">Online</dt>
                  <dd className="rcs-mono">18.4k</dd>
                </div>
              </dl>
            </section>
            <section className="ch-card flex flex-col gap-2" style={{ padding: "1rem" }} aria-labelledby="safety-title">
              <h2 id="safety-title" style={{ fontSize: 16, fontWeight: 600 }}>
                Safety on CommunityHub
              </h2>
              <p className="rcs-body" style={{ color: "var(--cds-text-secondary)" }}>
                Reports of violent or harmful video are reviewed by RCS, our independent safety partner. Trained
                reviewers make every decision; we decide what action to take.
              </p>
            </section>
          </aside>
        </div>
      </main>

      <Modal
        open={reporting !== null}
        modalHeading="Report this post"
        modalLabel="CommunityHub"
        primaryButtonText={reason === "violent-video" ? "Continue to RCS" : "Submit report"}
        primaryButtonDisabled={!reason}
        secondaryButtonText="Cancel"
        onRequestClose={() => setReporting(null)}
        onRequestSubmit={submitReport}
      >
        <div className="flex flex-col gap-5">
          <RadioButtonGroup
            legendText="Why are you reporting it?"
            name="report-reason"
            orientation="vertical"
            valueSelected={reason ?? ""}
            onChange={(value) => setReason(value as Reason)}
          >
            {REASONS.map((r) => (
              <RadioButton key={r.value} id={`reason-${r.value}`} value={r.value} labelText={r.label} />
            ))}
          </RadioButtonGroup>
          {reason === "violent-video" && (
            <div className="flex flex-col gap-2" style={{ padding: "1rem", backgroundColor: "var(--cds-layer-01)" }}>
              <p style={{ fontSize: 14, fontWeight: 600 }}>Reviewed by RCS, our independent safety partner</p>
              <ul className="rcs-site-list">
                <li>You don&apos;t need an account, and you can stay anonymous.</li>
                <li>We&apos;ll attach this post&apos;s link for you.</li>
                <li>You&apos;ll get a case ID to check progress.</li>
              </ul>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
