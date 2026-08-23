> ⚠️ **PROVISIONAL — ASSUMPTION-BASED, NOT CONFIRMED**
> This persona is a hypothesis, not a validated finding. Per the 21 Aug 2026 Support Session, client-side interviews with real auditors are ruled out due to delay and penalty risk for a capstone project on this timeline, and defining persona depth is explicitly the UX/BA team's own job — the team is authorised to build personas from independent research and document baseline assumptions with supporting evidence, made with confidence and ready to be justified on their reasoning, rather than sent back for client validation. Grounding here comes from source documents (IBM brief, kickoff meeting, client Q&A, expert interview) plus a planned synthetic AI-agent persona simulation, not real reviewer interviews.

# Persona Snapshot — Frontline Reviewer "Maya"

**Track:** Design / Product · **Sprint:** Sprint 1, Week 1 · **Owner:** Aleeya Ahmad (UX)

**Photo:**

![Maya](./Maya.jpeg)

**Naming note:** "Maya" is not an invented name — she is the named example reviewer in IBM's own project brief ("Maya reviews flagged video for a safety team eight hours a day..."). Using the client's own persona name keeps this snapshot directly traceable to source material rather than introducing a competing fictional identity.

---

### Background
Maya is **31, holds a psychology degree, and has been working in trust & safety for about 3 years** — she moved into content moderation from a community-support role, which is a common entry path into this field. She works full-time (approx. 8 hours/day) for a safety/trust team at an organisation using this platform, based out of a Melbourne office (hybrid). She's not a technical or AI specialist — she's a domain reviewer whose job is judgment, not engineering, though she's comfortable using internal dashboards and case-management tools day to day.

Cases are routed to her automatically via weighted random assignment (factoring in her current exposure level and case count, not pure randomness). She reviews AI-processed cases, can override or adjust the AI's severity/CVI rating, writes comments explaining her reasoning, and submits findings up to her manager. As the brief states directly: *"the volume is relentless and the content takes a toll no job description prepared her for."*

Maya represents the Auditor role's **early-tenure, still-calibrating** variant, sitting between "Jules" (New Hire) and "Theo" (Senior Reviewer) on the same tenure spectrum — she is competent and conscientious, but at 3 years in, she has not yet fully internalised that declining a case or triggering SOS carries no real professional cost; those moments still carry emotional weight for her. This is the meaningful difference from the role's other two named variants: Jules has no lived experience with the wellbeing systems at all, Maya has some but is still uncertain, and Theo has years more tenure and has largely resolved the emotional-calibration questions that still sit with Maya, having instead developed a different, more analytical set of frustrations around system transparency.

### Goals
- Do accurate, well-reasoned review work, including confidently overriding the AI when it's wrong — a client-confirmed capability, illustrated by the client's own example of flagging a "football brawl" video as non-threatening despite an AI violence tag.
- Get through her shift without unnecessary exposure to the worst material, relying on AI pre-screening, blur-by-default, and severity summaries to do the heavy lifting before she has to look directly.
- Decline a case when she needs to, without it feeling like a black mark against her performance.
- Get real support quickly if something goes wrong, whether accidental exposure or distressing content, not buried in a menu.
- Feel like the monitoring around her (exposure tracking, wellbeing checks) exists *for* her, not *on* her.

### Frustrations / Pain Points
Sourced from Aleeya's Week 1 auditor research notes, weighted toward the decline-stigma and SOS-trust themes given Maya's earlier-tenure profile; hypotheses, not confirmed findings.

1. **Fear of looking like she can't handle it.** This is Maya's dominant pain point. Even though "respectfully decline" is explicitly designed as a legitimate, protected choice, Maya has no way of knowing from the interface whether declining is genuinely judgment-free or silently tracked as a performance signal. Without visible reassurance, she may default to accepting cases she shouldn't, to avoid seeming unable to cope.
2. **Not trusting that SOS actually does something.** Also dominant for Maya. The confirmed requirement only specifies that SOS triggers a manager email. In the moment of unexpected exposure, an action that just "sends an email somewhere" carries real risk of feeling inadequate, with no visible confirmation that anyone will see it in time.
3. **Consent-gate wording that risks feeling manipulative.** The kickoff demo used "Do you want to proceed willingly?" before showing flagged content. Marielle Lee, in her expert interview, pushed back hard on this: *"there is no such thing as a 'soft' dark pattern"* — her recommendation is to strip it to a plain "Would you like to proceed?" with no persuasive framing.
4. **Monitoring that could tip from protective into surveillance-feeling.** Managers can see Maya's exposure time, case history, and wellbeing alerts. Marielle's guidance: disclose this once (consent-style), then keep it in the background.

### Tasks (Touchpoints)
1. Log in and view assigned case list — thumbnails auto-blurred/suppressed by default, severity-tagged.
2. Open a case: review AI severity score, incident timeline, narrative summary, entity/audio analysis (Watson Speech-to-Text transcription + intensity graph).
3. Pass through the consent/warning gate before viewing raw flagged content (accept and proceed, or decline).
4. Toggle blur/grayscale to self-control exposure level while reviewing; video auto-unblurs only when she deliberately presses play.
5. Adjust the AI's severity/CVI rating if she disagrees, write comments explaining her reasoning, and submit the full bundle (score, entities, incidents, session exposure, severity, supporting report) to her manager.
6. Trigger SOS if unexpectedly exposed, or use a wellbeing check-in / "talk to my manager" action if a specific case is distressing.

### Context of Use
Sustained, professional working context — not a single spontaneous visit like the Normal User. Maya works through a queue of cases across a shift, with cumulative exposure building up over the day (capped, not a per-case reset). Almost certainly desktop-based, in a work setting (office or WFH) rather than mobile. Cognitive and emotional load compounds across the session, which is why cooldowns and exposure caps are structural, not optional add-ons.

### Constraints
- **Daily exposure cap: 2 hours / 120 minutes** — the client-confirmed target for testing, explicitly measured by exposure time rather than case count. Note: the live kickoff demo showed a 4-hour cap; this is an acknowledged, still-open discrepancy in the source documents — treat 120 minutes as authoritative per the more recent, explicit client confirmation.
- **Case assignment is weighted**, not purely random, by exposure level and case count, per client confirmation, used to round-robin fairly across auditors.
- **Wellbeing always outranks moderation speed** — an explicit, unambiguous client ruling. This is a governing constraint on every tradeoff involving Maya.
- **Role-based access**: Maya sees only her own assigned cases, never other auditors' cases; her manager sees all, confirmed in the brief's success criteria.
- **Mandatory cooldown** enforced by the system after high-severity content exposure.
- **Right to decline exists, but is a lower-build-priority feature** — the client explicitly directed that decline-to-manager routing be built toward the *end* of the build, so Maya's decline experience may be minimally represented in early prototype iterations even though it's core to her persona.

### Illustrative Quote
> *"The volume doesn't stop. I just need to know the tool actually has my back if something gets through."*

**Not a real quote** — synthesised from the brief's own storyline framing and the wellbeing themes raised throughout the kickoff notes and Marielle Lee's interview, written in the IBM persona-quote convention. Flagged here explicitly since it wasn't captured from an actual reviewer.

---

## Assumptions & Validation Needed *(GStack Stage 3 + Planner acceptance criteria)*

**Assumptions used:**
- Maya's demographics (31, psychology background, ~3 years in trust & safety, Melbourne-based hybrid role) go beyond what the brief states directly — they're a **team-defined working profile** built from typical trust & safety hiring patterns, presented confidently per Emily Chin's 21 Aug guidance rather than left undefined.
- Positioning Maya as the "earlier-tenure, still-calibrating" variant (as distinct from Theo) is a team-defined framing choice, made to give the Auditor role's two named variants a genuine, evidence-grounded difference rather than a cosmetic rename.
- Whether declining a case genuinely carries no perceived penalty in practice is *not* confirmed solved — Marielle flagged it as a design target, not an existing guarantee.
- The 4-hour (demo) vs. 2-hour/120-minute (client Q&A) exposure-cap discrepancy is still unresolved in the source documents; this persona treats 120 minutes as authoritative per the more explicit, more recent client answer.
- Consent-gate wording change (dropping "willingly") is Marielle's expert recommendation, not yet built or tested.

**Still requires validation:**
- No real auditors/reviewers have been interviewed — this is confirmed and permanent for this project (client-side interview access was explicitly ruled out on 21 Aug 2026 due to delay/penalty risk).
- Validation will instead come from a **synthetic AI-agent persona simulation** of Maya, and/or internal team role-play (PM/BA acting as Auditor/Manager, flagged "Recommended for HD Grade" for Sprint 2 usability testing) — not real-user recruitment.
- This is an explicitly sanctioned substitution for a capstone project, not a claim that synthetic validation is equivalent to real validation for a production deployment.

---

### Traceability
- Companion personas: `Auditor - Persona Snapshot (Provisional) - Generic - Sprint1 Week1.md`, `Auditor - Persona Snapshot (Provisional) - New Hire - Sprint1 Week1.md` (Jules), `Auditor - Persona Snapshot (Provisional) - Senior Reviewer - Sprint1 Week1.md` (Theo), `../manager/Manager - Persona Snapshot (Provisional) - Reactive Incident Lead - Sprint1 Week1.md` (Jordan).
- **Action for UX:** once Auditor requirements are drafted (BA task, not yet started as of this snapshot), link this persona alongside Jules and Theo the same way Casey/Marcus/Priya are linked in the Normal User requirements doc.
