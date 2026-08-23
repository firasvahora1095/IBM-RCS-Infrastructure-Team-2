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

Marcus is the **subject of the flagged content himself** — a video of a private altercation involving him was filmed without his consent and is being shared and re-shared. A friend sent him the link. He isn't reporting out of general concern about the situation; he's reporting because it's happening *to him*, and every hour it stays up feels like a personal harm. Marcus represents one Normal User **variant**, alongside Casey (concerned bystander) and Priya (reporting on behalf of someone else) — not a separate definition of "the public."

### Goals
- Get timely acknowledgement and clear visibility into where the report stands — the urgency is personal, not general concern. (The current system scope doesn't confirm that the platform removes content from wherever it's being shared/circulated — this goal is about the review process being visibly responsive, not a confirmed takedown-speed guarantee.)
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
- No account/login required to complete the flow (confirmed UR-VU-02) — this confirms no account is required, not that the flow is anonymous end-to-end; not needing an account is what's protecting Marcus from a real, identifiable person (the uploader) here, not an abstract privacy preference.
- The case ID is his main credential for tracking the case; Copy Case ID and local browser storage support retaining it (UR-ID-04, UR-ID-06, UR-ID-07). UR-ID-09 covers the specific warning before leaving the confirmation screen without saving it.
- Plain-language requirement (UR-NFR-01) — arguably more load-bearing under acute distress, where jargon or ambiguity has a higher cost.
- Content sensitivity constraint matters directly here, since the content is about him: if it's ever displayed back to him, UR-NTH-06 requires it sit behind a content warning rather than being shown unprompted.

### Illustrative Quote
> *"This is about me. I need to know someone's actually looking at this, and that it's moving forward."*

**This is not a real quote.** It's an illustrative synthesis, written in the IBM persona-quote convention, but flagged here explicitly since it was authored by the team, not captured from a person.

---

## Assumptions & Validation Needed *(required per GStack Stage 3 + Planner acceptance criteria)*

**Assumptions used:**
- Marcus represents the "directly affected" **variant** of the Normal User role — a distinct reporting motivation from general concern, built as its own persona rather than folded into a single broad profile.
- Demographics (34, delivery driver, Melbourne) are a team-defined working profile, presented confidently per Emily Chin's 21 Aug guidance rather than left blank.
- The retaliation-anxiety and re-exposure pain points are inferred from the same Week 1 research notes and Marielle Lee interview material used across the Normal User persona set, applied to this profile's higher personal stakes.
- Assumes a higher check-back frequency than a general-concern reporter, purely from the personal-stakes difference; this is a plausible inference, not an observed behaviour.

**Still requires validation:**
- No real directly-affected reporters have been interviewed — every pain point above is a hypothesis, and this sub-type has thin grounding, since no source document distinguishes it explicitly.
- Whether the system should differentiate personally-targeted reports from general-concern reports at intake (e.g. prioritisation, different reassurance copy) is a genuinely open design question the client has not addressed either way.
- Per the 21 Aug 2026 Support Session ruling, real-user interviews are ruled out for this project; the available route is a synthetic AI-agent persona profile, used as a proxy to stress-test and refine these assumptions rather than to validate real user behaviour, consistent with the rest of the Normal User persona set.

---

### Traceability
- Builds on: `Research User Persona` (Week 1) research notes and `Conduct Expert Interview` (Marielle Lee) synthesis.
- Feeds into: `Normal User Requirements` — pain point 1 (urgency with no visibility) → UR-ST-02, UR-ST-09; pain point 2 (re-exposure risk at submission) → UR-NTH-06; pain point 3 (retaliation anxiety) → UR-VU-02, UR-NFR-02; pain point 4 (no visible distinction for personal-stakes reports) → open, not currently traced to a requirement. Also: UR-VU-04 (immediate confirmation), UR-ID-04/UR-ID-06/UR-ID-07/UR-ID-09 (case ID retention path), UR-NFR-01 (plain language).
- **Action for UX:** flag to PM/BA that "the public" spans more than one distinct reporting motivation, now represented as separate personas rather than a single profile.
