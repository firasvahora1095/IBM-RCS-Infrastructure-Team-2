> ⚠️ **PROVISIONAL — ASSUMPTION-BASED, NOT CONFIRMED — LOWER CONFIDENCE THAN THE AUDITOR PERSONAS**
> This persona rests on noticeably thinner source material than the Auditor personas. The kickoff notes are explicit: *"Manager-side view was intentionally NOT demoed... Naresh explicitly wants the team to design this themselves using their own imagination — this is a deliberate gap, not an oversight."* Everything client-confirmed about the Manager role is an answer to a direct question, not an illustrated walkthrough. Per the 21 Aug 2026 Support Session, real-manager interviews are also ruled out — validation is via synthetic AI-agent persona simulation and internal team role-play, not real users.

# Persona Snapshot — Manager (Generic)

**Track:** Design / Product · **Sprint:** Sprint 1, Week 1 · **Owner:** Aleeya Ahmad (UX)

**Photo:** *Intentionally omitted* — same reasoning as the other generic personas.

**Naming note:** Intentionally unnamed — this persona represents any manager overseeing a team of auditors on this platform, not one specific working profile.

---

### Background
This persona represents **any manager** overseeing a pool of auditors within the platform's trust & safety function — Naresh's own kickoff example puts this at roughly **10 auditors per manager**, adopted here as the working number. Based on our research, the Manager role covers more than one meaningfully distinct working posture, mapped directly onto the three Week 1 manager research notes: a manager whose day is dominated by responding to incidents as they surface (SOS, escalations), one whose day is dominated by proactively watching the team's exposure before problems occur, and one whose day is dominated by the declined-case queue and the fairness of reassignment decisions. Each is detailed in its own dedicated persona; this generic version is for contexts where a single, lightweight reference is more useful than that specificity — for example, a proposal document's Target Users bullet, a one-line requirements-doc persona reference, or a stakeholder summary slide.

The manager does not do frontline content review as their main job; their role is oversight — tracking each auditor's exposure and workload, responding to wellbeing escalations, and making reassignment calls when a case is declined.

### Goals
- Keep the whole team functioning without any individual auditor being overexposed or burning out.
- Respond fast and supportively when an auditor is exposed beyond expected limits or sends an SOS.
- Make fair, well-informed reassignment decisions on declined cases.
- Maintain enough visibility into the team's exposure/workload to act early, without that visibility feeling like surveillance to the auditors being watched.
- Use the client-approved capability to set individual exposure limits per auditor, more granular than a single team-wide cap.

### Frustrations / Pain Points
Sourced from Aleeya's Week 1 manager research notes; hypotheses, not confirmed findings, more inferred than the Auditor personas' pain points since the client deliberately left this view undesigned.

1. **SOS notifications arrive as a plain email, indistinguishable from routine correspondence.** The confirmed mechanism carries no inherent urgency signal, risking a delayed response to exactly the moment wellbeing-first design says should be fastest.
2. **Oversight tooling risks being reactive rather than preventive.** Without a dashboard state that surfaces who is *approaching* a limit (not just who has hit one), a manager may only notice a problem after it has already occurred.
3. **Declined-case reassignment decisions rest on thin structured context.** The confirmed process has the manager deciding from the auditor's comments, the SLA/exposure limit, and the AI's output — without necessarily viewing the source content.
4. **The protective-monitoring-vs-surveillance line applies to the manager's own dashboard, not just the auditor's experience of being watched.** Enough information to act responsibly, without training auditors to feel constantly monitored.

### Tasks (Touchpoints)
1. Monitor an exposure/workload dashboard across the whole auditor team.
2. Set individual, per-auditor exposure limits — a confirmed client-approved capability.
3. Receive and act on SOS alerts / email notifications when an auditor is over-exposed.
4. Review and reassign declined cases, weighing auditor comments, SLA/exposure data, and AI output.
5. Follow up directly with an auditor after an SOS or wellbeing flag; the exact interaction shape is team-designed.

### Context of Use
A sustained oversight role rather than a single task session — periodic dashboard checks through a shift, combined with the need to be interruptible by real-time SOS alerts, a different UX register (urgent, needs-immediate-attention) from routine monitoring (calm, glanceable). Desktop-based professional tool, same assumption as the Auditor personas' context, for the same reason: a work tool, not a public-facing app.

### Constraints
- **Role-based access: managers see all cases**, unlike auditors who see only their own assigned cases, confirmed in the brief's success criteria.
- **Wellbeing always outranks moderation speed** — the same governing client ruling that constrains every auditor decision also constrains every manager decision about reassignment, pacing, and intervention.
- **Decline-routing tooling is lower build priority** — built toward the end of the pilot, so reassignment workflow tooling may be sparse in Sprint 1/2 prototypes even though it's core to the role.
- **Monitoring UI must not tip into surveillance-feeling** for the auditors being overseen.
- **No demoed reference point** — unlike the Auditor role, there is no existing UI manager screens can be benchmarked against. Every screen here is original team design, which the client explicitly wants.

### Illustrative Quote
> *"I don't need to see everything my team does every second — I need to know the moment one of them actually needs me."*

**Not a real quote.** Synthesised from the "wellbeing over speed" priority ruling and the reactive-monitoring pattern confirmed in the client Q&A — written in the IBM persona-quote convention, flagged for the same reason as the other personas' quotes.

---

## Assumptions & Validation Needed *(GStack Stage 3 + Planner acceptance criteria)*

**Assumptions used:**
- Demographics and working posture are deliberately left unspecified — this persona's value is in representing the role at a general level, not in a specific working profile the way the role's other personas do.
- ~10 auditors per manager, taken directly from Naresh's own example number in the kickoff meeting, adopted here as our working number rather than an open question.
- The four goals, frustrations, touchpoints, and constraints above are the team's assessment of what generalises across the Manager role as a whole.
- Assumes stakeholders reaching for a single Manager reference will use this generic version rather than defaulting to whichever specific persona they happen to know about.

**Still requires validation:**
- No real managers or team leads have been interviewed — same 21 Aug 2026 ruling as the Auditor personas: not permitted for this project, substitute with synthetic AI-agent simulation and/or internal role-play, with PM/BA acting as Auditor/Manager, explicitly "Recommended for HD Grade" for Sprint 2.
- The manager view is, by the client's own framing, the part of this project with the *most* open design space — treat this persona (and its variants) as a working hypothesis to pressure-test in ideation, not a settled brief.
- Whether these goals, frustrations, and constraints hold once the Manager role's more specific working postures are fully scoped out in requirements — see the role's other dedicated personas for that detail.

---

### Traceability
- Companion personas: `Manager - Persona Snapshot (Provisional) - Reactive Incident Lead - Sprint1 Week1.md` (Jordan), `Manager - Persona Snapshot (Provisional) - Proactive Oversight Lead - Sprint1 Week1.md` (Reese), `Manager - Persona Snapshot (Provisional) - Reassignment & Fairness Lead - Sprint1 Week1.md` (Sam).
- Feeds into: Manager Requirements (not yet drafted as a standalone BA document — this is Jana's upcoming Week 2 "Finalize Persona Requirements" task). See also: `../../manager-assumptions-note-sprint1-week2.md` for the Sprint 2 hypotheses and core-journey mapping that build on this persona set.
- **Action for UX:** use this file (not any single variant) as the pointer in any document that needs one general Manager reference — e.g. the master proposal document's Target Users section.
