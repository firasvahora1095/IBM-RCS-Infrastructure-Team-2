> ⚠️ **PROVISIONAL — ASSUMPTION-BASED, NOT CONFIRMED — LOWER CONFIDENCE THAN THE AUDITOR PERSONAS**
> This persona rests on noticeably thinner source material than the Auditor personas. The kickoff notes are explicit: *"Manager-side view was intentionally NOT demoed... Naresh explicitly wants the team to design this themselves using their own imagination — this is a deliberate gap, not an oversight."* Everything client-confirmed about the Manager role is an answer to a direct question, not an illustrated walkthrough. Per the 21 Aug 2026 Support Session, real-manager interviews are also ruled out — validation is via synthetic AI-agent persona simulation and internal team role-play, not real users.

# Persona Snapshot — Proactive Oversight Lead "Reese"

**Track:** Design / Product · **Sprint:** Sprint 1, Week 1 · **Owner:** Aleeya Ahmad (UX)

**Photo:**

![Reese](./Reese.jpeg)

**Naming note:** "Reese" is a team-invented name (gender-neutral, deliberately non-specific), distinct from "Jordan" and "Sam."

---

### Background
Reese is a manager overseeing the same scale of team as Jordan — roughly **10 auditors**, per Naresh's kickoff example — within the same safety/trust function. Reese's background and access to tooling mirror Jordan's (promoted from an experienced-reviewer track, comfortable with dashboards and reporting), but the two personas exist to represent a genuinely different **working posture**, not a different seniority or team size.

Reese represents the Manager role's **proactive oversight** variant: where Jordan's day is organised around responding to what has already surfaced (SOS, declines), Reese's day is organised around actively watching the team's exposure and workload *before* anything goes wrong, using the per-auditor exposure-limit controls the client explicitly approved. This is grounded directly in our Week 1 research theme of spotting a limit about to be hit, not just one already broken, which is Reese's dominant concern.

### Goals
- Notice which auditors are *approaching* their exposure limit, not just which have already hit it, so intervention happens before a limit is breached rather than after.
- Use per-auditor exposure-limit controls confidently and fairly, adjusting them proactively based on observed workload and wellbeing signals.
- Keep an oversight dashboard glanceable across roughly 10 people, rather than requiring a manual row-by-row scan.
- Maintain the protective-not-surveillance framing while actively intervening — a harder balance than passive monitoring, since Reese's role involves visibly acting on what the dashboard shows, not just watching it.

### Frustrations / Pain Points
More inferred than the Auditor personas' pain points, flagged accordingly.

1. **Spotting a limit about to be hit, not just one already broken.** This is Reese's dominant concern. Since the manager-side view was deliberately left undesigned by the client, there's a real risk of defaulting to a dashboard that only shows current/final exposure numbers per auditor — forcing Reese to manually scan and mentally compare roughly ten rows to catch a limit about to be crossed. A purely reactive/tabular view works against the platform's own stated proactive-wellbeing purpose.
2. **The SOS-as-plain-email risk still sits in the background, even for a proactive-postured manager.** Reese's main mode is prevention, but the same confirmed mechanism, a plain email, still needs to be trustworthy for the cases prevention doesn't catch in time.
3. **No confirmed UI pattern for adjusting individual exposure limits.** The capability itself is client-approved, but nothing in the source material describes how a manager should set or change a limit, at what granularity, or how often — a genuinely open design question this persona surfaces.
4. **Uncertainty about how a downward limit adjustment reads to the auditor receiving it.** Extending Marielle Lee's monitoring-vs-surveillance guidance to active intervention rather than passive visibility: lowering someone's limit could read as a vote of no confidence rather than care, depending on how it's framed — an inferred tension, not something any source document addresses.

### Tasks (Touchpoints)
1. Proactively review the exposure/workload dashboard multiple times through a shift, not only when prompted by an alert.
2. Identify and act on an "approaching limit" state across the team, ahead of any auditor actually reaching their cap.
3. Set and adjust individual, per-auditor exposure limits based on observed workload and wellbeing signals — a confirmed client-approved capability.
4. Still receive and act on SOS alerts and declined-case reassignments as they arise, but treat them as exceptions to an otherwise proactive day rather than its main mode.
5. Plan ahead for team workload distribution (e.g. anticipating a heavier day) rather than only reacting to it.

### Context of Use
A sustained, continuous monitoring rhythm rather than an interrupt-driven one: Reese checks the dashboard as a standing habit throughout the shift, in a calm, glanceable register, punctuated only occasionally by the same urgent SOS register Jordan's persona lives in more often. Desktop-based professional tool, same assumption as the other Manager and Auditor personas' context.

### Constraints
- **Role-based access: Reese (as manager) sees all cases**, unlike auditors who see only their own assigned cases, confirmed in the brief's success criteria.
- **Wellbeing always outranks moderation speed** — the same governing client ruling constrains every decision Reese makes about limit-setting and pacing.
- **Decline-routing tooling is lower build priority** — even for a proactively-postured manager, reassignment tooling may be sparse in Sprint 1/2 prototypes.
- **Monitoring UI must not tip into surveillance-feeling** — arguably a sharper constraint for Reese than for Jordan, since Reese's whole working style involves actively watching and adjusting individual limits, not just responding when something already happened.
- **No demoed reference point** — unlike the Auditor role, there is no existing UI Reese's screens can be benchmarked against; the "approaching limit" dashboard state itself has no reference implementation anywhere in the source material.

### Illustrative Quote
> *"I'd rather catch it before someone's close to the line than find out after the fact."*

**Not a real quote.** Synthesised from the approaching-limit research theme, written in the IBM persona-quote convention.

---

## Assumptions & Validation Needed *(GStack Stage 3 + Planner acceptance criteria)*

**Assumptions used:**
- Reese's demographics and tenure are assumed comparable to Jordan's (a team-defined working profile), since the meaningful difference between the two personas is posture, not background — a deliberate choice to isolate the reactive-vs-proactive variable rather than conflating it with seniority.
- Framing Reese as the **proactive** variant is a team-defined posture choice, built by treating the approaching-limit research theme as Reese's dominant lens — a reasoned split, not a confirmed client distinction between manager types.
- ~10 auditors per manager, taken directly from Naresh's own kickoff example, applied identically to Reese as to Jordan.
- The "approaching limit" dashboard state and the downward-adjustment-reads-as-scrutiny tension are genuine extensions beyond the research notes' explicit text, flagged as more inferential.

**Still requires validation:**
- No real managers or team leads have been interviewed — same 21 Aug 2026 ruling as the other Manager personas.
- Whether a genuinely proactive-postured manager (as opposed to Jordan's reactive posture) is a realistic full-time working style, or whether all managers blend both situationally, is untested — this persona is a working hypothesis to pressure-test in ideation.
- The proactive "approaching limit" dashboard state goes beyond what was explicitly confirmed (a plain email on breach). Per client guidance that this design depth is the team's own job to define, this is treated here as a confident team decision, ready to be justified to Naresh on its reasoning rather than pre-cleared with him.

---

### Traceability
- Companion personas: `Manager - Persona Snapshot (Provisional) - Generic - Sprint1 Week1.md`, `Manager - Persona Snapshot (Provisional) - Reactive Incident Lead - Sprint1 Week1.md` (Jordan), `Manager - Persona Snapshot (Provisional) - Reassignment & Fairness Lead - Sprint1 Week1.md` (Sam).
- **Action for UX:** the "approaching limit" dashboard state is a confident team design decision beyond the confirmed email-on-breach mechanism; carry it into wireframing and be ready to walk Naresh through the reasoning if he asks.
