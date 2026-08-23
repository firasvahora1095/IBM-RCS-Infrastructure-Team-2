> ⚠️ **PROVISIONAL — ASSUMPTION-BASED, NOT CONFIRMED**
> This persona is a hypothesis built from Aleeya's Week 1 research notes and the Marielle Lee expert interview, representing a distinct motivation within "the public": someone reporting content that targets or harms them personally. **No real reporters have been interviewed.** Do not treat any detail below as validated fact — see "Assumptions & Validation Needed" before using this to justify a design or requirement decision.

# Persona Snapshot — Directly Affected Reporter "Marcus"

**Track:** Design / Product · **Sprint:** Sprint 1, Week 1 · **Owner:** Aleeya Ahmad (UX)

**Photo:**

![Marcus](./Marcus.jpeg)

**Naming note:** "Marcus" is a team-invented name.

---

### Background
Marcus is **34, works as a delivery driver, and lives in Melbourne.** He is a competent, everyday smartphone user but not especially tech-savvy.

Marcus is the **subject of the flagged content himself** — a video of a private altercation involving him was filmed without his consent and is being shared and re-shared. A friend sent him the link. He isn't reporting out of general concern about the situation; he's reporting because it's happening *to him*, and every hour it stays up is a personal harm. This is one working reading of "the public" that the team is building for directly, per Emily Chin's 21 Aug guidance to present a confident working profile rather than leave it as an open question.

### Goals
- Get the content reviewed and actioned as fast as possible — the urgency is personal, not general concern.
- Report without having to repeatedly re-watch, re-describe, or re-justify the content.
- Be confident the report — and his identity — stays confidential from the uploader and anyone else involved.
- Know when the case actually concludes, since the outcome directly affects him.

### Frustrations / Pain Points
*(Sourced from Aleeya's Week 1 research notes and the Marielle Lee interview, applied to this emotional profile — hypotheses, not confirmed findings.)*

1. **Urgency with no visibility.** The review pipeline's timeline is invisible to him — most of the process (AI processing, assignment, review) happens with no intermediate signal — while the stakes are personal: content actively spreading about him is a different order of urgency than a general concern would be.
2. **Re-exposure risk at submission.** Describing or referencing the harmful content in order to file the report risks re-traumatising him in the act of trying to get help.
3. **Retaliation anxiety.** Anonymity carries real personal-safety weight for Marcus: if the uploader or people around the incident learn he reported it, there's a direct risk to him, not just an abstract privacy preference.
4. **No visible distinction for personal-stakes reports.** As far as the source material shows, there's no confirmed mechanism that treats a personally-targeted report differently from a general-concern one — whether it should is itself an open design question this persona surfaces, not something the client has ruled on.

### Tasks (Touchpoints)
1. Upload/submit flagged video content for review.
2. Receive and save/retain the generated case ID.
3. Return later and use the case ID to check the case's status — likely checking back more frequently, given the personal stakes involved.

### Context of Use
A single, high-stakes session, likely on his phone, shortly after discovering the content — arriving in a state of personal distress and urgency. He has a direct, ongoing stake in what happens next, so both drop-off risk (if the flow has any friction) and repeat-checking risk run high.

### Constraints
- No account/login required — anonymous flow (confirmed UR-VU-02) — though anonymity here is protecting Marcus from a real, identifiable person (the uploader), not just an abstract privacy preference.
- Case ID is the sole recovery path for tracking (UR-ID-09).
- Plain-language requirement (UR-NFR-01) — arguably more load-bearing under acute distress, where jargon or ambiguity has a higher cost.
- Content sensitivity constraint (UR-NTH-06, no unprompted re-display) matters directly here, since the content is about him.

### Illustrative Quote
> *"This is about me. I need to know someone's actually going to do something before this spreads any further."*

**This is not a real quote.** It's an illustrative synthesis, written in the IBM persona-quote convention, but flagged here explicitly since it was authored by the team, not captured from a person.

---

## Assumptions & Validation Needed *(required per GStack Stage 3 + Planner acceptance criteria)*

**Assumptions used:**
- Marcus represents the "directly affected" reading of "the public" — a distinct reporting motivation from general concern, built as its own persona rather than folded into a single broad profile.
- Demographics (34, delivery driver, Melbourne) are a team-defined working profile, presented confidently per Emily Chin's 21 Aug guidance rather than left blank.
- The retaliation-anxiety and re-exposure pain points are inferred from the same Week 1 research notes and Marielle Lee interview material used across the Normal User persona set, applied to this profile's higher personal stakes.
- Assumes a higher check-back frequency than a general-concern reporter, purely from the personal-stakes difference; this is a plausible inference, not an observed behaviour.

**Still requires validation:**
- No real directly-affected reporters have been interviewed — every pain point above is a hypothesis, and this sub-type has thin grounding, since no source document distinguishes it explicitly.
- Whether the system should differentiate personally-targeted reports from general-concern reports at intake (e.g. prioritisation, different reassurance copy) is a genuinely open design question the client has not addressed either way.
- Per the 21 Aug 2026 Support Session ruling, real-user interviews are ruled out for this project; validation route is a synthetic AI-agent persona profile, consistent with the rest of the Normal User persona set.

---

### Traceability
- Builds on: `Research User Persona` (Week 1) research notes and `Conduct Expert Interview` (Marielle Lee) synthesis.
- Feeds into: `Normal User Requirements` (UR-NFR-01, UR-ID-09, UR-ST-09, UR-NTH-06).
- **Action for UX:** flag to PM/BA that "the public" spans more than one distinct reporting motivation, now represented as separate personas rather than a single profile.
