import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Column,
  Grid,
  Header,
  HeaderGlobalBar,
  HeaderName,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  Tag,
  Theme,
} from "@carbon/react";

interface Post {
  id: string;
  author: string;
  group: string;
  postedAgo: string;
  text: string;
  duration: string;
}

/** Neutral synthetic posts: no harmful content is depicted or described. */
const POSTS: Post[] = [
  {
    id: "4721",
    author: "riverside_local",
    group: "Riverside Neighbourhood",
    postedAgo: "2 h",
    text: "Video from outside the station last night.",
    duration: "2:14",
  },
  {
    id: "4718",
    author: "weekend.footy",
    group: "Sunday League",
    postedAgo: "5 h",
    text: "Highlights from this morning's match.",
    duration: "4:02",
  },
  {
    id: "4702",
    author: "cityfoodie",
    group: "Eat Local",
    postedAgo: "1 d",
    text: "New ramen place on Smith St. Worth the queue.",
    duration: "0:48",
  },
];

const postUrl = (id: string) => `https://communityhub.example/post/${id}`;

/**
 * A simulated CommunityHub page (B2B flow stage 3, "Public reports harmful
 * content"). It stands in for the customer's own platform, only to show
 * where the RCS report button lives and what happens when someone presses
 * it: a short handoff explanation, then the RCS reporting page with the post
 * link already attached. Clearly labelled as simulated.
 */
export function CommunityHubPage() {
  const navigate = useNavigate();
  const [reporting, setReporting] = useState<Post | null>(null);

  return (
    <>
      <Theme theme="g100">
        <Header aria-label="CommunityHub (simulated)">
          <HeaderName href="/communityhub" prefix="">
            CommunityHub
          </HeaderName>
          <HeaderGlobalBar className="items-center pr-4 sm:pr-6">
            <Tag type="gray" size="md" style={{ margin: 0, whiteSpace: "nowrap" }}>
              Simulated customer platform
            </Tag>
          </HeaderGlobalBar>
        </Header>
      </Theme>
      <main style={{ paddingTop: 48 + 32, paddingBottom: 64, backgroundColor: "var(--cds-layer-01)", minHeight: "100vh" }}>
        <Grid>
          <Column sm={4} md={8} lg={{ span: 8, offset: 4 }} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="rcs-page-title">Your feed</h1>
              <p className="rcs-page-subtitle">
                Demo stand-in for CommunityHub. Open the menu on a post and choose Report harmful content.
              </p>
            </div>
            <ul className="flex flex-col gap-4" aria-label="Posts">
              {POSTS.map((post) => (
                <li key={post.id}>
                  <article className="rcs-section" aria-label={`Post by ${post.author}`} style={{ gap: "1rem" }}>
                    <header className="flex items-start justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="rcs-subheading">{post.author}</span>
                        <span className="rcs-helper">
                          {post.group} · {post.postedAgo}
                        </span>
                      </div>
                      <OverflowMenu flipped aria-label={`More options for ${post.author}'s post`} iconDescription={`More options for ${post.author}'s post`}>
                        <OverflowMenuItem itemText="Save post" />
                        <OverflowMenuItem itemText="Copy link" />
                        <OverflowMenuItem itemText="Report harmful content" hasDivider onClick={() => setReporting(post)} />
                      </OverflowMenu>
                    </header>
                    <p className="rcs-body">{post.text}</p>
                    {/* A neutral placeholder, never real footage. */}
                    <div
                      className="flex items-end justify-between"
                      style={{
                        blockSize: 220,
                        backgroundColor: "var(--cds-layer-accent-01)",
                        padding: "0.75rem",
                      }}
                      role="img"
                      aria-label={`Video, ${post.duration} (placeholder)`}
                    >
                      <span className="rcs-helper">Video (placeholder)</span>
                      <span className="rcs-mono rcs-helper">{post.duration}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button kind="ghost" size="sm">
                        Like
                      </Button>
                      <Button kind="ghost" size="sm">
                        Comment
                      </Button>
                      <Button kind="ghost" size="sm" onClick={() => setReporting(post)}>
                        Report
                      </Button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </Column>
        </Grid>
      </main>

      <Modal
        open={reporting !== null}
        modalHeading="Report harmful content"
        modalLabel="CommunityHub"
        primaryButtonText="Continue to report"
        secondaryButtonText="Cancel"
        onRequestClose={() => setReporting(null)}
        onRequestSubmit={() => {
          if (!reporting) return;
          const params = new URLSearchParams({ from: "communityhub", source: postUrl(reporting.id) });
          navigate(`/?${params.toString()}`);
        }}
      >
        <div className="flex flex-col gap-4">
          <p className="rcs-body">
            Reports about harmful video are reviewed by RCS, CommunityHub&apos;s independent review service. Trained
            reviewers make every decision.
          </p>
          <ul className="flex flex-col gap-2" style={{ listStyle: "disc", paddingInlineStart: "1.25rem" }}>
            <li className="rcs-body">You don&apos;t need an account, and you can stay anonymous.</li>
            <li className="rcs-body">We&apos;ll attach this post&apos;s link for you.</li>
            <li className="rcs-body">You&apos;ll get a case ID to check progress.</li>
          </ul>
        </div>
      </Modal>
    </>
  );
}
