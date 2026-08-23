> ⚠️ **PROVISIONAL — ASSUMPTION-BASED, NOT CONFIRMED**
> This persona is a hypothesis built from Aleeya's Week 1 research notes, the Marielle Lee expert interview, and confirmed kickoff/client facts about the Normal User role — deliberately kept broad rather than tied to one specific reporting motivation. **No real reporters have been interviewed.** Do not treat any detail below as validated fact — see "Assumptions & Validation Needed" before using this to justify a design or requirement decision.

# Persona Snapshot — Normal User (Generic)

**Track:** Design / Product · **Sprint:** Sprint 1, Week 1 · **Owner:** Aleeya Ahmad (UX)

**Photo:** *Intentionally omitted.* A stock photo would imply a specific age/ethnicity/gender we have no data for, which risks narrowing the team's mental model prematurely.

**Naming note:** Intentionally unnamed — this persona represents any member of the public, not one specific individual profile.

---

### Background
This persona represents **any member of the public** who arrives at the reporting flow to submit flagged video content — no fixed age, occupation, motivation, or emotional state is assumed. Based on our research, the Normal User role covers more than one distinct reporting motivation (general concern, being personally targeted, reporting on behalf of someone else), each detailed in its own dedicated persona; this generic version is for contexts where a single, lightweight reference is more useful than that specificity — for example, a proposal document's Target Users bullet, a one-line requirements-doc persona reference, or a stakeholder summary slide.

### Goals
- Submit a report quickly, without creating an account or handing over personal details.
- Feel confident the report is being taken seriously — not dropped into a void.
- Retain a simple way to check back on the case later without needing to remember much.
- Avoid unwanted personal exposure or risk through the act of reporting.

### Frustrations / Pain Points
*(Sourced from Aleeya's Week 1 research notes — hypotheses, not confirmed findings.)*

1. **Trust at the moment of reporting.** Submitting feels emotionally loaded — self-doubt about whether this "counts" as reportable, and whether it's worth the effort.
2. **The case ID as an anxious tether.** With no account system, the case ID is the reporter's only link back to an outcome. It's easy to lose, and losing it means losing the ability to ever find out what happened.
3. **Distrust of the silent middle.** Most of the pipeline — AI processing, assignment, review — is invisible. Without some intermediate signal, silence reads as inaction, not progress.
4. **Privacy/surveillance anxiety** *(from the Marielle Lee expert interview)*: a general wariness about reporting tools that feels like being watched or logged, rather than being helped.

### Tasks (Touchpoints)
1. Upload/submit flagged video content for review.
2. Receive and save/retain the generated case ID.
3. Return later and use the case ID to check the case's status.

### Context of Use
A session on a personal device, arriving at the reporting flow after encountering the content rather than through planned, exploratory browsing. Session length is short and single-purpose: the reporting step itself needs to be quick, with low tolerance for friction such as account creation. The reporter will likely check the status page a small number of times afterward, not repeatedly.

### Constraints
- No account/login — the entire flow must be completable anonymously (confirmed: UR-VU-02).
- Case ID is the sole recovery path for tracking, unless the user opts into email/SMS (deprioritised to Nice-to-Have).
- Plain-language requirement (UR-NFR-01) — no familiarity assumed with terms like "case assignment" or "AI processing."
- Content sensitivity requires avoiding unprompted re-display of reported content (UR-NTH-06).

### Illustrative Quote
> *"I don't need an account, and I don't need my name on it — I just want to know this gets looked at."*

**This is not a real quote.** It's an illustrative synthesis, written in the IBM persona-quote convention, but flagged here explicitly since it was authored by the team, not captured from a person.

---

## Assumptions & Validation Needed *(required per GStack Stage 3 + Planner acceptance criteria)*

**Assumptions used:**
- Demographics are deliberately left unspecified — this persona's value is in representing the role at a general level, not in a specific working profile the way the role's other personas do.
- The four goals, frustrations, touchpoints, and constraints above are the team's assessment of what generalises across the Normal User role as a whole, based on Aleeya's Week 1 research notes and the Marielle Lee interview.
- Single-session, low-repeat usage pattern is inferred from the anonymous/no-account design, not observed.
- Assumes stakeholders reaching for a single Normal User reference will use this generic version rather than defaulting to whichever specific persona they happen to know about.

**Still requires validation:**
- No real reporters have been interviewed — every pain point above is a hypothesis.
- Whether these goals, frustrations, and constraints hold once the Normal User role's more specific reporting motivations are fully scoped out in requirements — see the role's other dedicated personas for that detail.
- Actual tech-literacy range, device mix, and session behaviour are unknown.
- Per the 21 Aug 2026 Support Session ruling, real-user interviews are ruled out for this project; validation route is a synthetic AI-agent persona profile, consistent with the rest of the Normal User persona set.

---

### Traceability
- Builds on: `Research User Persona` (Week 1) research notes and `Conduct Expert Interview` (Marielle Lee) synthesis.
- Feeds into: `Normal User Requirements` (UR-NFR-01, UR-ID-09, UR-ST-09, UR-NTH-06).
- **Action for UX:** use this file (not any single specific persona) as the pointer in any document that needs one general Normal User reference — e.g. the master proposal document's Target Users section.
