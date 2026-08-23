# Research Manager Persona — Week 1, Sprint 1 | Owner: Aleeya Ahmad (UX) | 2026-08-20

## Research Notes

### Research Note 1/3 — An SOS alert shouldn't look like just another email
**Type:** Assumption-based (not yet validated with a real user)
**Touchpoint(s):** SOS escalation notification (auditor unexpectedly exposed beyond expected levels)

**Scenario:** A manager is overseeing roughly 10 auditors, per the scale Naresh described at kickoff. Mid-afternoon, one of their auditors is exposed to content the AI failed to correctly flag and triggers an SOS. Per the confirmed requirement, the manager's notification for this is a plain email — the same channel they'd also receive for routine, lower-urgency updates.

**Pain point(s):** The client was explicit that wellbeing takes precedence over moderation speed, no exceptions — but the confirmed escalation mechanism (a simple email) carries no inherent urgency signal to distinguish it from routine inbox noise. A manager juggling oversight of 10 people's exposure levels, case queues, and reassignment decisions could plausibly miss or delay-open an SOS email exactly when speed of response matters most, undermining the priority the client set as non-negotiable.
**Need(s) / Motivation(s):** The manager needs to be able to trust, at a glance, that an SOS notification is unmissable and distinguishable from routine correspondence — because their motivation here isn't administrative (processing an alert), it's protecting a specific person on their team who is having a bad moment right now. A missed or delayed SOS email would be a direct failure against the client's stated top priority.
**Design implication:** Worth treating the client's "a simple email is sufficient" answer as a floor, not a ceiling — an in-app urgent-state indicator (e.g., a persistent banner or badge) alongside the email could close the gap between "notification was sent" and "manager actually saw it in time," without contradicting what was confirmed.

---

### Research Note 2/3 — Spotting a limit about to be hit, not just one already broken
**Type:** Assumption-based (not yet validated with a real user)
**Touchpoint(s):** oversight dashboard (tracking exposure and case history across ~10 auditors), per-auditor exposure limit controls

**Scenario:** A manager opens their dashboard at the start of the day to check on their team before cases start coming in. With per-auditor exposure limits now confirmed as configurable (the client explicitly approved granular, individual limits), the manager is responsible for noticing not just who has already hit their cap, but who is approaching it, across everyone they oversee.

**Pain point(s):** Since the manager-side view was deliberately left undesigned by the client ("design this persona's experience yourselves"), there's a real risk of defaulting to a dashboard that only shows current/final exposure numbers per auditor — which would force the manager to manually scan and mentally compare 10 rows to catch a limit about to be crossed. Given the client's explicit stance that wellbeing must be protected proactively (not just corrected after the fact), a purely reactive/tabular view works against the platform's own stated purpose.
**Need(s) / Motivation(s):** The manager needs the dashboard to actively surface who needs attention — not just report status — so they can intervene before a limit is breached rather than after. Their underlying motivation is the same one driving the whole platform: preventing harm to their auditors, not just recording it once it's happened.
**Design implication:** A visual "approaching limit" state (distinct from "at limit" and "under limit") on the oversight view, sorted or flagged rather than requiring the manager to scan every row, would align the dashboard with the client's proactive-wellbeing framing rather than a passive audit log.

---

### Research Note 3/3 — Deciding a declined case's fate without having seen it
**Type:** Assumption-based (not yet validated with a real user)
**Touchpoint(s):** declined-case queue (reassignment decisions)

**Scenario:** An auditor declines a case, and per the confirmed workflow it routes directly to the manager, who decides whether to reassign it based on the auditor's comments, the SLA/exposure limit, and the AI's processing output — explicitly without the manager necessarily reviewing the raw video themselves (presumably, in keeping with the same exposure-minimisation logic applied to auditors). The manager now has to make a judgment call on secondhand information.

**Pain point(s):** The manager is being asked to make a reassignment decision — including, implicitly, judging whether the declining auditor's reasoning was sound — using only the AI's output and the auditor's own comments, without necessarily viewing the source content. If the auditor's comments are brief or the AI's summary is ambiguous, the manager has no clean way to resolve genuine uncertainty about whether the case simply needs a different auditor or needs no reassignment at all, and doing so carries the same exposure-protection tension the whole platform is built around (should the manager view it directly to be sure, at the cost of their own exposure?).
**Need(s) / Motivation(s):** The manager needs enough structured context from the decline — not necessarily the raw footage — to make a confident, defensible reassignment call quickly, since the client explicitly flagged this as a lower-priority feature not meant to slow down the main flow. Their motivation is fairness to both the declining auditor and whichever auditor might receive the case next, without becoming a review bottleneck themselves.
**Design implication:** A structured decline-reason field (rather than free-text only) alongside the AI summary could give the manager enough signal to decide quickly in the common case, reserving direct video review for genuinely ambiguous ones — worth noting this is explicitly a build-it-last feature per the client, so this is a Week 1 hypothesis to revisit later, not an immediate requirement.

---

## Assumptions & What Still Needs Validation

- All three notes are hypothesis-driven — the client explicitly declined to demo the manager view at all ("design this persona's experience yourselves"), so unlike the auditor and user flows there is no reference implementation to compare against, and these notes lean more heavily on inference from adjacent confirmed requirements (SOS handling, exposure limits, decline workflow) than the other two personas' notes do.
- The email-only SOS notification (Note 1) is a confirmed requirement, not an assumption — but the claim that it may be insufficient on its own is a hypothesis, and should be sanity-checked with the client or BA before treating an in-app alert as an added requirement rather than a UX nice-to-have.
- We don't yet know the manager's realistic day-to-day cadence (do they check the dashboard continuously, a few times a day, or only when notified?) — this materially affects how urgent the "approaching limit" surfacing in Note 2 actually needs to be, and could be validated once the team defines its own workload/scalability assumptions (per the client's "define your own assumptions" answer on scalability).
- These notes assume a single manager oversees a stable pool of ~10 auditors (per Naresh's example at kickoff) — if the eventual design allows auditors to be shared across managers or teams to scale, the oversight and escalation assumptions in Notes 1 and 2 should be revisited.
