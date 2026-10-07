import { useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { InlineNotification, Modal, RadioButton, RadioButtonGroup } from "@carbon/react";
import { CommunityHubHeader } from "../../components/communityhub/CommunityHubHeader";
import {
  ArrowDown,
  ArrowUp,
  Bicycle,
  Bookmark,
  Chat,
  Fire,
  Flag,
  Home,
  PlayFilledAlt,
  Restaurant,
  Share,
  Soccer,
  Sprout,
  Star,
  Time,
  Train,
} from "@carbon/icons-react";

type IconType = ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" }>;

interface Community {
  name: string;
  slug: string;
  /** Index into the community colour set in _site.scss (.ch-tone-0 … 4). */
  tone: number;
  members: string;
}

const COMMUNITIES: Community[] = [
  { name: "Riverside Neighbourhood", slug: "riverside", tone: 0, members: "48.2k" },
  { name: "Sunday League", slug: "sundayleague", tone: 1, members: "21.7k" },
  { name: "Eat Local", slug: "eatlocal", tone: 2, members: "96.1k" },
  { name: "City Cyclists", slug: "citycyclists", tone: 3, members: "12.9k" },
  { name: "Gardening Club", slug: "gardening", tone: 4, members: "33.4k" },
];

interface Post {
  id: string;
  author: string;
  community: Community;
  postedAgo: string;
  flair: string;
  title: string;
  body: string;
  duration: string;
  votes: number;
  comments: number;
  /** A neutral, illustrated thumbnail: never real footage. */
  scene: { icon: IconType; tone: number };
}

/** Neutral synthetic posts: no harmful content is shown or described. */
const POSTS: Post[] = [
  {
    id: "4721",
    author: "riverside_local",
    community: COMMUNITIES[0],
    postedAgo: "2 h",
    flair: "Local news",
    title: "Outside the station last night",
    body: "Filmed this on the way home. Posting so people know what's going on around here.",
    duration: "2:14",
    votes: 48,
    comments: 31,
    scene: { icon: Train, tone: 0 },
  },
  {
    id: "4718",
    author: "weekend.footy",
    community: COMMUNITIES[1],
    postedAgo: "5 h",
    flair: "Match day",
    title: "Highlights from this morning's match",
    body: "Great turnout today. Full-time 3–2, and that last-minute winner!",
    duration: "4:02",
    votes: 212,
    comments: 57,
    scene: { icon: Soccer, tone: 1 },
  },
  {
    id: "4702",
    author: "cityfoodie",
    community: COMMUNITIES[2],
    postedAgo: "1 d",
    flair: "Review",
    title: "New ramen place on Smith St",
    body: "Worth the queue. Get the miso, and go before 6 if you want a seat.",
    duration: "0:48",
    votes: 96,
    comments: 12,
    scene: { icon: Restaurant, tone: 2 },
  },
  {
    id: "4695",
    author: "pedal.power",
    community: COMMUNITIES[3],
    postedAgo: "1 d",
    flair: "Route",
    title: "The new river path is finally open",
    body: "Smooth all the way to the bridge. Lights work at night too.",
    duration: "1:36",
    votes: 154,
    comments: 23,
    scene: { icon: Bicycle, tone: 3 },
  },
];

/** Post titles by ID, for CommunityHub's moderation queue. */
export const POST_TITLES: Record<string, string> = Object.fromEntries(POSTS.map((p) => [p.id, p.title]));

const TRENDING = [
  { topic: "Riverside street festival", community: "Riverside Neighbourhood", posts: "1.2k posts" },
  { topic: "Sunday League finals", community: "Sunday League", posts: "864 posts" },
  { topic: "Best dumplings in town", community: "Eat Local", posts: "530 posts" },
];

const SORTS: { label: string; icon: IconType }[] = [
  { label: "Best", icon: Star },
  { label: "Hot", icon: Fire },
  { label: "New", icon: Time },
];

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

function Avatar({ community, size = 32 }: { community: Community; size?: number }) {
  return (
    <span
      className={`ch-avatar ch-tone-${community.tone}`}
      aria-hidden="true"
      style={{ inlineSize: size, blockSize: size, fontSize: size * 0.36 }}
    >
      {initials(community.name)}
    </span>
  );
}

/**
 * A simulated CommunityHub (B2B flow stage 3): the customer's own social
 * platform, with its own look, so the demo shows RCS working inside someone
 * else's product. CommunityHub's report dialog offers its usual reasons;
 * "Violent or harmful video" is handed to RCS, its safety partner, with the
 * post link attached. Other reasons stay with CommunityHub's own team.
 * Clearly labelled as simulated; every post is neutral and synthetic.
 */
export function CommunityHubPage() {
  const navigate = useNavigate();
  const [reporting, setReporting] = useState<Post | null>(null);
  const [reason, setReason] = useState<Reason | null>(null);
  const [handledLocally, setHandledLocally] = useState<string | null>(null);
  const [sort, setSort] = useState("Best");
  const [votes, setVotes] = useState<Record<string, 1 | -1 | 0>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

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

  function vote(id: string, direction: 1 | -1) {
    setVotes((v) => ({ ...v, [id]: v[id] === direction ? 0 : direction }));
  }

  return (
    <div className="ch-shell">
      <CommunityHubHeader />

      <div className="ch-layout">
        <aside className="ch-side" aria-label="CommunityHub navigation">
          <nav aria-label="Feeds" className="ch-nav">
            <a className="ch-nav-link" href="/communityhub" aria-current="page">
              <Home size={20} aria-hidden="true" />
              Home
            </a>
            <a className="ch-nav-link" href="/communityhub">
              <Fire size={20} aria-hidden="true" />
              Popular
            </a>
            <a className="ch-nav-link" href="/communityhub">
              <Bookmark size={20} aria-hidden="true" />
              Saved
            </a>
          </nav>
          <nav aria-label="Your communities" className="ch-nav">
            <p className="ch-nav-heading">Your communities</p>
            {COMMUNITIES.map((c) => (
              <a key={c.slug} className="ch-nav-link" href="/communityhub">
                <Avatar community={c} size={24} />
                {c.name}
              </a>
            ))}
          </nav>
        </aside>

        <main className="ch-feed" aria-labelledby="feed-title">
          <div className="ch-feed-top">
            <h1 id="feed-title" className="ch-feed-title">
              Home
            </h1>
            <div className="ch-sorts" role="group" aria-label="Sort posts">
              {SORTS.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className="ch-chip"
                  aria-pressed={sort === label}
                  onClick={() => setSort(label)}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="ch-demo-note">
            A stand-in for CommunityHub. Use <strong>Report</strong> on a post to see how a harmful-video report reaches
            RCS.
          </p>

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

          <ul className="ch-posts" aria-label="Posts">
            {POSTS.map((post) => {
              const myVote = votes[post.id] ?? 0;
              const Scene = post.scene.icon;
              return (
                <li key={post.id}>
                  <article className="ch-card ch-post" aria-labelledby={`post-${post.id}`}>
                    <header className="ch-post-meta">
                      <Avatar community={post.community} />
                      <div className="ch-post-meta-text">
                        <span className="ch-post-community">{post.community.name}</span>
                        <span className="ch-muted">
                          u/{post.author} · {post.postedAgo}
                        </span>
                      </div>
                      <span className={`ch-flair ch-tone-${post.community.tone}`}>{post.flair}</span>
                    </header>

                    <h2 id={`post-${post.id}`} className="ch-post-title">
                      {post.title}
                    </h2>
                    <p className="ch-post-body">{post.body}</p>

                    {/* An illustrated placeholder, never real footage. */}
                    <div
                      className={`ch-media ch-scene-${post.scene.tone}`}
                      role="img"
                      aria-label={`Video, ${post.duration} (illustration)`}
                    >
                      <span className="ch-media-scene" aria-hidden="true">
                        <Scene size={96} aria-hidden="true" />
                      </span>
                      <span className="ch-media-play" aria-hidden="true">
                        <PlayFilledAlt size={28} aria-hidden="true" />
                      </span>
                      <span className="ch-media-time" aria-hidden="true">
                        {post.duration}
                      </span>
                    </div>

                    <div className="ch-actions">
                      <div className="ch-votes" role="group" aria-label={`Votes: ${post.votes + myVote}`}>
                        <button
                          type="button"
                          className="ch-vote"
                          aria-label="Upvote"
                          aria-pressed={myVote === 1}
                          onClick={() => vote(post.id, 1)}
                        >
                          <ArrowUp size={16} aria-hidden="true" />
                        </button>
                        <span className="ch-vote-count" aria-hidden="true">
                          {post.votes + myVote}
                        </span>
                        <button
                          type="button"
                          className="ch-vote"
                          aria-label="Downvote"
                          aria-pressed={myVote === -1}
                          onClick={() => vote(post.id, -1)}
                        >
                          <ArrowDown size={16} aria-hidden="true" />
                        </button>
                      </div>
                      <button type="button" className="ch-action">
                        <Chat size={16} aria-hidden="true" />
                        {post.comments} comments
                      </button>
                      <button type="button" className="ch-action">
                        <Share size={16} aria-hidden="true" />
                        Share
                      </button>
                      <button
                        type="button"
                        className="ch-action"
                        aria-pressed={Boolean(saved[post.id])}
                        onClick={() => setSaved((s) => ({ ...s, [post.id]: !s[post.id] }))}
                      >
                        <Bookmark size={16} aria-hidden="true" />
                        {saved[post.id] ? "Saved" : "Save"}
                      </button>
                      <button
                        type="button"
                        className="ch-action ch-action--report"
                        onClick={() => openReport(post)}
                        aria-label={`Report "${post.title}"`}
                      >
                        <Flag size={16} aria-hidden="true" />
                        Report
                      </button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </main>

        <aside className="ch-side ch-side--right" aria-label="About CommunityHub">
          <section className="ch-card ch-about" aria-labelledby="about-title">
            <div className="ch-about-banner" aria-hidden="true" />
            <div className="ch-about-body">
              <h2 id="about-title" className="ch-card-title">
                About CommunityHub
              </h2>
              <p className="ch-muted">Local communities, sport, food and everything in between.</p>
              <dl className="ch-stats">
                <div>
                  <dt className="ch-muted">Members</dt>
                  <dd>1.2M</dd>
                </div>
                <div>
                  <dt className="ch-muted">Online now</dt>
                  <dd>
                    <span className="ch-online-dot" aria-hidden="true" />
                    18.4k
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="ch-card ch-panel" aria-labelledby="trending-title">
            <h2 id="trending-title" className="ch-card-title">
              Trending today
            </h2>
            <ol className="ch-trending">
              {TRENDING.map((t, i) => (
                <li key={t.topic}>
                  <span className="ch-trending-rank" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="ch-trending-text">
                    <span className="ch-trending-topic">{t.topic}</span>
                    <span className="ch-muted">
                      {t.community} · {t.posts}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="ch-card ch-panel" aria-labelledby="safety-title">
            <h2 id="safety-title" className="ch-card-title">
              <Sprout size={20} aria-hidden="true" />
              Safety on CommunityHub
            </h2>
            <p className="ch-muted">
              Reports of violent or harmful video are reviewed by RCS, our independent safety partner. Trained reviewers
              make every decision; we decide what action to take.
            </p>
          </section>

          <p className="ch-footer">CommunityHub · Help · Terms · Privacy · Simulated for the RCS demo</p>
        </aside>
      </div>

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
    </div>
  );
}
