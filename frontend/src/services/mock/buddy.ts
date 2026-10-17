import type { BuddyCaseSummary, BuddyLink, BuddyReply, StaffRole } from "../types";

/**
 * The mock AI Buddy: fixed answers that follow the same rules as the real one
 * (docs/ux/ai-buddy-handoff.md), so every state of the panel can be demoed and
 * tested with no backend. It reads only the small figures it is given and
 * never states a number it wasn't told.
 */

export interface BuddyLiveFigures {
  /** Auditor */
  exposureMinutes?: number;
  exposureLimit?: number;
  cooldownMinutesLeft?: number | null;
  readyForReview?: number;
  openCases?: number;
  /** Manager */
  awaitingReassignment?: number;
  failedDeliveries?: number;
  openSos?: number;
  breakRequests?: number;
  talkRequests?: number;
  openCasesAll?: number;
}

export const FALLBACK_AUDITOR =
  "I don't have enough verified information to answer that case-specific question. Open the case from your queue or contact your Manager.";
export const FALLBACK_MANAGER =
  "I don't have enough verified information to answer that case-specific question. Open Case Oversight or check the case ID.";
const FALLBACK_GENERAL =
  "I don't have enough verified information to answer that. Check the relevant screen or ask your Manager.";

const DISTRESS_NOTE =
  "If something you saw is affecting you right now, you can pause and use SOS for unexpected harmful exposure, or the Wellbeing check-in to ask for a break or to talk to your Manager.";
const CRISIS_NOTE = "If you are in immediate danger, call 000. For urgent emotional support in Australia, Lifeline is on 13 11 14.";

const DISTRESS = /\b(distress\w*|traumati[sz]\w*|can'?t cope|panic\w*|overwhelm\w*|want to quit|not okay|struggling|anxious|upset)\b/i;
const CRISIS = /\b(suicid\w*|kill myself|end my life|self[- ]?harm\w*|hurt myself)\b/i;

interface Topic {
  match: RegExp;
  answer: (live: BuddyLiveFigures, role: StaffRole) => string | null;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const TOPICS: Topic[] = [
  {
    match: /(what|how).*(exposure).*(today|so far|used|have)|my exposure/i,
    answer: (l, role) => {
      if (role !== "auditor" || l.exposureMinutes === undefined || l.exposureLimit === undefined) return null;
      const left = Math.max(0, l.exposureLimit - l.exposureMinutes);
      return `You have ${l.exposureMinutes} minutes of exposure today. Your daily limit is ${l.exposureLimit} minutes, so you have ${left} minutes remaining.`;
    },
  },
  {
    match: /(reach|hit|at|pass).*(limit|120)|exposure limit|what happens at/i,
    answer: () =>
      "When you reach your daily exposure limit, you stop receiving new cases for the rest of the working day. If you reach it during a case, playback stops and the unfinished case goes to your Manager to decide.",
  },
  {
    match: /(sos).*(check-?in|break)|(check-?in|break).*(sos)|difference.*(sos|check)/i,
    answer: () =>
      "A Wellbeing check-in is for normal support, such as asking for a break or to talk to your Manager. SOS is the urgent path for unexpected harmful exposure and alerts your Manager immediately.",
  },
  {
    match: /\bsos\b/i,
    answer: () =>
      "SOS is the urgent path for unexpected harmful exposure. It pauses the case, alerts your Manager immediately and starts a mandatory cooldown. Your Manager then checks in with you.",
  },
  {
    match: /decline/i,
    answer: () =>
      "The case goes to your Manager to decide what happens next. It is not reassigned to another Auditor automatically.",
  },
  {
    match: /(disagree|override|change|differ).*(ai|severity)|ai severity/i,
    answer: () =>
      "You can override the AI severity if your assessment is different. You must give a reason. The original AI result and your final assessment are stored separately.",
  },
  {
    match: /cooldown/i,
    answer: (l, role) => {
      const live =
        role === "auditor" && l.cooldownMinutesLeft !== undefined
          ? l.cooldownMinutesLeft
            ? ` You are in cooldown now, with about ${l.cooldownMinutesLeft} minutes left.`
            : " You are not in cooldown now."
          : "";
      return `After an S3 or S4 case, or after SOS, a mandatory cooldown applies and no new cases are assigned until it ends. A cooldown does not reset your daily exposure.${live}`;
    },
  },
  {
    match: /break|talk to (my )?manager|check-?in/i,
    answer: () =>
      "Open a Wellbeing check-in from your queue or from a case to ask for a break or to talk to your Manager. Your Manager decides whether to approve a break.",
  },
  {
    match: /ready for review/i,
    answer: () => "Ready for Review means the AI has finished and the case is waiting for an Auditor to open it.",
  },
  {
    match: /need.*attention|attention.*now/i,
    answer: (l, role) => {
      if (role !== "manager") return null;
      const rows = [
        [l.openSos, "open SOS alert"],
        [l.breakRequests, "break request"],
        [l.talkRequests, "request to talk"],
        [l.awaitingReassignment, "reassignment decision"],
        [l.failedDeliveries, "failed Client delivery", "failed Client deliveries"],
      ] as [number | undefined, string, string?][];
      const present = rows.filter(([n]) => n !== undefined && n > 0);
      if (present.length === 0) return "Nothing needs your attention right now.";
      const total = present.reduce((sum, [n]) => sum + (n as number), 0);
      return [
        `You have ${plural(total, "item")} needing attention:`,
        ...present.map(([n, one, many]) => `• ${plural(n as number, one, many)}`),
      ].join("\n");
    },
  },
  {
    match: /(how many|number of).*(reassign)|awaiting reassignment/i,
    answer: (l, role) => {
      if (role !== "manager" || l.awaitingReassignment === undefined) return null;
      return l.awaitingReassignment === 0
        ? "There are currently no cases awaiting reassignment."
        : `There are ${plural(l.awaitingReassignment, "case")} awaiting reassignment.`;
    },
  },
  {
    match: /(how many).*(sos)/i,
    answer: (l, role) => {
      if (role !== "manager" || l.openSos === undefined) return null;
      return l.openSos === 0 ? "There are no open SOS alerts." : `There ${l.openSos === 1 ? "is" : "are"} ${plural(l.openSos, "open SOS alert")}.`;
    },
  },
  {
    match: /(failed|fail).*(deliver)|delivery failed/i,
    answer: () =>
      "Delivery Failed means the result did not reach the Client. It does not mean the moderation failed. Review the delivery details first. If it stays failed after the automatic retries, retry it or escalate it from Deliveries.",
  },
  {
    match: /(remove|take down).*(post)|automatically remove/i,
    answer: () => "RCS does not remove posts. The Client decides what to do with a result.",
  },
];

const CASE_ID = /\b[A-Za-z0-9][A-Za-z0-9-]{5,19}\b/g;

export function findCaseId(message: string): string | null {
  const hit = (message.match(CASE_ID) ?? []).find((t) => /\d/.test(t));
  return hit ? hit.toUpperCase() : null;
}

function caseAnswer(c: BuddyCaseSummary): string {
  const lines = [`${c.case_id} is currently ${c.status}.`];
  lines.push(`AI severity: ${c.ai_severity ?? "not yet assessed"}.`);
  lines.push(`Final Auditor severity: ${c.final_auditor_severity ?? "not yet set"}.`);
  lines.push(`Final outcome: ${c.final_outcome ?? "not yet set"}.`);
  if (c.delivery_status !== undefined) lines.push(`Delivery: ${c.delivery_status ?? "not applicable"}.`);
  return lines.join(" ");
}

function linksFor(role: StaffRole, message: string, c: BuddyCaseSummary | null): BuddyLink[] {
  const text = message.toLowerCase();
  const out: BuddyLink[] = [];
  const add = (label: string, to: string) => {
    if (!out.some((l) => l.to === to)) out.push({ label, to });
  };
  if (c) add(role === "manager" ? "Open case review" : "Open case", role === "manager" ? `/manager/cases/${c.case_id}/review` : `/auditor/cases/${c.case_id}`);
  if (role === "manager") {
    if (/reassign|declin/.test(text)) add("Open Reassignment", "/manager/reassignment");
    if (text.includes("sos")) add("Open SOS Inbox", "/manager/sos");
    if (/deliver|retry|handoff/.test(text)) add("Open Deliveries", "/manager/deliveries");
    if (text.includes("report")) add("Open Reports", "/manager/reports");
    if (/exposure|auditor|attention/.test(text)) add("Open Oversight Dashboard", "/manager");
  } else {
    if (text.includes("cooldown")) add("Open my cooldown", "/auditor/cooldown");
    if (/exposure|limit|queue|case|break|check-in|check in|talk/.test(text)) add("Open my queue", "/auditor");
  }
  return out.slice(0, 2);
}

export function mockBuddyReply(
  message: string,
  role: StaffRole,
  live: BuddyLiveFigures,
  lookedUp: { id: string | null; summary: BuddyCaseSummary | null },
  now = new Date(),
): BuddyReply {
  const hasLive = Object.values(live).some((v) => v !== undefined);
  const liveAsOf = hasLive ? now.toISOString() : null;
  const fallbackText = role === "manager" ? FALLBACK_MANAGER : FALLBACK_AUDITOR;

  if (lookedUp.id && !lookedUp.summary) {
    return { reply: fallbackText, live_as_of: null, case: null, links: [], fallback: true };
  }

  let reply: string;
  let usedLive = false;
  let fallback = false;
  if (lookedUp.summary) {
    reply = caseAnswer(lookedUp.summary);
  } else {
    const topic = TOPICS.find((t) => t.match.test(message) && t.answer(live, role) !== null);
    const text = topic?.answer(live, role) ?? null;
    if (text === null) {
      reply = FALLBACK_GENERAL;
      fallback = true;
    } else {
      reply = text;
      usedLive = /exposure today|attention|awaiting|open SOS|cooldown now|not in cooldown/i.test(reply);
    }
  }

  const crisis = CRISIS.test(message);
  const notes: string[] = [];
  if ((DISTRESS.test(message) || crisis) && role === "auditor") notes.push(DISTRESS_NOTE);
  if (crisis) notes.push(CRISIS_NOTE);

  return {
    reply: [reply, ...notes].join("\n\n"),
    live_as_of: usedLive || lookedUp.summary ? liveAsOf ?? now.toISOString() : null,
    case: lookedUp.summary,
    links: fallback ? [] : linksFor(role, message, lookedUp.summary),
    fallback,
  };
}
