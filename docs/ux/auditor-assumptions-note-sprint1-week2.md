# Auditor Assumptions Note — Sprint 1, Week 2

## Task

**Start Auditor Screens**

| Owner | Aleeya Ahmad / UX |
| :---- | :---- |
| **Track** | Design / Product |
| **Week** | 2 |
| **Hours** | 2 |

**Description:** Before sketching, briefly map the Auditor's click-path (assignment → warning → review → submission). Using Jana's finalized Auditor requirements, begin the Auditor dashboard's core screens: content warning pop-up, AI analysis summary. Apply Marielle Lee's ethical-design takeaways to the content-warning pop-up specifically, to avoid dark patterns in the proceed/decline choice.

**Deliverable:** Auditor prototype draft (core screens).

**Scope of this note:** The task above carries 6 acceptance criteria. This note covers only the two that need to happen *before* sketching starts — the click-path mapping and the background/context note. The other four (screen sketches, cross-check against Jana's requirements, the dark-pattern principle applied to the pop-up itself, and master-document updates) are addressed with the actual screen sketches, not here.

**Acceptance criteria:**

| # | Criterion | Where it's satisfied |
| :- | :---- | :---- |
| 1 | At least 2 core screens sketched (content warning, analysis summary) | *Not in scope for this note* — addressed in the Auditor prototype draft (screen-sketch deliverable) |
| 2 | Auditor's core flow briefly mapped before screen sketches | [Section 1 — Auditor's Core Flow](#1-auditors-core-flow--click-path-mapped-before-screen-sketches) — 5-stage click-path table, confirmed vs. team-designed status per stage |
| 3 | Cross-checked against Jana's finalized Auditor requirements document, confirming all items are addressed | *Not in scope for this note* — Jana's Auditor requirements document is not yet available (see note below); cross-check happens when sketching the screens |
| 4 | At least 1 dark-pattern-avoidance principle applied to the content-warning pop-up | *Not in scope for this note* — Marielle Lee's plain-wording takeaway is referenced in Section 1 as flow-mapping context only; applying it to actual pop-up copy happens in the screen-sketch deliverable |
| 5 | Brief note on Auditor's likely context | [Section 2 — Auditor's Likely Background/Context](#2-auditors-likely-backgroundcontext-brief-note) |
| 6 | Master documents (requirements, architecture, or persona files, as applicable) updated to reflect this deliverable | *Not in scope for this note* — addressed alongside the screen-sketch deliverable |

> **Note on Jana's requirements doc:** As of this note, Jana's finalized Auditor requirements don't yet exist as a standalone, accessible document. Flagging this now so it isn't mistaken for something already cross-checked.

---

**Owner:** Aleeya Ahmad / UX · **Track:** Design / Product · **Week:** 2 · **Hours:** 2
**Deliverable for:** "Start Auditor Screens" task (Sprint 1 Week 2, per the master proposal plan) — pre-sketch groundwork only

> ⚠️ **PROVISIONAL — ASSUMPTION-BASED, NOT CONFIRMED.** This is a short, action-oriented artifact for the team (Jana/BA, Firas/Aiden/Dev), grounded in the Week 1 auditor research notes, all three Auditor persona variants (Jules, Maya, Theo) plus the Generic Auditor snapshot. The Auditor role doesn't exist as a hired position on this project, and per the 21 Aug 2026 Support Session ruling, real-auditor interviews are ruled out entirely (delay/penalty risk on a capstone timeline) — validation route is synthetic AI-agent persona simulation and/or internal team role-play, not real users. So the flow stages marked "team-designed" below are working design intentions, not confirmed requirements, and the context note in Section 2 is a team-defined working hypothesis rather than a validated profile.

---

## 1. Auditor's Core Flow — Click-Path (Mapped Before Screen Sketches)

This is the click-path the two upcoming screens (content warning, AI analysis summary) sit inside. The outer shape is client-confirmed from the kickoff demo and the sprint-review Q&A: a submitted case gets assigned to an auditor, the auditor passes through a warning gate before viewing flagged content, reviews it, and submits findings to the manager. Where the client left specifics open, this table marks the team's working design intention.

| Stage | Auditor action / thought | Status | Design note |
|---|---|---|---|
| 1. Case assigned | A submitted case is weighted-assigned to the auditor in the background; case shows "AI analysis in progress" while processing runs | Confirmed | Weighting is based on exposure level + case count, round-robin across auditors — not purely random |
| 2. Case appears in queue | Once analysis completes, the case appears in the auditor's list with a severity tag; the thumbnail is auto-blurred/suppressed by default | Confirmed | Auditor isn't exposed just by seeing the case list |
| 3. Warning / consent gate | Auditor opens the case; a pop-up shows the AI-identified tags/flag reason and asks whether to proceed; auditor accepts or respectfully declines | Confirmed mechanism, wording/content open | Plain, neutral wording ("Would you like to proceed?", dropping "willingly") per Marielle Lee Q1. **Team-designed:** surface the flag's reason/category, not just a severity tag, before the decision — per Marielle Lee Q2, so declining isn't "a cold, unexplained judgment call." **Team-designed:** the decline path carries a one-line non-judgment statement ("This won't be held against you — your manager reviews the case, not your decision"), per Research Note 1, aimed at Jules's and Maya's fear that declining is silently tracked. A decline routes directly to the manager (confirmed). |
| 4. Review | Auditor watches the video (unblurs on deliberate play), can toggle blur/grayscale, reads the AI severity/CVI score, incident timeline, narrative summary, and audio transcript/timestamps; can trigger SOS if unexpectedly exposed, or a separate wellbeing check-in if a correctly-tagged case is simply difficult | Confirmed core + team-designed | **Team-designed:** an on-screen SOS acknowledgement beyond the confirmed manager-email trigger, giving visible confirmation a human will follow up, not just that an email was sent. **Team-designed:** a persistent breakdown near the exposure counter of what actually counts as "exposed" time (re-watches, blurred-but-open), per Research Note 3 — pre-empts Theo's dominant exposure-clock distrust without a help-doc detour mid-review. **Team-designed:** a *separate* wellbeing check-in distinct from SOS, per Marielle Lee's own sketch ("Do you feel uncomfortable with this video?" plus a direct talk-to-manager trigger) — kept separate because SOS is confirmed as the response to an AI *failure*/unexpected over-exposure, not to an ordinary hard case; collapsing both into one button would either dilute SOS's urgency or leave the far more common case unsupported. |
| 5. Submission | Auditor can adjust the AI's severity/CVI rating and add comments, then submits to the manager; the case moves into the manager's review queue | Confirmed | Both the AI's and the auditor's input are recorded |

Stage 3's exact pop-up copy and Stage 4's SOS/wellbeing-check-in interactions are genuinely open design space; each team-designed addition above is traceable to a specific research note or Marielle Lee recommendation (cited inline), not invented from scratch — treat this table as the team's working design intention for the two upcoming screens, not something awaiting outside confirmation.

---

## 2. Auditor's Likely Background/Context (Brief Note)

An auditor works through a queue of AI-pre-processed cases against a daily, time-measured exposure cap, with blur-by-default and a mandatory cooldown after high-severity exposure — they can also decline a case, or trigger SOS if the AI under-tags something and they're unexpectedly exposed. Per our Week 1 auditor research and the three dedicated Auditor persona variants, this isn't one fixed relationship to those protections but three postures across a tenure spectrum: still forming first impressions, with no track record to judge the protections by (Jules, 3 weeks in, no prior moderation experience); competent, but not yet confident that declining or SOS carries no real professional cost (Maya, ~3 years, the client brief's own named reviewer); and having largely resolved that trust, but sharpened instead into doubt over whether the exposure clock itself is accurate (Theo, ~9 years). For Jules and Maya, that's why Stage 3's decline path carries its own non-judgment reassurance and Stage 4's SOS needs visible human acknowledgement, not just a background email — the same trust gap the Manager Assumptions Note's Hypothesis 1 closes from the manager's side. For Theo, it's why Stage 4's exposure-clock breakdown matters more than reassurance ever would. No real auditors have been interviewed for this project, so this spectrum, like the rest of the Auditor persona set, is a team-defined working hypothesis rather than a confirmed profile.

---

### Traceability
- Feeds into: the Auditor prototype draft's two core screens — content warning pop-up and AI analysis summary ("Start Auditor Screens," Week 2).
- Related: `manager-assumptions-note-sprint1-week2.md` — Section 2 (SOS flow) and Hypothesis 1 build on the same auditor trust gap described in Section 2 above.
- **Action for UX:** carry the Stage 3/4 design notes into the content-warning and analysis-summary sketches; apply Marielle Lee's plain-wording takeaway directly to the pop-up copy at that point, and cross-check against Jana's Auditor requirements once that document is available.
