> ⚠️ **PROVISIONAL — ASSUMPTION-BASED, NOT CONFIRMED — LOWER CONFIDENCE THAN THE AUDITOR PERSONAS**
> This persona rests on noticeably thinner source material than the Auditor personas. The kickoff notes are explicit: *"Manager-side view was intentionally NOT demoed... Naresh explicitly wants the team to design this themselves using their own imagination — this is a deliberate gap, not an oversight."* Everything client-confirmed about the Manager role is an answer to a direct question, not an illustrated walkthrough. Per the 21 Aug 2026 Support Session, real-manager interviews are also ruled out — validation is via synthetic AI-agent persona simulation and internal team role-play, not real users.

# Persona Snapshot — Reactive Incident Lead "Jordan"

**Track:** Design / Product · **Sprint:** Sprint 1, Week 1 · **Owner:** Aleeya Ahmad (UX)
**Photo:**

![Jordan](./Jordan.jpeg)
**Naming note:** "Jordan" is a team-invented name (gender-neutral, deliberately non-specific) — the brief and kickoff notes never name or describe the manager directly, only their responsibilities.

---

### Background
Jordan is **38**, based in the same Melbourne office as the Auditor team, and was **promoted into the manager role after roughly 6 years as a senior auditor** — a common progression path in trust & safety, where team leads are usually drawn from experienced reviewers rather than hired externally. Jordan oversees a team of auditors within the same safety/trust function — Naresh's own example puts this at roughly **10 auditors per manager**, adopted as the working number. Auditor findings (comments + adjusted severity/CVI ratings) flow up to Jordan's review queue.

Jordan represents the Manager role's **reactive incident-response** variant: the meaningful difference from the role's other two named variants is posture, not headcount or seniority. Where "Reese" (Proactive Oversight Lead) structures the day around actively scanning the team before problems occur, and "Sam" (Reassignment & Fairness Lead) structures the day around the declined-case queue specifically, Jordan's day is dominated by responding to whatever has already surfaced — SOS emails, escalations, and check-ins after the fact. This is grounded directly in the SOS-as-plain-email risk theme from our Week 1 research, which is Jordan's dominant concern.

### Goals
- Respond fast and supportively when an auditor is exposed beyond expected limits or sends an SOS — this is Jordan's central daily concern, directly downstream of the client's "wellbeing always wins" ruling.
- Trust that an SOS notification is unmissable and clearly distinguishable from routine correspondence.
- Make fair, well-informed reassignment decisions on declined cases as they arrive, without them stacking into a backlog.
- Maintain enough team visibility to act early, without that visibility feeling like surveillance to the auditors being watched.

### Frustrations / Pain Points
More inferred than the Auditor personas' pain points, flagged accordingly.

1. **An SOS notification shouldn't look like just another email.** This is Jordan's dominant concern. The confirmed mechanism, a plain email, carries no inherent urgency signal distinguishing it from routine inbox noise. Juggling oversight of ten people's exposure levels, case queues, and reassignment decisions, Jordan could plausibly miss or delay-open an SOS email exactly when speed of response matters most.
2. **Currently reactive by design, not preventive.** The one confirmed mechanism is: when an auditor is exposed beyond expected levels, the system sends Jordan a simple email notification. That's after-the-fact, not a way to intervene before overexposure happens.
3. **Declined-case reassignment arrives as an interruption to an already reactive day.** In the confirmed process, Jordan decides based on the auditor's comments, the SLA/exposure limit, and the AI processing output — but this is also explicitly a lower-build-priority feature, so Jordan's actual tooling for this may be minimal in early prototype iterations, arriving as one more thing landing in the queue rather than a structured workflow.
4. **No confirmed shape for the "check in with the auditor" step.** The client confirmed a manager should follow up with an auditor after an SOS, but never described what that follow-up looks like in-app — squarely inside the deliberate gap the client left for the team to design.

### Tasks (Touchpoints)
1. Receive and act on SOS alerts / email notifications when an auditor is over-exposed — the highest-priority, most time-sensitive item on Jordan's list.
2. Review and reassign declined cases as they arrive, weighing auditor comments, SLA/exposure data, and AI output.
3. Follow up directly with an auditor after an SOS or wellbeing flag; the exact interaction shape is team-designed.
4. Check the exposure/workload dashboard when prompted by an incident, more than as a standing daily habit.
5. Set individual, per-auditor exposure limits when a specific situation calls for it — a confirmed client-approved capability.

### Context of Use
An interrupt-driven working rhythm: Jordan's day is punctuated by urgent, unpredictable events (an SOS, a decline) rather than structured around continuous monitoring. This is a different UX register (urgent, needs-immediate-attention) from the calm, glanceable register a more proactive posture would need. Desktop-based professional tool, same assumption as the Auditor personas' context.

### Constraints
- **Role-based access: Jordan (as manager) sees all cases**, unlike auditors who see only their own assigned cases — confirmed in the brief's success criteria: reviewers see only assigned cases, the supervisor sees all.
- **Wellbeing always outranks moderation speed** — the same governing client ruling that constrains every auditor decision also constrains every decision Jordan makes about reassignment, pacing, and intervention.
- **Decline-routing tooling is lower build priority** — built toward the end of the pilot, so Jordan's reassignment workflow may be sparse in Sprint 1/2 prototypes even though it's core to the role.
- **Monitoring UI must not tip into surveillance-feeling** for the auditors Jordan oversees.
- **No demoed reference point** — unlike the Auditor role, there is no existing UI Jordan's screens can be benchmarked against.

### Illustrative Quote
> *"I don't need to see everything my team does every second — I need to know the moment one of them actually needs me."*

**Not a real quote.** Synthesised from the "wellbeing over speed" priority ruling and the reactive-monitoring pattern confirmed in the client Q&A — written in the IBM persona-quote convention.

---

## Assumptions & Validation Needed *(GStack Stage 3 + Planner acceptance criteria)*

**Assumptions used:**
- Jordan's demographics (38, promoted from 6 years as senior auditor, Melbourne-based) are a **team-defined working profile**, built from typical trust & safety promotion patterns and presented confidently per Emily Chin's 21 Aug guidance.
- ~10 auditors per manager, taken directly from Naresh's own example number in the kickoff meeting.
- Framing Jordan as the **reactive** variant (as distinct from Reese and Sam) is a team-defined posture choice, built by treating the SOS-as-plain-email theme as Jordan's dominant lens — a reasoned split, not a confirmed client distinction between manager types.
- Jordan's day-to-day frustrations are the team's own inference from confirmed mechanics, not something the client stated as pain points.
- Assumes the follow-up-after-SOS interaction is app-mediated at all — it's equally possible the client expects this to happen outside the platform (a phone call, a separate HR process).

**Still requires validation:**
- No real managers or team leads have been interviewed — 21 Aug 2026 ruling: not permitted for this project, substitute with synthetic AI-agent simulation and/or internal role-play, explicitly "Recommended for HD Grade" for Sprint 2.
- The manager view is, by the client's own framing, the part of this project with the *most* open design space — treat this persona as a working hypothesis to pressure-test in ideation, not a settled brief.
- Whether a genuinely reactive-postured manager (as opposed to a proactive one, per Reese) is a realistic full-time working style, or whether all managers blend both postures situationally, is untested.

---

### Traceability
- Companion personas: `Manager - Persona Snapshot (Provisional) - Generic - Sprint1 Week1.md`, `Manager - Persona Snapshot (Provisional) - Proactive Oversight Lead - Sprint1 Week1.md` (Reese), `Manager - Persona Snapshot (Provisional) - Reassignment & Fairness Lead - Sprint1 Week1.md` (Sam).
- See also: `../../manager-assumptions-note-sprint1-week2.md` — the SOS core-journey mapping in that note is built primarily around Jordan's reactive posture.
- **Action for UX:** the Manager persona is the least client-grounded of the three roles and may most benefit from being a focus of the internal PM/BA role-play usability testing recommended in the 21 Aug minutes.
