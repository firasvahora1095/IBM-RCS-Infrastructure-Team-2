import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Link as RouterLink } from "react-router-dom";
import {
  Button,
  DefinitionTooltip,
  HeaderGlobalAction,
  IconButton,
  InlineLoading,
  InlineNotification,
  Link,
  Tag,
  TextArea,
} from "@carbon/react";
import { Chat, Close, Send } from "@carbon/icons-react";
import { useAuth } from "../../hooks/useAuth";
import type { BuddyCaseSummary } from "../../services/types";
import { CASE_LOOKUP_PROMPT, suggestedQuestions } from "./buddyQuestions";
import { useBuddyConversation, type BuddyMessage } from "./useBuddyConversation";

const CASE_FIELDS: { key: keyof BuddyCaseSummary; label: string; empty: string }[] = [
  { key: "status", label: "Status", empty: "Not available" },
  { key: "ai_severity", label: "AI severity", empty: "Not yet assessed" },
  { key: "final_auditor_severity", label: "Final Auditor severity", empty: "Not yet set" },
  { key: "assigned_auditor", label: "Assigned Auditor", empty: "Unassigned" },
  { key: "final_outcome", label: "Final outcome", empty: "Not yet set" },
  { key: "delivery_status", label: "Delivery", empty: "Not applicable" },
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

/** Only the fields this person's role was sent are shown; a missing field is never listed as empty. */
function CaseSummary({ summary }: { summary: BuddyCaseSummary }) {
  const rows = CASE_FIELDS.filter((f) => f.key in summary);
  return (
    <dl className="rcs-buddy__case" aria-label={`Summary of ${summary.case_id}`}>
      {rows.map((f) => {
        const value = summary[f.key];
        return (
          <div key={f.key} style={{ display: "contents" }}>
            <dt>{f.label}</dt>
            <dd>{value ?? f.empty}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function BuddyBubble({ message, onNavigate }: { message: BuddyMessage; onNavigate: () => void }) {
  if (message.role === "user") {
    return (
      <div className="rcs-buddy__msg rcs-buddy__msg--user">
        <span className="cds--visually-hidden">You asked: </span>
        {message.text}
      </div>
    );
  }
  const reply = message.reply;
  if (reply?.fallback) {
    return (
      <InlineNotification
        kind="info"
        lowContrast
        hideCloseButton
        statusIconDescription="Information"
        title="Not enough verified information"
        subtitle={reply.reply}
        style={{ maxInlineSize: "100%", marginBlockEnd: 0 }}
      />
    );
  }
  return (
    <div className="rcs-buddy__msg rcs-buddy__msg--buddy">
      <span className="cds--visually-hidden">AI Buddy said: </span>
      {message.text}
      {reply?.case && <CaseSummary summary={reply.case} />}
      {reply?.live_as_of && <p className="rcs-buddy__caption">Live data, read at {formatTime(reply.live_as_of)}</p>}
      {reply && reply.links.length > 0 && (
        <div className="rcs-buddy__links">
          {reply.links.map((link) => (
            <Link key={link.to} as={RouterLink} to={link.to} onClick={onNavigate}>
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The AI Buddy: a header button that opens a side panel of read-only guidance
 * for Auditors and Managers (Sprint 3 extra feature, docs/ux/ai-buddy-handoff.md).
 *
 * It explains RCS rules, reads a few live figures and shows one compact case
 * summary. It never changes anything: "AI Buddy guides. People decide."
 *
 * The panel is not modal, so the person keeps working. On wide screens the page
 * makes room for it (see index.scss) so it can't cover SOS.
 */
export function AiBuddy() {
  const { token, role, isSuperAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { messages, loading, send, retry, clear } = useBuddyConversation(token);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const [announcement, setAnnouncement] = useState("");
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);

  // Make room for the panel on wide screens; always undo it on close or unmount.
  useEffect(() => {
    if (!open) return;
    document.documentElement.setAttribute("data-ai-buddy", "open");
    return () => document.documentElement.removeAttribute("data-ai-buddy");
  }, [open]);

  // Focus moves into the panel on open and back to the button on close (WCAG 2.4.3).
  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      wasOpen.current = true;
      return () => cancelAnimationFrame(frame);
    }
    if (wasOpen.current) {
      triggerRef.current?.focus();
      wasOpen.current = false;
    }
  }, [open]);

  // New answers are announced once, politely. The log itself is not a live region.
  const lastId = messages[messages.length - 1]?.id;
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "assistant") {
      setAnnouncement(last.failed ? "AI Buddy could not answer. You can try again." : last.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId]);

  useEffect(() => {
    if (open && typeof logEndRef.current?.scrollIntoView === "function") {
      logEndRef.current.scrollIntoView({ block: "end" });
    }
  }, [open, lastId, loading]);

  if (!role || !token) return null;

  function submit() {
    if (!draft.trim()) return;
    send(draft);
    setDraft("");
    setAnnouncement("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
    }
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  const failed = messages[messages.length - 1]?.failed === true;
  const empty = messages.length === 0;

  return (
    <>
      <HeaderGlobalAction
        ref={triggerRef}
        aria-label={open ? "Close AI Buddy" : "Open AI Buddy"}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        isActive={open}
        tooltipAlignment="end"
        onClick={() => setOpen((v) => !v)}
      >
        <Chat size={20} />
      </HeaderGlobalAction>

      {open &&
        createPortal(
          <aside id={panelId} className="rcs-buddy" aria-label="AI Buddy" onKeyDown={onKeyDown}>
            <div className="rcs-buddy__head">
              <h2 className="rcs-buddy__title">AI Buddy</h2>
              <DefinitionTooltip definition="AI-generated. Check before acting." openOnHover align="bottom-end">
                <Tag type="gray" size="sm">
                  Beta
                </Tag>
              </DefinitionTooltip>
              <IconButton label="Close AI Buddy" kind="ghost" size="md" align="bottom-end" onClick={() => setOpen(false)}>
                <Close />
              </IconButton>
            </div>

            <div className="rcs-buddy__log">
              {!noticeDismissed && (
                <InlineNotification
                  kind="info"
                  lowContrast
                  title="Early version."
                  subtitle="I can make mistakes, so check anything important on the screen I point to."
                  statusIconDescription="Information"
                  onCloseButtonClick={() => setNoticeDismissed(true)}
                  style={{ maxInlineSize: "100%", marginBlockEnd: 0 }}
                />
              )}
              {empty && (
                <div>
                  <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>How can I help?</p>
                  <p style={{ fontSize: 14, color: "var(--cds-text-secondary)", margin: "0.5rem 0 1rem" }}>
                    I can explain RCS rules, your limits and your cases. You make the final call.
                  </p>
                  <div className="rcs-buddy__suggestions">
                    {suggestedQuestions(role, isSuperAdmin).map((question) => (
                      <Button
                        key={question}
                        kind="tertiary"
                        size="md"
                        disabled={loading}
                        onClick={() => {
                          if (question === CASE_LOOKUP_PROMPT) {
                            setDraft("What is happening with ");
                            inputRef.current?.focus();
                          } else {
                            send(question);
                          }
                        }}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) =>
                m.failed ? (
                  <InlineNotification
                    key={m.id}
                    kind="error"
                    lowContrast
                    hideCloseButton
                    statusIconDescription="Error"
                    title="Couldn't answer"
                    subtitle="AI Buddy is unavailable right now."
                    style={{ maxInlineSize: "100%", marginBlockEnd: 0 }}
                  />
                ) : (
                  <BuddyBubble key={m.id} message={m} onNavigate={() => setOpen(false)} />
                ),
              )}

              {failed && (
                <div>
                  <Button kind="tertiary" size="sm" onClick={retry}>
                    Try again
                  </Button>
                </div>
              )}

              {loading && <InlineLoading description="Looking that up…" status="active" />}
              <div ref={logEndRef} />
            </div>

            {/* Announces each new answer once, without making the whole log a live region. */}
            <div role="status" aria-live="polite" className="cds--visually-hidden">
              {announcement}
            </div>

            <div className="rcs-buddy__foot">
              <div className="rcs-buddy__input-row">
                <TextArea
                  ref={inputRef}
                  id={`${panelId}-input`}
                  labelText="Ask AI Buddy"
                  hideLabel
                  placeholder="Ask about a case or a rule"
                  rows={2}
                  maxLength={2000}
                  value={draft}
                  disabled={loading}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onInputKeyDown}
                />
                <IconButton
                  label="Send"
                  kind="primary"
                  size="lg"
                  align="top-end"
                  disabled={loading || !draft.trim()}
                  onClick={submit}
                >
                  <Send />
                </IconButton>
              </div>
              <div className="rcs-buddy__meta">
                <span>I can explain and look things up. I can&apos;t take actions.</span>
                {confirmingClear ? (
                  <span className="rcs-buddy__confirm">
                    <Button
                      kind="danger--ghost"
                      size="sm"
                      onClick={() => {
                        clear();
                        setConfirmingClear(false);
                      }}
                    >
                      Clear
                    </Button>
                    <Button kind="ghost" size="sm" onClick={() => setConfirmingClear(false)}>
                      Keep
                    </Button>
                  </span>
                ) : (
                  <Button kind="ghost" size="sm" disabled={empty && !loading} onClick={() => setConfirmingClear(true)}>
                    Clear conversation
                  </Button>
                )}
              </div>
            </div>
          </aside>,
          document.body,
        )}
    </>
  );
}
