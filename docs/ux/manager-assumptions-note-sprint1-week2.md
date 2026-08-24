# Manager Assumptions Note — Sprint 1, Week 2

## Task

**Draft Manager Assumptions**

| Owner | Aleeya Ahmad / UX |
| :---- | :---- |
| **Track** | Design / Product |
| **Week** | 2 |
| **Hours** | 1 |

**Description:** Draft 2-3 hypotheses about Manager's workflow that go beyond Part A's stated baseline responsibilities (overseeing multiple auditors, monitoring exposure levels, responding to SOS alerts) — for example, a specific SOS response workflow or report review cadence — flagged for client validation. Also sketch a brief flow of the Manager's core journey (e.g. SOS received → acknowledged → follow-up) before moving to wireframes.

**Deliverable:** Manager assumptions note.

**Acceptance criteria:**

| # | Criterion | Where it's satisfied |
| :- | :---- | :---- |
| 1 | 2–3 hypotheses documented and flagged for client validation | [Section 1 — Hypotheses Beyond the Confirmed Manager Baseline](#1-hypotheses-beyond-the-confirmed-manager-baseline) — 3 hypotheses, each with its reasoning stated for defending to Naresh |
| 2 | Manager's core flow briefly mapped before wireframing | [Section 2 — Manager's Core Journey](#2-managers-core-journey--sos-flow-mapped-before-wireframing) — 6-stage SOS flow table, confirmed vs. team-designed status per stage |
| 3 | Brief note on Manager's likely background/context | [Section 3 — Manager's Likely Background/Context](#3-managers-likely-backgroundcontext-brief-note) (the Auditor's likely background/context has moved to the companion `auditor-assumptions-note-sprint1-week2.md`) |
| 4 | Master documents (requirements, architecture, or persona files, as applicable) updated to reflect this deliverable | All three Manager persona variants (Jordan, Reese, Sam) and the Manager Generic snapshot now cross-reference this note in their own Traceability sections |

---

**Owner:** Aleeya Ahmad / UX · **Track:** Design / Product · **Week:** 2 · **Hours:** 1
**Deliverable for:** "Draft Manager Assumptions" task (Sprint 1 Week 2, per the master proposal plan)

> ⚠️ **PROVISIONAL — ASSUMPTION-BASED, NOT CONFIRMED.** This is a short, action-oriented artifact for the team (Jana/BA, Firas/Aiden/Dev). Per client guidance, defining the Manager's workflow in more depth than the confirmed baseline is the UX/BA team's own job, not something to hand over for sign-off. The three hypotheses below are team-owned design decisions, clearly labelled as assumptions, made with confidence and ready to be justified to Naresh on their reasoning — not open questions waiting on client approval.

---

## 1. Hypotheses Beyond the Confirmed Manager Baseline

The confirmed Manager baseline is: oversee multiple auditors, monitor exposure levels, respond to SOS alerts. The three hypotheses below go beyond that baseline. Each is a team judgment call, not a request for client sign-off — the reasoning behind each is spelled out so it can be defended with confidence if asked.

**Hypothesis 1 — A plain SOS email is not enough to guarantee a fast response.**
The confirmed mechanism for an over-exposure incident is a simple manager email. We're building in an in-app urgent-state indicator (banner or badge) alongside the email, because a manager juggling around ten auditors could plausibly miss or delay-open an SOS email exactly when speed matters most against the client's own "wellbeing always wins" ruling. Reasoning to defend if asked: the confirmed mechanism sets a floor, not a ceiling, and closing the gap between "notification sent" and "manager actually saw it in time" serves the same priority the client already set.

**Hypothesis 2 — The oversight dashboard needs a proactive "approaching limit" state, not just a final exposure number.**
With per-auditor exposure limits now configurable, a dashboard that only shows current/final exposure per auditor forces the manager to manually scan roughly ten rows to catch a limit about to be crossed. We're designing a distinct "approaching limit" visual state, separate from "at limit" and "under limit," to align the dashboard with the client's own proactive-wellbeing framing rather than a passive audit log. Reasoning to defend if asked: the client's stated priority is preventing harm, not just recording it after the fact, so the dashboard should support noticing a problem before it happens.

**Hypothesis 3 — Reassigning a declined case needs more structure than free-text auditor comments.**
The confirmed decline workflow has the manager deciding whether to reassign based on the auditor's comments, the SLA/exposure limit, and the AI's output, without necessarily viewing the source content. We're proposing a structured decline-reason field alongside free text, so the manager can decide quickly and consistently in the common case. This sits behind an already lower-build-priority feature, so it's a Week 1/2 design intention to build toward, not an immediate ask.

Sourced from our Week 1 manager research notes and the three dedicated Manager persona variants in Part A (Jordan, Reese, Sam), each of which maps to one of these hypotheses as its dominant lens.

---

## 2. Manager's Core Journey — SOS Flow (Mapped Before Wireframing)

This is the highest-stakes, most concrete manager journey we have grounding for. The outer shape is client-confirmed: an auditor sends an SOS, the manager is notified by email, and the manager follows up directly with that auditor. Everything else below is the team's own design, since the client explicitly left the manager view for the team to imagine with confidence, not something to check back on step by step.

| Stage | Manager action / thought | Status | Design note |
|---|---|---|---|
| 1. SOS triggered by auditor | Auditor-side event, not a manager action | Confirmed | — |
| 2. Manager notified | Receives a plain email flagging the over-exposure incident | Confirmed mechanism | Paired with the in-app urgent-state indicator from Hypothesis 1 |
| 3. Manager acknowledges / opens case | Manager reads the notification and opens the flagged case/auditor record | Team-designed | Opening the incident shows the alert plus the auditor's current exposure/case context, not just the bare notification |
| 4. Manager checks auditor's exposure/status | Manager reviews how much exposure the auditor has had and what triggered the SOS | Team-designed, drawing on exposure data already tracked elsewhere in the system | Manager sees the AI summary/metadata, not the flagged content itself, consistent with the platform's own exposure-minimisation logic |
| 5. Manager follows up directly with auditor | Manager checks in with the auditor about their wellbeing | Confirmed as expected to happen; exact channel is team-designed | This note treats the follow-up as in-app initiated, with the option to move to a call, as the working design intention |
| 6. Manager logs outcome / next steps | Manager records what happened and whether further action (cooldown extension, reassignment, escalation) is needed | Team-designed | Logged against the case/auditor record for later pattern-review, consistent with the platform's audit-trail intent |

Stages 3, 4, and 6 are genuinely open design space per the client's own framing. Treat this table as the team's working design intention, to be pressure-tested in ideation and Sprint 2 role-play testing and refined from there, not as something awaiting outside confirmation.

---

## 3. Manager's Likely Background/Context (Brief Note)

The Manager sits one level above the Auditor day-to-day: typically promoted from several years as a senior auditor rather than hired externally, overseeing roughly ten auditors within the same safety/trust function. They don't do frontline content review as their main job — their role is oversight, tracking exposure and workload, responding to wellbeing escalations, and deciding on declined-case reassignment. Per our Week 1 manager research and the three dedicated Manager persona variants in Part A, this isn't one fixed working style but three genuinely different postures: reactive, centred on responding fast to SOS escalations and declined-case interruptions (Jordan); proactive, centred on watching exposure and workload before problems occur (Reese); and reassignment-and-fairness, centred on deciding declined cases at volume without viewing the source content (Sam). No real managers have been interviewed — the client deliberately left this role's view undesigned (per the kickoff notes: "Naresh explicitly wants the team to design this themselves using their own imagination — this is a deliberate gap, not an oversight"), so this background, like the rest of the Manager persona set, is a team-defined working hypothesis rather than a confirmed profile.

---

### Traceability
- Feeds into: Manager Requirements (not yet drafted), Manager dashboard/SOS-inbox/report-review wireframes ("Sketch Manager Wireframe," Week 2).
- The Auditor's likely background/context (formerly Section 4 here) now lives in the companion `auditor-assumptions-note-sprint1-week2.md`, where it grounds that document's own click-path mapping.
- **Action for UX:** carry Hypotheses 1–3 into wireframing as the team's working design intention; be ready to walk Naresh through the reasoning if he asks, rather than waiting on his confirmation first.
