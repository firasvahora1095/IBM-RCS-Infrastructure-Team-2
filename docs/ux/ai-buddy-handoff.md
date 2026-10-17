# AI Buddy: Build Handoff (Sprint 3 HD feature)

**Track:** Design / Product · **Owner:** Aleeya Ahmad (UX) · **Status:** built on two branches, ready for review
**Scope source:** `RCS_AI_Buddy_FINAL_IMPLEMENTATION_SCOPE` (static knowledge, a few live values, one compact case lookup, read-only) · **BA rules:** [`docs/ba/extra-features.md`](../ba/extra-features.md) (HD section) · **Client steer:** Emily, 8 Oct ("generic, preliminary, an AI buddy in a stressful environment")

| Branch | What | Based on |
|---|---|---|
| `feat/ai-buddy-backend` | Role-scoped context, guardrails, structured reply, tests | `origin/test` at `53d959c` |
| `feat/ai-buddy-panel` | Carbon side panel, mock responder, tests | the backend branch |

Merge the backend branch first: the panel's reply contract depends on it.

## 1. What the staff member sees

A header button opens a right-hand panel. It is not modal, so the person keeps working. On screens 1056px and wider the page makes room for the panel instead of sitting under it, so it can never cover SOS on the Review Workspace. Below that it takes the full width and is closed to carry on.

| Part | Behaviour |
|---|---|
| Header button | "AI Buddy", in the staff header for both roles |
| Panel title | "AI Buddy" + a "Preliminary" tag + Carbon `AILabel` explaining it can be wrong and can't change anything |
| Empty state | "How can I help?" and four starter questions for the role (the demo question sets from the scope doc). A Manager's fourth starts a case lookup by pre-filling the input |
| Answer | Short plain text. If a live figure was used: "Live data, read at 7:48 pm". Up to two links to the right screen |
| Case lookup | A list of only the fields the role was sent. An empty field says "Not yet set"; it is never left blank |
| No verified information | An info notice with the fixed wording, no model call |
| Error | An error notice and **Try again**; the question isn't duplicated |
| Input | "Ask a question". Enter sends, Shift+Enter adds a line |
| Footer | "AI Buddy guides. People decide." and **Clear conversation** |

Send is a secondary button, so the panel never competes with the page's primary button.

## 2. Reply contract (`POST /api/chat`)

Request: `{ message, history: [{ role: "user" | "assistant", text }] }`. History is capped at 12 turns on input and the last 6 are used.

Reply:

```json
{
  "reply": "You have 47 minutes of exposure today. ...",
  "live_as_of": "2026-10-17T08:42:00+00:00",
  "case": { "case_id": "AR-2026-00500", "status": "Complete", "ai_severity": "S3",
            "final_auditor_severity": "S3", "final_outcome": "Violation Found",
            "assigned_auditor": "auditor-02", "delivery_status": "NEEDS_ATTENTION" },
  "links": [{ "label": "Open case review", "to": "/manager/cases/AR-2026-00500/review" }],
  "fallback": false
}
```

`assigned_auditor` and `delivery_status` are Manager-only and absent for an Auditor. `live_as_of` and `case` are null when unused.

## 3. The three context levels

| Level | Auditor | Manager |
|---|---|---|
| 1. Static RCS rules | In the system prompt | Same |
| 2. Live values | Exposure used, limit and remaining; open cases; ready for review; cooldown | Open and completed cases; awaiting reassignment; open SOS; failed deliveries; open break and talk requests; Auditors at limit |
| 3. One case | Only a case assigned to them | Any case, all seven agreed fields |

## 4. Rules the backend enforces (not left to the model)

- **Read-only.** The prompt lists what the Buddy must never do, and no endpoint it can reach changes anything.
- **Case access follows the role.** An Auditor asking about a case that isn't theirs, or one that doesn't exist, gets the same fixed fallback and the model is never called, so the reply can't reveal which it was.
- **Links are chosen by fixed rules**, never written by the model.
- **Distress wording is fixed** and appended after the model's reply. For an Auditor it points to SOS and the Wellbeing check-in. For wording about self-harm it adds "call 000" and Lifeline 13 11 14. The Buddy does not diagnose.
- **Errors don't leak.** A model or configuration failure returns "AI Buddy is unavailable right now."

## 5. Bugs found and fixed while building

| Found in the earlier build | Fix |
|---|---|
| Prompt called RCS "Rapid Case System" | Responsible Content Safety |
| Prompt listed statuses that don't exist (`ASSIGNED`, `MANAGER_REVIEW`) | Staff labels from RT-02, with Manager Review derived from the case flag as on the Manager screens |
| Final Auditor severity built as "S" + score, so a 72 showed as "S72" | Real tier from the severity scale |
| Case IDs like `AR-2026-00417` weren't recognised | Recognised; plain words are ignored |
| Any Auditor could look up any case | Role check (above) |
| `delivery_status` was missing from the lookup | Added, Manager only |
| 503 body named configuration variables | Generic message, detail logged server-side |
| Temperature 0.7 | 0.2 |
| No history, so follow-ups had no context | Last 6 turns |
| Conversation kept in `localStorage` | `sessionStorage`; removed on sign-out and by Clear conversation |
| Hidden when the app runs on mock data | Mock responder, so it can be demoed and tested offline |

## 6. Accessibility

Focus moves into the panel on open and back to the header button on close. Escape closes. New answers are announced once in a polite live region; the log itself is not live. The input has a visible label. Status is text, never colour alone. Tests run axe on the empty, answer, case summary, fallback and error states.

**Not yet done:** an NVDA pass, and a measured contrast check in a real browser. Known: Carbon's AI label has the accessible name "AI Show information" by default.

## 7. Deliberately not built

Full transcripts, timelines or narrative summaries; analytics across cases; recommending which Auditor to reassign to; any action; long-term memory; background notifications; performance ranking (scope doc, section 7).

## 8. For Firas and Hyuna

1. Merge `feat/ai-buddy-backend` first. It rewrites the prompt in `backend/app/chat.py` and moves the context code to `backend/app/chat_context.py`.
2. `aiChat` now takes a history argument and returns the structured reply. The old floating widget (`AiChatWidget.tsx`) is removed; the panel is mounted from `StaffHeader`.
3. The `WATSONX_CHAT_MODEL_ID` default is unchanged.
4. Please check the fixed distress wording and the Lifeline number with the BA before the demo. They are the only safety copy in the product that isn't reviewed elsewhere.
5. Failures that already exist on `test` and are not caused by this work: 9 backend tests in `test_storage.py` and `test_video_analysis.py`, and 3 frontend tests about the S4 cooldown check-in (`CooldownPage.test.tsx` twice, `mockDataService.test.ts` once), which fail since the check-in was limited to SOS.
