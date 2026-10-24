import type { StaffRole } from "../../hooks/useAuth";

/** Not a question to send: it starts a case lookup the person finishes by typing the ID. */
export const CASE_LOOKUP_PROMPT = "Look up a case by its ID";

/**
 * The questions each person sees first, written as the full question: what the button says is what is sent.
 * Nothing here repeats what is already on screen (a limit, a count): each is a why or a what-happens-if that a
 * person would otherwise have to look up. One place, keyed by who is
 * asking, so a role never sees another role's questions.
 */
const CHIPS: Record<StaffRole | "superadmin", string[]> = {
  auditor: [
    "What happens to a case if I decline it?",
    "When should I use SOS instead of a wellbeing check-in?",
    "What happens if I disagree with the AI severity?",
    "Does a cooldown reset my exposure?",
  ],
  superadmin: [
    "Why does a case wait in the fallback queue?",
    "When should I take a case myself?",
    "When should I use SOS instead of a wellbeing check-in?",
    "What happens if I disagree with the AI severity?",
  ],
  manager: [
    "What should I do with a failed delivery?",
    "Does RCS remove posts itself?",
    "What does a cooldown mean for an Auditor?",
    CASE_LOOKUP_PROMPT,
  ],
};

/** On a case, the questions that matter while looking at it. */
const CASE_CHIPS = [
  "What does S2 mean?",
  "What happens if I decline this case?",
  "What if I disagree with the AI severity?",
];

export function suggestedQuestions(role: StaffRole, isSuperAdmin: boolean, onCase = false): string[] {
  if (onCase && role === "auditor") return CASE_CHIPS;
  return CHIPS[role === "auditor" && isSuperAdmin ? "superadmin" : role];
}
