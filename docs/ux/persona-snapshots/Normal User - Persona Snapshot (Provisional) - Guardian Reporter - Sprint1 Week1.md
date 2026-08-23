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

Priya is reporting **on behalf of her teenage child**, not herself — she discovered flagged video content that targets or demeans her child and is circulating among their peers. Her motivation is protective and urgent on someone else's behalf, while she also manages her own worry about her child's wellbeing. This is one working reading of "the public" that the team is building for directly, per Emily Chin's 21 Aug guidance to present a confident working profile rather than leave it as an open question.

### Goals
- Protect her child's identity throughout the reporting process — she does not want the report itself to expose or re-identify her child.
- Get swift, serious action, given a minor is involved.
- Understand each step in plain language — her digital confidence is limited, so this matters even more than it would for a more app-native reporter.
- Report on her child's behalf without needing to involve her child directly in the process again.

### Frustrations / Pain Points
*(Sourced from Aleeya's Week 1 research notes and the Marielle Lee interview, applied to this reporting-on-behalf-of profile — hypotheses, not confirmed findings.)*

1. **Reporting-on-behalf-of is an unaddressed edge case.** The source material assumes the reporter is the person concerned or affected; it's unclear whether the current flow's fields, prompts, or copy make sense when the reporter and the affected person are different people.
2. **Lower digital confidence raises the stakes of confusing UI.** A vague or jargon-heavy step is more likely to cause her to abandon the flow entirely — the plain-language requirement (UR-NFR-01) is especially load-bearing for her.
3. **Fear of inadvertently identifying her child.** Describing the content or providing evidence risks exposing exactly the person she's trying to protect.
4. **No visible signal that child-safety reports are handled with appropriate seriousness.** Most of the pipeline — AI processing, assignment, review — is invisible, and she has no way to confirm a minor's involvement has been recognised as higher-stakes.

### Tasks (Touchpoints)
1. Upload/submit flagged video content for review, on behalf of a third party (her child) rather than herself.
2. Receive and save/retain the generated case ID.
3. Return later and use the case ID to check the case's status.

### Context of Use
A more deliberate session than an acute-crisis report — she may take time to decide to report, possibly discussing it with her child first — but still carries real urgency given a minor's safety. Plausibly on a shared family device rather than a personal phone (unconfirmed assumption). Limited tolerance for ambiguous UI copy, given her lower baseline digital confidence.

### Constraints
- No account/login required — anonymous flow (confirmed UR-VU-02) — though it's unconfirmed whether "anonymous" as currently scoped accounts for a reporter who isn't the affected person.
- Case ID is the sole recovery path for tracking (UR-ID-09).
- Plain-language requirement (UR-NFR-01) is especially load-bearing here, given her lower digital confidence.
- Content sensitivity constraint (UR-NTH-06) applies with an added dimension: avoiding re-exposure of content that could re-identify her child, not just re-traumatise the reporter.

### Illustrative Quote
> *"I just want someone to take this seriously — because it's not me this is happening to, it's my daughter."*

**This is not a real quote.** It's an illustrative synthesis, written in the IBM persona-quote convention, but flagged here explicitly since it was authored by the team, not captured from a person.

---

## Assumptions & Validation Needed *(required per GStack Stage 3 + Planner acceptance criteria)*

**Assumptions used:**
- Priya represents a third-party reporting motivation within "the public" that no source document currently addresses explicitly; this is a genuine extension beyond the existing research base.
- Demographics (41, part-time admin, Melbourne parent) are a team-defined working profile, presented confidently per Emily Chin's 21 Aug guidance rather than left blank.
- Lower digital confidence is an inference from her described role and life stage, not from any research finding.
- Assumes the current anonymous, no-account flow works unmodified for a third-party reporter — this is explicitly flagged as unconfirmed below, not assumed safe.

**Still requires validation:**
- No real guardian/third-party reporters have been interviewed — this sub-type has the thinnest grounding of the Normal User personas, since it isn't discussed in any source document at all.
- Whether the reporting flow, as currently scoped, actually supports third-party reporting cleanly (e.g. does any field assume reporter = affected person?) is an open question worth raising with BA/PM before requirements are finalised further.
- Per the 21 Aug 2026 Support Session ruling, real-user interviews are ruled out for this project; validation route is a synthetic AI-agent persona profile, consistent with the rest of the Normal User persona set.

---

### Traceability
- Builds on: `Research User Persona` (Week 1) research notes and `Conduct Expert Interview` (Marielle Lee) synthesis.
- Feeds into: `Normal User Requirements` (UR-NFR-01, UR-ID-09, UR-ST-09, UR-NTH-06), pending the open reporting-on-behalf-of question above.
- **Action for UX:** flag to PM/BA whether the reporting flow needs an explicit "reporting on behalf of someone else" consideration, since this persona surfaces that as a genuinely open, previously undiscussed question.
