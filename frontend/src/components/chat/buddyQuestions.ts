import type { StaffRole } from "../../hooks/useAuth";

/** Not a question to send: it starts a case lookup the person finishes by typing the ID. */
export const CASE_LOOKUP_PROMPT = "Look up a case by its ID";

/** The four questions each role sees first. They show the Buddy's range: live figures, consequences, definitions, human control. */
export const SUGGESTED_QUESTIONS: Record<StaffRole, string[]> = {
  auditor: [
    "What is my exposure today?",
    "What happens when I reach my exposure limit?",
    "What is the difference between SOS and a wellbeing check-in?",
    "What happens if I disagree with the AI severity?",
  ],
  manager: [
    "What needs my attention right now?",
    "What should I do with a failed delivery?",
    "How many cases are awaiting reassignment?",
    CASE_LOOKUP_PROMPT,
  ],
};
