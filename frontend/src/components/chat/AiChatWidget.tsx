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
    "How many cases are open today?",
    "What does SOS mean?",
  ],
  auditor: [
    "How many cases do I have?",
    "What is my exposure today?",
    "What happens if I decline a case?",
  ],
};

export function AiChatWidget() {
  const { token, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--cds-interactive, #0f62fe)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: 22,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {open ? "✕" : "✦"}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 88,
            right: 24,
            zIndex: 9000,
            width: 360,
            maxHeight: 520,
            display: "flex",
            flexDirection: "column",
            background: "var(--cds-layer-01, #f4f4f4)",
            border: "1px solid var(--cds-border-subtle-01, #e0e0e0)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "var(--cds-interactive, #0f62fe)",
              color: "#fff",
              padding: "12px 16px",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ✦ AI Buddy
            <span style={{ fontWeight: 400, fontSize: 12, marginLeft: 8, opacity: 0.85 }}>
              — preliminary feature
            </span>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
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

            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  background:
                    m.role === "user"
                      ? "var(--cds-interactive, #0f62fe)"
                      : "var(--cds-layer-02, #fff)",
                  color: m.role === "user" ? "#fff" : "var(--cds-text-primary)",
                  border: m.role === "assistant" ? "1px solid var(--cds-border-subtle-01, #e0e0e0)" : "none",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 13,
                  lineHeight: "18px",
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
              padding: 8,
              gap: 6,
              background: "var(--cds-layer-01, #f4f4f4)",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
              placeholder="Ask a question…"
              disabled={loading}
              style={{
                flex: 1,
                border: "1px solid var(--cds-border-subtle-01, #e0e0e0)",
                borderRadius: 4,
                padding: "6px 10px",
                fontSize: 13,
                background: "var(--cds-layer-02, #fff)",
                color: "var(--cds-text-primary)",
                outline: "none",
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              style={{
                background: "var(--cds-interactive, #0f62fe)",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "6px 12px",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                fontSize: 13,
                opacity: loading || !input.trim() ? 0.5 : 1,
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
