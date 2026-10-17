import { useCallback, useEffect, useRef, useState } from "react";
import { aiChat } from "../../services";
import type { BuddyReply, BuddyTurn } from "../../services/types";

/** sessionStorage, not localStorage: staff may ask about wellbeing, so it ends with the tab and with sign-out. */
export const BUDDY_STORAGE_KEY = "rcs_ai_buddy_messages";
const MAX_STORED = 30;
/** How many earlier turns go back to the server so a follow-up makes sense. */
const HISTORY_TURNS = 6;

export interface BuddyMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** The structured reply (live time, case summary, links), for assistant messages. */
  reply?: BuddyReply;
  /** The request failed; `text` is the question that can be tried again. */
  failed?: boolean;
}

function load(): BuddyMessage[] {
  try {
    // An earlier build kept the conversation in localStorage; don't leave it behind.
    localStorage.removeItem(BUDDY_STORAGE_KEY);
  } catch {
    // Storage can be blocked; the Buddy still works without it.
  }
  try {
    const saved = sessionStorage.getItem(BUDDY_STORAGE_KEY);
    const parsed = saved ? (JSON.parse(saved) as BuddyMessage[]) : [];
    return Array.isArray(parsed) ? parsed.filter((m) => !m.failed) : [];
  } catch {
    return [];
  }
}

export function clearBuddyConversation(): void {
  try {
    sessionStorage.removeItem(BUDDY_STORAGE_KEY);
    localStorage.removeItem(BUDDY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

let counter = 0;
const nextId = () => `m${Date.now().toString(36)}${(counter++).toString(36)}`;

export function useBuddyConversation(token: string | null) {
  const [messages, setMessages] = useState<BuddyMessage[]>(load);
  const [loading, setLoading] = useState(false);
  // Bumped on clear, so an answer that arrives after "Clear conversation" is dropped.
  const generation = useRef(0);

  useEffect(() => {
    try {
      sessionStorage.setItem(BUDDY_STORAGE_KEY, JSON.stringify(messages.filter((m) => !m.failed).slice(-MAX_STORED)));
    } catch {
      // ignore
    }
  }, [messages]);

  const ask = useCallback(
    async (text: string, previous: BuddyMessage[]) => {
      if (!token) return;
      const gen = generation.current;
      const history: BuddyTurn[] = previous
        .filter((m) => !m.failed)
        .slice(-HISTORY_TURNS)
        .map((m) => ({ role: m.role, text: m.text }));
      setLoading(true);
      try {
        const reply = await aiChat(text, token, history);
        if (gen !== generation.current) return;
        setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: reply.reply, reply }]);
      } catch {
        if (gen !== generation.current) return;
        setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text, failed: true }]);
      } finally {
        if (gen === generation.current) setLoading(false);
      }
    },
    [token],
  );

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || loading || !token) return;
      const userMessage: BuddyMessage = { id: nextId(), role: "user", text };
      const previous = messages;
      setMessages([...previous, userMessage]);
      void ask(text, previous);
    },
    [ask, loading, messages, token],
  );

  const retry = useCallback(() => {
    const last = messages[messages.length - 1];
    if (!last?.failed || loading) return;
    const previous = messages.slice(0, -1);
    setMessages(previous);
    // The user's question is the message before the failure; ask() sends history without it.
    const question = previous[previous.length - 1];
    if (question?.role === "user") void ask(question.text, previous.slice(0, -1));
  }, [ask, loading, messages]);

  const clear = useCallback(() => {
    generation.current += 1;
    setLoading(false);
    setMessages([]);
    clearBuddyConversation();
  }, []);

  return { messages, loading, send, retry, clear };
}
