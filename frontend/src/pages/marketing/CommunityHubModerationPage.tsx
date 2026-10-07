import { useState, type FormEvent } from "react";
import { InlineNotification, Modal, TextArea } from "@carbon/react";
import { CommunityHubHeader } from "../../components/communityhub/CommunityHubHeader";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { clientListCaseResults, clientRecordPlatformAction } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE, type CaseResult, type PlatformAction } from "../../services/types";
import { canSee, useClientAuth } from "../../hooks/useClientAuth";
import { useClientQuery } from "../../hooks/useClientQuery";
import { isMockData } from "../../services";
import { DEMO_PASSWORD } from "../../services/mock/seed";
import { PAYLOAD_OUTCOME_LABEL, PLATFORM_ACTION_LABEL } from "../../design-tokens/deliveryLabels";
import { POST_TITLES } from "./CommunityHubPage";

const when = (iso: string) =>
  new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const postId = (url: string | null) => url?.match(/post\/([\w-]+)/)?.[1] ?? null;

/** What CommunityHub suggests, from RCS's outcome. The moderator still decides. */
function suggested(outcome: CaseResult["outcome"]): string {
  if (outcome === "POLICY_VIOLATION_FOUND") return "RCS found a policy violation. Removing the post is usual.";
  if (outcome === "NO_VIOLATION_FOUND") return "RCS found no violation. Keeping the post is usual.";
  return "RCS closed this report without a decision. Decide using your own policy.";
}

/**
 * CommunityHub › Moderation queue (simulated): CommunityHub's own tool,
 * where results from RCS arrive automatically. RCS decides whether a post
 * broke policy; CommunityHub's Trust & Safety team decides what happens to it,
 * and that action is sent back to RCS. Reads and writes go through the real
 * case-results endpoints; only this page's look is simulated.
 */
export function CommunityHubModerationPage() {
  const { session, login, logout } = useClientAuth();
  const allowed = canSee(session?.role, "cases");

  return (
    <div className="ch-shell">
      <CommunityHubHeader />
      <div className="ch-mod-layout">
        {allowed ? (
          <ModerationQueue moderator={session!.displayName} onSignOut={logout} />
        ) : (
          <ModerationSignIn signedInAs={session?.displayName ?? null} login={login} onSignOut={logout} />
        )}
      </div>
    </div>
  );
}

function ModerationSignIn({
  signedInAs,
  login,
  onSignOut,
}: {
  signedInAs: string | null;
  login: (userId: string, password: string) => Promise<void>;
  onSignOut: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(userId.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "That user ID or password isn't right." : NETWORK_ERROR_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="ch-card ch-mod-signin" aria-labelledby="mod-signin-title">
      <h1 id="mod-signin-title" className="ch-feed-title">
        Moderation
      </h1>
      {signedInAs ? (
        <>
          <p className="ch-muted">
            You&apos;re signed in as {signedInAs}, whose account doesn&apos;t include moderation. Sign out and sign in with
            a Trust &amp; Safety account.
          </p>
          <button type="button" className="ch-button ch-button--primary" onClick={onSignOut}>
            Sign out
          </button>
        </>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <p className="ch-muted">For CommunityHub&apos;s Trust &amp; Safety team. Sign in with your CommunityHub account.</p>
          {isMockData && (
            <p className="ch-demo-note">
              Demo: <strong>ch-mod-04</strong>, password {DEMO_PASSWORD}
            </p>
          )}
          <label className="ch-field">
            <span>User ID</span>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} autoComplete="username" required />
          </label>
          <label className="ch-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p role="alert" className="ch-field-error">
              {error}
            </p>
          )}
          <button type="submit" className="ch-button ch-button--primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}
    </main>
  );
}

function ModerationQueue({ moderator, onSignOut }: { moderator: string; onSignOut: () => void }) {
  const { token } = useClientAuth();
  const { data, error, reload } = useClientQuery(clientListCaseResults);
  const [tab, setTab] = useState<"todo" | "done">("todo");
  const [confirming, setConfirming] = useState<{ result: CaseResult; action: PlatformAction["action"] } | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const delivered = (data ?? []).filter((r) => r.status === "DELIVERED");
  const todo = delivered.filter((r) => !r.platform_action);
  const done = delivered.filter((r) => r.platform_action);
  const shown = tab === "todo" ? todo : done;

  async function confirm() {
    if (!token || !confirming) return;
    setSaving(true);
    setSaveError(null);
    try {
      await clientRecordPlatformAction(confirming.result.delivery_id, token, confirming.action, note);
      setNotice(`${PLATFORM_ACTION_LABEL[confirming.action]}. RCS has been told.`);
      setConfirming(null);
      setNote("");
      reload();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="ch-feed" aria-labelledby="mod-title">
      <div className="ch-feed-top">
        <div>
          <h1 id="mod-title" className="ch-feed-title">
            Moderation queue
          </h1>
          <p className="ch-muted">
            Results from RCS, our safety partner. RCS decides whether a post broke policy; you decide what happens to
            it. Signed in as {moderator} ·{" "}
            <button type="button" className="ch-text-button" onClick={onSignOut}>
              Sign out
            </button>
          </p>
        </div>
        <div className="ch-sorts" role="group" aria-label="Show">
          <button type="button" className="ch-chip" aria-pressed={tab === "todo"} onClick={() => setTab("todo")}>
            Needs action ({todo.length})
          </button>
          <button type="button" className="ch-chip" aria-pressed={tab === "done"} onClick={() => setTab("done")}>
            Done ({done.length})
          </button>
        </div>
      </div>

      {notice && (
        <InlineNotification
          kind="success"
          lowContrast
          role="status"
          title={notice}
          onClose={() => setNotice(null)}
          style={{ maxWidth: "100%" }}
        />
      )}
      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          role="alert"
          title="Couldn't load the queue."
          subtitle={error.message}
          style={{ maxWidth: "100%" }}
        />
      )}
      {data && shown.length === 0 && (
        <p className="ch-demo-note">
          {tab === "todo" ? "Nothing waiting. New results from RCS appear here automatically." : "Nothing actioned yet."}
        </p>
      )}

      <ul className="ch-posts" aria-label={tab === "todo" ? "Results needing action" : "Actioned results"}>
        {shown.map((r) => {
          const id = postId(r.post_url);
          const title = (id && POST_TITLES[id]) || (id ? `Post ${id}` : "Post link not attached");
          const violation = r.outcome === "POLICY_VIOLATION_FOUND";
          return (
            <li key={r.delivery_id}>
              <article className="ch-card ch-post" aria-labelledby={`res-${r.delivery_id}`}>
                <header className="ch-post-meta">
                  <span className={`ch-flair ${violation ? "ch-flag-violation" : "ch-flag-neutral"}`} style={{ marginInlineStart: 0 }}>
                    RCS: {PAYLOAD_OUTCOME_LABEL[r.outcome]}
                  </span>
                  {r.final_severity && <SeverityTag tier={r.final_severity} size="sm" />}
                  <span className="ch-muted" style={{ marginInlineStart: "auto" }}>
                    Received {r.delivered_at ? when(r.delivered_at) : "—"}
                  </span>
                </header>
                <h2 id={`res-${r.delivery_id}`} className="ch-post-title">
                  {title}
                </h2>
                <p className="ch-muted">
                  {r.post_url ? (
                    <a href={r.post_url} target="_blank" rel="noreferrer" className="ch-link">
                      {r.post_url}
                    </a>
                  ) : (
                    "The reporter didn't attach a post link."
                  )}{" "}
                  · RCS case <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{r.case_id}</span>
                </p>
                {r.platform_action ? (
                  <p className="ch-post-body">
                    <strong>{PLATFORM_ACTION_LABEL[r.platform_action.action]}</strong> by {r.platform_action.by},{" "}
                    {when(r.platform_action.at)}
                    {r.platform_action.note ? ` — “${r.platform_action.note}”` : ""}
                  </p>
                ) : (
                  <>
                    <p className="ch-post-body">{suggested(r.outcome)}</p>
                    <div className="ch-actions" style={{ paddingBlockEnd: 8 }}>
                      <button
                        type="button"
                        className="ch-button ch-button--danger"
                        onClick={() => setConfirming({ result: r, action: "REMOVED" })}
                      >
                        Remove post
                      </button>
                      <button
                        type="button"
                        className="ch-button ch-button--outline"
                        onClick={() => setConfirming({ result: r, action: "KEPT" })}
                      >
                        Keep post
                      </button>
                    </div>
                  </>
                )}
              </article>
            </li>
          );
        })}
      </ul>

      <Modal
        open={confirming !== null}
        danger={confirming?.action === "REMOVED"}
        modalLabel="CommunityHub moderation"
        modalHeading={confirming?.action === "REMOVED" ? "Remove this post?" : "Keep this post?"}
        primaryButtonText={saving ? "Saving…" : confirming?.action === "REMOVED" ? "Remove post" : "Keep post"}
        primaryButtonDisabled={saving}
        secondaryButtonText="Cancel"
        onRequestClose={() => setConfirming(null)}
        onRequestSubmit={() => void confirm()}
      >
        <div className="flex flex-col gap-4">
          <p style={{ fontSize: 14 }}>
            {confirming?.action === "REMOVED"
              ? "The post is taken down for everyone. Your action is sent to RCS for their records."
              : "The post stays up. Your action is sent to RCS for their records."}
          </p>
          <TextArea
            id="moderation-note"
            labelText="Note for the record (optional)"
            rows={3}
            maxCount={300}
            enableCounter
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {saveError && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              role="alert"
              title="That didn't save."
              subtitle={saveError}
              style={{ maxWidth: "100%" }}
            />
          )}
        </div>
      </Modal>
    </main>
  );
}
