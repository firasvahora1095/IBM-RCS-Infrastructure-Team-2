> ⚠️ **PROVISIONAL — ASSUMPTION-BASED, NOT CONFIRMED**
> This persona is a hypothesis built from Aleeya's Week 1 research notes, the IBM brief's own storyline, the kickoff meeting, the client Q&A, and the Marielle Lee expert interview — deliberately kept broad rather than tied to one specific reviewer profile. **No real auditors have been interviewed, and the Auditor role does not currently exist as a hired position on this project** — there is no live panel to test with. Do not treat any detail below as validated fact — see "Assumptions & Validation Needed" before using this to justify a design or requirement decision.

# Persona Snapshot — Auditor (Generic)

**Track:** Design / Product · **Sprint:** Sprint 1, Week 1 · **Owner:** Aleeya Ahmad (UX)

**Photo:** *Intentionally omitted.* A stock photo would imply a specific age/background we have no data for, which risks narrowing the team's mental model prematurely.

**Naming note:** Intentionally unnamed — this persona represents any auditor assigned to review flagged video content on this platform, not one specific working profile.

---

### Background
This persona represents **any auditor/reviewer** assigned cases through the platform's weighted case-assignment system — no fixed tenure, background, or emotional calibration is assumed. Based on our research, the Auditor role covers more than one meaningfully distinct working profile, mapped across a tenure spectrum: a brand-new hire with no lived experience of the wellbeing systems yet, an earlier-tenure reviewer still calibrating to the job's emotional weight, and a longer-tenured reviewer whose concerns have shifted toward system transparency and fairness. Each is detailed in its own dedicated persona; this generic version is for contexts where a single, lightweight reference is more useful than that specificity — for example, a proposal document's Target Users bullet, a one-line requirements-doc persona reference, or a stakeholder summary slide.

### Goals
- Do accurate, well-reasoned review work, including confidently overriding the AI when it's wrong, a capability the client has confirmed.
- Get through a shift without unnecessary exposure to the worst material, relying on AI pre-screening, blur-by-default, and severity summaries.
- Decline a case when needed, without it feeling like a black mark against performance.
- Get real support quickly if something goes wrong, whether accidental exposure or distressing content.
- Feel like the monitoring around them (exposure tracking, wellbeing checks) exists *for* them, not *on* them.

### Frustrations / Pain Points
Sourced from Aleeya's Week 1 auditor research notes; hypotheses, not confirmed findings.

1. **Uncertainty about whether declining carries a real or perceived penalty.** Even though wellbeing is meant to outrank moderation speed, the interface gives no visible reassurance that declining is judgment-free rather than silently tracked.
2. **Not knowing whether the SOS mechanism actually does something in the moment.** The confirmed requirement is a manager email notification — from the auditor's side mid-exposure, that can feel like it "just sends an email somewhere" with no immediate acknowledgement.
3. **Not fully trusting the exposure clock.** If the displayed exposure time doesn't clearly reflect what was actually sat through (re-watches, blurred-but-open time), the number stops functioning as reassurance and becomes another thing to second-guess.
4. **Monitoring that could tip from protective into surveillance-feeling.** Drawn from the Marielle Lee expert interview: disclosure of monitoring needs to happen once, not repeatedly, to avoid undermining its protective intent.

### Tasks (Touchpoints)
1. Log in and view an assigned case list — thumbnails auto-blurred/suppressed by default, severity-tagged.
2. Open a case: review AI severity score, incident timeline, narrative summary, and audio analysis.
3. Pass through the consent/warning gate before viewing raw flagged content (accept and proceed, or decline).
4. Toggle blur/grayscale to self-control exposure while reviewing.
5. Adjust the AI's severity/CVI rating if needed, write comments, and submit findings to the manager.
6. Trigger SOS if unexpectedly exposed, or use a wellbeing check-in action if a case is distressing.

### Context of Use
A sustained, professional working session — not a single spontaneous visit like the Normal User. Cases are worked through a queue across a shift, with cumulative exposure building up over the day (capped, not reset per case). Almost certainly desktop-based, in a work setting rather than mobile.

### Constraints
- **Daily exposure cap: 2 hours / 120 minutes** — the client-confirmed target for testing. Note: the kickoff demo showed a 4-hour cap; treat 120 minutes as authoritative per the more recent, explicit client confirmation.
- **Case assignment is weighted**, not purely random, by exposure level and case count, per client confirmation.
- **Wellbeing always outranks moderation speed** — an explicit, unambiguous client ruling, governing every tradeoff involving this role.
- **Role-based access**: auditors see only their own assigned cases, never other auditors' cases.
- **Mandatory cooldown** enforced after high-severity content exposure.
- **Right to decline exists, but is a lower-build-priority feature** — the client has directed that this be built toward the end of the pilot, so the decline experience may be minimally represented in early prototype iterations.

### Illustrative Quote
> *"The volume doesn't stop. I just need to know the tool actually has my back if something gets through."*

**This is not a real quote.** It's an illustrative synthesis, written in the IBM persona-quote convention, but flagged here explicitly since it was authored by the team, not captured from a person.

---

## Assumptions & Validation Needed *(required per GStack Stage 3 + Planner acceptance criteria)*

**Assumptions used:**
- Demographics and tenure are deliberately left unspecified — this persona's value is in representing the role at a general level, not in a specific working profile the way the role's other personas do.
- The four goals, frustrations, touchpoints, and constraints above are the team's assessment of what generalises across the Auditor role as a whole, based on the IBM brief, kickoff notes, client Q&A, and Aleeya's Week 1 auditor research notes.
- Assumes stakeholders reaching for a single Auditor reference will use this generic version rather than defaulting to whichever specific persona they happen to know about.

**Still requires validation:**
- The Auditor role does not exist as a hired position for this project — there is no live panel to interview, and per the 21 Aug 2026 Support Session ruling, real-user interviews are ruled out entirely. The available route is a synthetic AI-agent persona profile and/or internal team role-play, used as a proxy to stress-test these assumptions, not to validate real user behaviour.
- Whether these goals, frustrations, and constraints hold once the Auditor role's more specific working profiles are fully scoped out in requirements — see the role's other dedicated personas for that detail.
- Whether real auditors would actually worry about decline being tracked against them, or whether a written policy alone would be sufficient reassurance — an open scenario-based question.
- The exact definition of "exposure time" (does re-watching count twice? does blurred-but-open count?) is not yet defined anywhere in the confirmed requirements.

---

### Traceability
- Companion personas: `Auditor - Persona Snapshot (Provisional) - New Hire - Sprint1 Week1.md` (Jules), `Auditor - Persona Snapshot (Provisional) - Frontline Reviewer - Sprint1 Week1.md` (Maya), `Auditor - Persona Snapshot (Provisional) - Senior Reviewer - Sprint1 Week1.md` (Theo).
- Feeds into: Auditor Requirements (not yet drafted as a standalone BA document — this is Jana's upcoming Week 2 "Finalize Persona Requirements" task). Pain point 1 (decline stigma) and pain point 2 (SOS trust) trace toward the decline and SOS requirements once written; pain point 3 (exposure clock legibility) is a genuinely open technical/UX question flagged for that same doc.
- **Action for UX:** use this file (not any single variant) as the pointer in any document that needs one general Auditor reference — e.g. the master proposal document's Target Users section.
