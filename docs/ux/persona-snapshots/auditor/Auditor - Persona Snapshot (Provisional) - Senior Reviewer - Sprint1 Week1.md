> ⚠️ **PROVISIONAL — ASSUMPTION-BASED, NOT CONFIRMED**
> This persona is a hypothesis, not a validated finding, and rests on thinner source grounding than "Maya" — no source document describes a second, more senior auditor profile directly; this variant is a team-authored extension built by re-weighting the same Week 1 auditor research notes toward a different, equally plausible tenure profile. Per the 21 Aug 2026 Support Session, real-auditor interviews are ruled out for this project — validation is via synthetic AI-agent persona simulation and internal team role-play, not real users, which is explicitly acceptable for a capstone project rather than a production deployment.

# Persona Snapshot — Senior Reviewer "Theo"

**Track:** Design / Product · **Sprint:** Sprint 1, Week 1 · **Owner:** Aleeya Ahmad (UX)
**Photo:**

![Theo](./Theo.jpeg)
**Naming note:** "Theo" is a team-invented name. Unlike Maya, no source document names or describes a second auditor archetype — this persona exists to represent a genuinely different tenure/calibration profile within the same role, not to duplicate Maya under a new name.

---

### Background
Theo is **46**, based in the same Melbourne trust & safety team as Maya, with **roughly 9 years of total content-moderation experience** — 5 years at a large social platform's trust & safety function before moving to this organisation about 4 years ago. He holds a background in criminology rather than psychology (a deliberate point of difference from Maya, to avoid implying "trust & safety background" means one fixed profile). He's highly comfortable with dashboards and case-management tooling, and informally mentors newer reviewers, including profiles like Maya's.

Theo represents the Auditor role's **longer-tenured, more calibrated** variant. This is the meaningful difference from Maya, not a cosmetic rename: over years of practice, Theo has largely resolved the emotional-calibration questions around decline stigma and SOS trust that still weigh on Maya — he no longer needs reassurance that declining is legitimate, and he has used SOS before without it becoming a defining moment. What has *not* resolved for him, and has instead sharpened with experience, is a more analytical concern with whether the system's own numbers, particularly the exposure clock, are trustworthy — a concern Maya, being newer, has not yet had the tenure to interrogate as closely.

### Goals
- Trust that the exposure clock and severity metrics on his screen reflect what actually happened, not an approximation he has to mentally double-check.
- Move through cases efficiently, drawing on years of pattern-recognition, without the interface over-explaining things he already knows (e.g. that declining is fine).
- Informally support newer reviewers, including recognising when someone on the team may be hesitating on a decision the way Maya's persona describes.
- Confirm that a logged SOS incident is captured with enough detail to be useful beyond the moment (e.g. spotting a recurring AI mis-tagging pattern), not just acknowledged and closed.

### Frustrations / Pain Points
Sourced from Aleeya's Week 1 auditor research notes, weighted toward the exposure-clock-trust theme given Theo's tenure profile; hypotheses, not confirmed findings, and more inferential than Maya's since no source document distinguishes a senior-reviewer archetype explicitly.

1. **Not fully trusting the exposure clock.** This is Theo's dominant pain point. If the displayed number doesn't clearly reflect whether a re-watch counted twice, or whether blurred-but-open time counted at all, the metric stops functioning as reassurance and becomes something to mentally audit mid-review — a bigger irritant for someone who relies on the system's precision daily than for someone newer still focused on the emotional weight of the job itself.
2. **Reassurance messaging aimed at a different calibration than his own.** Marielle Lee's guidance was not to over-signal "declining is fine" in a way that implies it's usually not — from Theo's side, in-the-moment reassurance copy written for someone still building trust in the system, closer to Maya's profile, can read as over-explained rather than helpful to him specifically. This is an inferred tension, not something any source document states directly.
3. **No visibility mechanism for his informal mentoring role.** As someone newer reviewers may look to, Theo has no system-supported way to notice when a teammate is hesitating on a case the way Maya's persona describes — this is a genuinely open design question the persona surfaces, not a confirmed gap the client has addressed either way.
4. **SOS logging for pattern purposes, not just in-the-moment acknowledgement.** Where Maya's SOS concern is about immediate reassurance that someone will see it, Theo's concern is more downstream: whether the incident is logged in enough detail to later confirm, for example, that a specific AI mis-tagging pattern is recurring rather than a one-off.

### Tasks (Touchpoints)
1. Log in and view assigned case list — thumbnails auto-blurred/suppressed by default, severity-tagged.
2. Open a case: review AI severity score, incident timeline, narrative summary, entity/audio analysis, drawing on tenure to move through routine cases efficiently.
3. Pass through the consent/warning gate before viewing raw flagged content (accept and proceed, or decline) — with less hesitation at this step than a newer reviewer, per this persona's framing.
4. Toggle blur/grayscale to self-control exposure level while reviewing.
5. Adjust the AI's severity/CVI rating if he disagrees, write comments, and submit the full bundle to his manager.
6. Trigger SOS if unexpectedly exposed; as a team-defined characteristic of this scenario (not a confirmed system feature), informally check in with newer teammates who seem to be struggling with a case.

### Context of Use
Sustained, professional working context, structurally identical to Maya's (same shift-based queue, same cumulative exposure model, same desktop-based work setting). The difference is fluency, not setting: years of practice reduce friction at the decision points that are highest-stakes for a newer reviewer (decline, consent gate), while sharpening attention on system-level precision that a newer reviewer may not yet have reason to question.

### Constraints
- **Daily exposure cap: 2 hours / 120 minutes** — same client-confirmed target as Maya's. The same 4-hour-demo vs. 2-hour discrepancy applies here.
- **Case assignment is weighted**, not purely random, by exposure level and case count, per client confirmation.
- **Wellbeing always outranks moderation speed** — the same governing client ruling applies to Theo as to every auditor.
- **Role-based access**: Theo sees only his own assigned cases, never other auditors' cases, despite his informal mentoring role — there is no confirmed system mechanism giving him visibility into a teammate's case queue or hesitation.
- **Mandatory cooldown** enforced after high-severity content exposure, regardless of tenure.
- **Right to decline exists, but is a lower-build-priority feature** — same as Maya's persona; Theo's own decline experience is unaffected by tenure at the system level, even though his emotional relationship to it differs.

### Illustrative Quote
> *"I don't need the system to tell me declining is fine — I already know that. What I need is to trust that the numbers on my screen are actually accurate."*

**This is not a real quote.** It's an illustrative synthesis of Theo's dominant exposure-clock-trust concern, written in the IBM persona-quote convention, but flagged here explicitly since it was authored by the team, not captured from a person.

---

## Assumptions & Validation Needed *(GStack Stage 3 + Planner acceptance criteria)*

**Assumptions used:**
- Theo represents a genuinely distinct, longer-tenured **variant** of the Auditor role, built by re-weighting the same three Week 1 auditor research notes differently than Maya's persona does — this is a team-authored extension, not a confirmed second archetype from any source document.
- Demographics (46, criminology background, ~9 years total tenure, 4 years at this org) are a **team-defined working profile**, presented confidently per Emily Chin's 21 Aug guidance rather than left blank.
- The claim that tenure resolves the decline-stigma and SOS-trust concerns while sharpening concern about system precision is a plausible, reasoned inference, not an observed pattern from any real reviewer population.
- The informal-mentoring angle and the "SOS for pattern-detection purposes" framing are genuine extensions beyond the research notes, flagged explicitly as more inferential than the rest of this persona.

**Still requires validation:**
- No real auditors/reviewers of any tenure have been interviewed — this sub-type has thinner grounding than Maya's, since no source document distinguishes a senior-reviewer profile explicitly.
- Whether tenure actually changes an auditor's relationship to decline-stigma and SOS-trust the way this persona assumes is an open question — it is equally plausible that these concerns persist regardless of experience.
- Whether the system should support any form of peer-mentor visibility is a genuinely open design question the client has not addressed either way.
- Per the 21 Aug 2026 Support Session ruling, real-user interviews are ruled out for this project; validation route is a synthetic AI-agent persona profile and/or internal role-play, used as a proxy to stress-test these assumptions, not to validate real user behaviour.

---

### Traceability
- Companion personas: `Auditor - Persona Snapshot (Provisional) - Generic - Sprint1 Week1.md`, `Auditor - Persona Snapshot (Provisional) - New Hire - Sprint1 Week1.md` (Jules), `Auditor - Persona Snapshot (Provisional) - Frontline Reviewer - Sprint1 Week1.md` (Maya).
- **Action for UX:** the Auditor role now has three named variants spanning a tenure spectrum, each with a genuinely different dominant pain point — Jules on pre-hire expectation-setting, Maya on decline stigma and SOS trust, Theo on exposure-clock precision. All three should inform the Auditor requirements doc once drafted, not just Maya's.
