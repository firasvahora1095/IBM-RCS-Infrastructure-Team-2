# Research Auditor Persona — Week 1, Sprint 1 | Owner: Aleeya Ahmad (UX) | 2026-08-20

## Research Notes

### Research Note 1/3 — The decline button and fear of looking like you can't handle it
**Type:** Assumption-based (not yet validated with a real user)
**Touchpoint(s):** consent/warning gate (accept or "respectfully decline" a case)

**Scenario:** An auditor opens their case queue and sees a new assignment with a content-warning pop-up listing the tags the AI identified. They're not confident they're in the right headspace to review this one today, and per the confirmed workflow, declining routes the case straight to their manager, who reviews it. They hesitate before clicking either option.

**Pain point(s):** Even though "respectfully decline" is explicitly designed as a legitimate, protected choice (wellbeing takes precedence over moderation speed, per the client's explicit priority ruling), the auditor has no way of knowing from the interface whether declining is genuinely judgment-free or whether it's silently tracked as a performance signal (e.g., "declined 3 cases this week"). Without a visible reassurance, the auditor may default to accepting cases they shouldn't, to avoid seeming unable to cope — which directly undermines the platform's core wellbeing-first design intent.
**Need(s) / Motivation(s):** The auditor needs the decline action to feel procedurally and socially safe in the moment they take it — not just safe in policy. Their underlying motivation is to keep doing this work sustainably without burning out, which depends on trusting that the system (and their manager) genuinely treats declining as normal, expected behaviour rather than a flag against them.
**Design implication:** Consider explicit in-the-moment language on the decline action itself (e.g., "This won't be held against you — your manager will review the case, not your decision") rather than leaving the policy implicit.

---

### Research Note 2/3 — The SOS button needs to feel like it actually does something
**Type:** Assumption-based (not yet validated with a real user)
**Touchpoint(s):** SOS alert mechanism (mid-review, when AI mis-classification exposes the auditor unexpectedly)

**Scenario:** An auditor opens a case that the AI tagged as moderate severity, with auto-blur enabled as normal. The content turns out to be far worse than the tags suggested — the AI missed something. The auditor is now unexpectedly exposed and reaches for the SOS mechanism demoed at kickoff.

**Pain point(s):** This is the single highest-stakes moment in the entire auditor experience, and the confirmed requirements only specify that it triggers a manager notification (a simple email, per the client). From the auditor's side in that moment, an action that just "sends an email somewhere" carries real risk of feeling inadequate — they have just been harmed by the system's own failure and have no way of knowing, at the point of pressing it, whether anyone will actually see it in time or what happens to them right now (do they close the case? does the video stop? is there any immediate acknowledgement at all?).
**Need(s) / Motivation(s):** The auditor's motivation in this moment isn't procedural (they're not trying to "file a report") — it's an urgent need for the exposure to stop immediately and for some form of visible, immediate acknowledgement that a human will follow up, distinct from the routine background email the manager receives. Trust in the SOS mechanism, once earned or broken, will likely shape whether auditors feel safe continuing to do this work at all.
**Design implication:** The immediate on-screen response to pressing SOS (e.g., instantly pausing/hiding the video, confirming "Your manager has been notified and will check in with you") may matter as much to this persona as the manager-side email that the requirements currently specify — this is a gap the client left explicitly open ("if the AI fails... the team needs a wellbeing response plan") and is worth treating as unsolved rather than covered by the email alone.

---

### Research Note 3/3 — Not fully trusting the exposure clock
**Type:** Assumption-based (not yet validated with a real user)
**Touchpoint(s):** exposure limit tracking (2-hour/120-minute daily cap), blur/grayscale toggle

**Scenario:** An auditor has been working through cases for a few hours, toggling blur on and off as they review, occasionally re-watching a clip to double-check a timestamp before writing their comments. Midway through the day they glance at their exposure counter and aren't sure it reflects what they've actually sat through — did replaying a clip count twice? Did the time the video was blurred but still playing in the background count at all?

**Pain point(s):** Given wellbeing is the client's explicit top priority, the exposure cap is only meaningful to the auditor if they believe it's measuring the right thing. If an auditor privately suspects the clock under- or over-counts their real exposure (e.g., not distinguishing "watching unblurred" from "file open but blurred," or not accounting for re-watches), the number on screen stops functioning as reassurance and instead becomes another thing to second-guess mid-review — adding cognitive load precisely when the design intent is to reduce it.
**Need(s) / Motivation(s):** The auditor needs the exposure metric to be legible and self-evidently fair — ideally with enough transparency (e.g., a visible breakdown of what counts as "exposed" time) that they don't have to mentally audit the system while also doing the actual review work. Their underlying motivation is confidence that the platform is actively protecting them, not just administratively tracking them.
**Design implication:** A brief, persistent explanation of what counts toward the exposure clock (visible near the counter itself, not buried in help docs) could pre-empt this distrust — worth flagging alongside the still-open question of exactly how "exposure time" should be defined and measured.

---

## Assumptions & What Still Needs Validation

- All three notes are hypothesis-driven — no real auditors have been interviewed yet, since the auditor role itself doesn't exist as a hired position for this project (there is no live panel to test with). They are grounded in the confirmed exposure-limit, decline, and SOS requirements, but the emotional framing (fear of judgment, distrust of the clock) is inferred, not observed.
- The client never fully specified the "wellbeing response plan" for SOS incidents beyond "manager gets an email" — Note 2's design implication is a proposal to fill that gap, not a confirmed direction, and should be raised with Naresh/Emily as an open item rather than assumed settled.
- We don't know whether real auditors would actually worry about decline being tracked against them, or whether a simple written policy would be enough reassurance without added UI — could be validated with a short scenario-based interview (e.g., "walk me through what you'd do if you weren't sure you could handle a case today") once candidate auditor-role stand-ins (e.g., teammates or classmates role-playing the persona) are available.
- The exact definition of "exposure time" (does re-watching count twice? does blurred-but-open count?) is not yet defined anywhere in the confirmed requirements — Note 3 flags this as a genuine open technical/UX question, not just a trust-framing exercise, and should be resolved before the exposure-tracking feature is built, not just designed around after the fact.
