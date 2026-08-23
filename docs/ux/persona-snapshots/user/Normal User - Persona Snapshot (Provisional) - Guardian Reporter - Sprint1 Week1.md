> ⚠️ **PROVISIONAL — ASSUMPTION-BASED, NOT CONFIRMED**
> This persona is a hypothesis built from Aleeya's Week 1 research notes and the Marielle Lee expert interview, representing a distinct motivation within "the public": an adult reporting on behalf of a minor or dependent, rather than reporting for themselves. **No real reporters have been interviewed**, and no source document explicitly discusses third-party reporting. Do not treat any detail below as validated fact — see "Assumptions & Validation Needed" before using this to justify a design or requirement decision.

# Persona Snapshot — Guardian Reporter "Priya"

**Track:** Design / Product · **Sprint:** Sprint 1, Week 1 · **Owner:** Aleeya Ahmad (UX)

**Photo:**

![Priya](./Priya.jpeg)

**Naming note:** "Priya" is a team-invented name.

---

### Background
Priya is **41, works part-time in admin, and lives in Melbourne** — a parent of two, one of whom is a teenager. She is a competent but not confident smartphone user: she manages everyday apps (banking, messaging, school communication) without much digital confidence beyond that.

Priya is reporting **on behalf of her teenage child**, not herself — she discovered flagged video content that targets or demeans her child and is circulating among their peers. Her motivation is protective and urgent on someone else's behalf, while she also manages her own worry about her child's wellbeing. Priya represents one Normal User **variant**, alongside Casey (concerned bystander) and Marcus (directly affected) — not a separate definition of "the public."

### Goals
- Protect her child's identity throughout the reporting process — she does not want the report itself to expose or re-identify her child.
- Get confirmation the report is being taken seriously — no business rule currently confirms that reports involving minors receive faster or higher-priority handling, so this goal is about visible seriousness, not a guaranteed fast-track.
- Understand each step in plain language — her digital confidence is limited, so this matters even more than it would for a more app-native reporter.
- Report on her child's behalf without needing to involve her child directly in the process again.

### Frustrations / Pain Points
*(Sourced from Aleeya's Week 1 research notes and the Marielle Lee interview, applied to this reporting-on-behalf-of profile — hypotheses, not confirmed findings.)*

1. **Reporting-on-behalf-of is an unaddressed edge case.** The source material assumes the reporter is the person concerned or affected; it's unclear whether the current flow's fields, prompts, or copy make sense when the reporter and the affected person are different people.
2. **Lower digital confidence raises the stakes of confusing UI.** A vague or jargon-heavy step is more likely to cause her to abandon the flow entirely — the plain-language requirement (UR-NFR-01) is especially load-bearing for her.
3. **Fear of inadvertently identifying her child.** Describing the content or providing evidence risks exposing exactly the person she's trying to protect.
4. **No visible signal that child-safety reports are handled with appropriate seriousness.** Most of the pipeline — AI processing, assignment, review — is invisible, and she has no way to confirm a minor's involvement has been recognised as higher-stakes. *(This describes her uncertainty, not a confirmed gap in prioritisation — no mechanism for prioritising minor-involved reports currently exists to be "recognised" one way or the other.)*

### Tasks (Touchpoints)
1. Upload/submit flagged video content for review, on behalf of a third party (her child) rather than herself.
2. Receive and save/retain the generated case ID.
3. Return later and use the case ID to check the case's status.

### Context of Use
A more deliberate session than an acute-crisis report — she may take time to decide to report, possibly discussing it with her child first — but still carries real urgency given a minor's safety. As a deliberate team-defined characteristic for this scenario (not inferred from any research finding), we're assuming she's plausibly on a shared family device rather than a personal phone. Limited tolerance for ambiguous UI copy, given her lower baseline digital confidence — itself a team-defined characteristic of this scenario, not an inferred trait tied to her age or occupation.

### Constraints
- No account/login required to complete the flow (confirmed UR-VU-02) — this confirms no account is required, not that the flow is anonymous end-to-end; it's also unconfirmed whether the flow as currently scoped accounts for a reporter who isn't the affected person — see the open question below.
- The case ID is her main credential for tracking the case; Copy Case ID and local browser storage support retaining it (UR-ID-04, UR-ID-06, UR-ID-07). UR-ID-09 covers the specific warning before leaving the confirmation screen without saving it.
- Plain-language requirement (UR-NFR-01) is especially load-bearing here, given her lower digital confidence.
- Content sensitivity constraint applies with an added dimension: if content is ever displayed back, UR-NTH-06's content-warning gate needs to also account for avoiding re-identification of her child, not just re-traumatising the reporter.

### Illustrative Quote
> *"I just want someone to take this seriously — because it's not me this is happening to, it's my daughter."*

**This is not a real quote.** It's an illustrative synthesis, written in the IBM persona-quote convention, but flagged here explicitly since it was authored by the team, not captured from a person.

---

## Assumptions & Validation Needed *(required per GStack Stage 3 + Planner acceptance criteria)*

**Assumptions used:**
- Priya represents a third-party reporting **variant** of the Normal User role that no source document currently addresses explicitly; this is a genuine extension beyond the existing research base, not a confirmed reading of "the public."
- Demographics (41, part-time admin, Melbourne parent) are a team-defined working profile, presented confidently per Emily Chin's 21 Aug guidance rather than left blank.
- Lower digital confidence is a **team-defined characteristic** of this scenario, not an inference from any research finding tied to her age, occupation, or life stage.
- Assumes the current no-account flow works unmodified for a third-party reporter — this is explicitly flagged as unconfirmed below, not assumed safe. This is a genuinely open scope question, not a settled one.

**Still requires validation:**
- No real guardian/third-party reporters have been interviewed — this sub-type has the thinnest grounding of the Normal User personas, since it isn't discussed in any source document at all.
- Whether the reporting flow, as currently scoped, actually supports third-party reporting cleanly (e.g. does any field assume reporter = affected person?) is a genuinely open scope question worth raising with BA/PM before requirements are finalised further — not something to assume is already handled.
- Whether reports involving minors warrant a distinct prioritisation or handling mechanism is likewise unaddressed by any current business rule — flagged here as an open question, not implied as existing.
- Per the 21 Aug 2026 Support Session ruling, real-user interviews are ruled out for this project; the available route is a synthetic AI-agent persona profile, used as a proxy to stress-test and refine these assumptions rather than to validate real user behaviour, consistent with the rest of the Normal User persona set.

---

### Traceability
- Builds on: `Research User Persona` (Week 1) research notes and `Conduct Expert Interview` (Marielle Lee) synthesis.
- Feeds into: `Normal User Requirements` — pain point 2 (lower digital confidence) → UR-NFR-01; pain point 3 (fear of identifying her child) → UR-NTH-06; case ID retention → UR-ID-04, UR-ID-06, UR-ID-07, UR-ID-09. Pain points 1 (reporting-on-behalf-of) and 4 (no visible prioritisation signal) do not currently trace to any requirement — both are open scope questions, not gaps to fill in silently.
- **Action for UX:** flag to PM/BA whether the reporting flow needs an explicit "reporting on behalf of someone else" consideration, since this persona surfaces that as a genuinely open, previously undiscussed question — do not assume third-party reporting is already supported when writing new requirements.
