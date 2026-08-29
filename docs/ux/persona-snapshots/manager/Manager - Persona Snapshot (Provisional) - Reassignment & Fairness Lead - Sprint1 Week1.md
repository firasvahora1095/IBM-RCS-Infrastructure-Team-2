> ⚠️ **PROVISIONAL — ASSUMPTION-BASED, NOT CONFIRMED — LOWER CONFIDENCE THAN THE AUDITOR PERSONAS**
> This persona rests on noticeably thinner source material than the Auditor personas. The kickoff notes are explicit: *"Manager-side view was intentionally NOT demoed... Naresh explicitly wants the team to design this themselves using their own imagination — this is a deliberate gap, not an oversight."* Everything client-confirmed about the Manager role is an answer to a direct question, not an illustrated walkthrough. Per the 21 Aug 2026 Support Session, real-manager interviews are also ruled out — validation is via synthetic AI-agent persona simulation and internal team role-play, not real users.

# Persona Snapshot — Reassignment & Fairness Lead "Sam"

**Track:** Design / Product · **Sprint:** Sprint 1, Week 1 · **Owner:** Aleeya Ahmad (UX)

**Photo:**

![Sam](./Sam.jpeg)

**Naming note:** "Sam" is a team-invented name (gender-neutral, deliberately non-specific), distinct from "Jordan" and "Reese."

---

### Background
Sam oversees a team of auditors at the same scale as Jordan and Reese — roughly **10 auditors**, per Naresh's kickoff example — within the same safety/trust function. Sam's background mirrors the other two Manager variants (promoted from an experienced-reviewer track, comfortable with dashboards and reporting).

Sam represents the Manager role's **reassignment and fairness** variant: a genuinely different daily function from Jordan (incident response) and Reese (proactive prevention), not a cosmetic rename of either. Where Jordan's central tension is "did I respond fast enough to something urgent" and Reese's is "did I catch a problem before it happened," Sam's central tension is a decision-quality one: making consistent, defensible reassignment calls on declined cases, at volume, without necessarily viewing the source content — a caseload-management/triage function distinct from either incident response or preventive monitoring. This is grounded directly in our Week 1 research theme of deciding a declined case's fate without having seen it, which is Sam's dominant concern.

### Goals
- Make consistent, well-reasoned reassignment decisions on declined cases using only the auditor's comments, the SLA/exposure limit, and the AI's processing output.
- Be fair to both the declining auditor (not second-guessing sound judgment) and whichever auditor might receive the case next.
- Avoid becoming a review bottleneck, given the client explicitly flagged this as a lower-priority feature not meant to slow down the main flow.
- Spot patterns across repeated declines (e.g. a specific case type being consistently mis-tagged by the AI) rather than treating each decline as an isolated event.

### Frustrations / Pain Points
More inferred than the Auditor personas' pain points, flagged accordingly.

1. **Deciding a declined case's fate without having seen it.** This is Sam's dominant concern. The confirmed workflow has Sam deciding whether to reassign based on the auditor's comments, the SLA/exposure limit, and the AI's processing output — explicitly without necessarily reviewing the raw video, in keeping with the same exposure-minimisation logic applied to auditors. If the auditor's comments are brief or the AI's summary is ambiguous, Sam has no clean way to resolve genuine uncertainty about whether the case needs a different auditor or no reassignment at all.
2. **Free-text-only decline reasons make fast, confident decisions hard.** Without a structured decline-reason field, Sam must interpret open-ended comments under the same "don't slow down the main flow" pressure the client set for this feature.
3. **No confirmed way to spot recurring patterns across declines.** If several auditors decline similar content for similar reasons, there's no described mechanism for Sam to notice this is systemic (e.g. a specific AI mis-tagging pattern) rather than a series of unrelated individual judgment calls — an inferred extension of this theme, not something any source document addresses.
4. **Judging decline quality risks feeling like scrutiny rather than support.** Reassignment decisions implicitly involve judging whether the declining auditor's reasoning was sound — extending Marielle Lee's monitoring-vs-surveillance guidance to this specific decision point, where the risk isn't visibility itself but the auditor feeling their judgment is being second-guessed.

### Tasks (Touchpoints)
1. Review the declined-case queue as cases arrive, reading the auditor's comments, SLA/exposure data, and AI processing output.
2. Decide whether to reassign a declined case, and if so, to which auditor, weighing exposure/workload fairness.
3. Occasionally view source content directly when structured signals are genuinely ambiguous — an explicit tradeoff against the same exposure-minimisation logic that protects auditors, used sparingly rather than as a default.
4. Track decline reasons and outcomes over time to identify whether a pattern (e.g. a recurring AI mis-tag) is emerging.
5. Still receive and act on SOS alerts and monitor the exposure dashboard as needed, but treat these as secondary to the reassignment-decision workload that dominates Sam's day.

### Context of Use
A caseload-management working rhythm: Sam's day is organised around a queue of decisions requiring judgment calls under a "don't slow down the main flow" constraint, more akin to a triage function than either Jordan's incident-response urgency or Reese's continuous glanceable monitoring. Desktop-based professional tool, same assumption as the other Manager and Auditor personas' context.

### Constraints
- **Role-based access: Sam (as manager) sees all cases**, unlike auditors who see only their own assigned cases, confirmed in the brief's success criteria.
- **Wellbeing always outranks moderation speed** — the same governing client ruling constrains every reassignment decision Sam makes, including the tradeoff of viewing raw content directly in ambiguous cases.
- **Decline-routing tooling is explicitly lower build priority** — client-confirmed to be built toward the end of the pilot, meaning Sam's core workflow may be the most sparsely built of any Manager variant's tooling in early prototype iterations, despite being the most central to this persona specifically.
- **Monitoring UI must not tip into surveillance-feeling** for the auditors whose decline reasoning Sam is implicitly evaluating.
- **No demoed reference point** — unlike the Auditor role, there is no existing UI Sam's screens can be benchmarked against; a structured decline-reason field has no reference implementation anywhere in the source material.

### Illustrative Quote
> *"I'm not trying to second-guess anyone's judgment — I just need enough to go on to make the right call quickly."*

**Not a real quote.** Synthesised from Sam's dominant decide-without-viewing research theme, written in the IBM persona-quote convention.

---

## Assumptions & Validation Needed *(GStack Stage 3 + Planner acceptance criteria)*

**Assumptions used:**
- Sam's demographics and tenure are assumed comparable to Jordan's and Reese's (a team-defined working profile), since the meaningful difference across all three Manager variants is daily function, not background.
- Framing Sam as the **reassignment/fairness** variant is a team-defined posture choice, built by treating the decide-without-viewing research theme as Sam's dominant lens — a reasoned split, not a confirmed client distinction between manager types.
- ~10 auditors per manager, taken directly from Naresh's own kickoff example, applied identically across all three Manager variants.
- The pattern-spotting-across-declines concern and the decline-scrutiny tension are genuine extensions beyond that research theme's explicit text, flagged as more inferential.
- Assumes reassignment decisions are frequent/voluminous enough to justify a manager whose day is organised around them specifically — this is a plausible but unconfirmed assumption, since decline-routing is explicitly a lower-priority feature and its real-world frequency is unknown.

**Still requires validation:**
- No real managers or team leads have been interviewed — same 21 Aug 2026 ruling as the other Manager personas.
- Whether reassignment decisions occur often enough in practice to justify treating this as a distinct manager working style, rather than an occasional task within Jordan's or Reese's day, is untested.
- A structured decline-reason field, this persona's central design implication, sits behind decline-routing itself being a lower-priority feature. Treated here as a confident team design intention to build toward, ready to be justified to Naresh on its reasoning when decline-routing comes up for build.

---

### Traceability
- Companion personas: `Manager - Persona Snapshot (Provisional) - Generic - Sprint1 Week1.md`, `Manager - Persona Snapshot (Provisional) - Reactive Incident Lead - Sprint1 Week1.md` (Jordan), `Manager - Persona Snapshot (Provisional) - Proactive Oversight Lead - Sprint1 Week1.md` (Reese).
- **Action for UX:** a structured decline-reason field is a Week 1 design intention to revisit once decline-routing is actually scheduled for build.
