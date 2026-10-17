import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { aiChat } from "../../services/api/httpClient";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTED: Record<string, string[]> = {
  manager: [
    "What needs my attention right now?",
    "How many open SOS alerts are there?",
    "How many cases are awaiting reassignment?",
    "What does a failed delivery mean?",
  ],
  auditor: [
    "What is my exposure today?",
    "What happens when I reach my exposure limit?",
    "What is the difference between SOS and a wellbeing check-in?",
    "What happens if I disagree with the AI severity?",
  ],
};

const STORAGE_KEY = "rcs_ai_buddy_messages";

export function AiChatWidget() {
  const { token, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as Message[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    if (!token || !text.trim() || loading) return;
    const userMsg: Message = { role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await aiChat(text.trim(), token);
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I couldn't reach the AI service. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = SUGGESTED[role ?? "auditor"] ?? SUGGESTED.auditor;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="AI buddy"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9000,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--cds-background-inverse, #161616)",
          color: "var(--cds-text-inverse, #ffffff)",
          border: "none",
          cursor: "pointer",
          fontSize: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ✦
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 84,
            right: 24,
            zIndex: 9000,
            width: 360,
            maxHeight: 520,
            display: "flex",
            flexDirection: "column",
            background: "var(--cds-background, #ffffff)",
            border: "1px solid var(--cds-border-subtle-01, #e0e0e0)",
            borderRadius: 0,
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "var(--cds-background-inverse, #161616)",
              color: "var(--cds-text-inverse, #ffffff)",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.01em",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>✦</span>
              AI Buddy
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close AI Buddy"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--cds-text-inverse, #ffffff)",
                cursor: "pointer",
                fontSize: 16,
                opacity: 0.7,
                padding: "2px 4px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              background: "var(--cds-background, #ffffff)",
            }}
          >
            {messages.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--cds-text-secondary)", marginBottom: 4 }}>
                Ask me anything about RCS.
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      style={{
                        textAlign: "left",
                        background: "var(--cds-layer-02, #fff)",
                        border: "1px solid var(--cds-border-subtle-01, #e0e0e0)",
                        borderRadius: 4,
                        padding: "6px 10px",
                        fontSize: 12,
                        cursor: "pointer",
                        color: "var(--cds-text-primary)",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.length > 0 && showSuggestions && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 }}>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { send(s); setShowSuggestions(false); }}
                    style={{
                      textAlign: "left",
                      background: "var(--cds-layer-02, #fff)",
                      border: "1px solid var(--cds-border-subtle-01, #e0e0e0)",
                      borderRadius: 4,
                      padding: "6px 10px",
                      fontSize: 12,
                      cursor: "pointer",
                      color: "var(--cds-text-primary)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  background:
                    m.role === "user"
                      ? "var(--cds-background-inverse, #161616)"
                      : "var(--cds-layer-01, #f4f4f4)",
                  color: m.role === "user" ? "var(--cds-text-inverse, #ffffff)" : "var(--cds-text-primary, #161616)",
                  border: m.role === "assistant" ? "1px solid var(--cds-border-subtle-01, #e0e0e0)" : "none",
                  borderRadius: 2,
                  padding: "8px 12px",
                  fontSize: 13,
                  lineHeight: "20px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.text}
              </div>
            ))}

            {loading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  fontSize: 13,
                  color: "var(--cds-text-secondary)",
                  padding: "4px 8px",
                }}
              >
                Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            style={{
              borderTop: "1px solid var(--cds-border-subtle-01, #e0e0e0)",
              display: "flex",
              alignItems: "stretch",
              background: "var(--cds-layer-01, #f4f4f4)",
            }}
          >
            {messages.length > 0 && (
              <button
                onClick={() => setShowSuggestions((v) => !v)}
                title="Suggested questions"
                aria-label="Show suggested questions"
                style={{
                  background: showSuggestions ? "var(--cds-background-inverse, #161616)" : "transparent",
                  color: showSuggestions ? "var(--cds-text-inverse, #ffffff)" : "var(--cds-text-secondary, #525252)",
                  border: "none",
                  borderRight: "1px solid var(--cds-border-subtle-01, #e0e0e0)",
                  padding: "0 12px",
                  cursor: "pointer",
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                ?
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
              placeholder="Ask a question…"
              disabled={loading}
              style={{
                flex: 1,
                border: "none",
                padding: "12px",
                fontSize: 13,
                background: "transparent",
                color: "var(--cds-text-primary, #161616)",
                outline: "none",
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() ? "var(--cds-button-disabled, #c6c6c6)" : "var(--cds-background-inverse, #161616)",
                color: "var(--cds-text-inverse, #ffffff)",
                border: "none",
                borderLeft: "1px solid var(--cds-border-subtle-01, #e0e0e0)",
                padding: "0 16px",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
