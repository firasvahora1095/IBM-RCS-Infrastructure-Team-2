# Research User Persona — Week 1, Sprint 1 | Owner: Aleeya Ahmad (UX) | 2026-08-20

## Research Notes

### Research Note 1/3 — Trust at the moment of reporting
**Type:** Assumption-based (not yet validated with a real user)

**Touchpoint(s):** upload

**Scenario:** A user has come across a video they believe shows a child being abused, on a forum they were browsing. They feel sick, and they're not sure if reporting it is "their place" — but they don't want to just look away. They find the platform and start the submission flow.

**Pain point(s):** The user is deciding whether to act at all while carrying real emotional weight and self-doubt about whether the content "counts" as reportable. Anything in the upload flow that feels bureaucratic, interrogating, or unclear about what happens to the file next (Who sees it? Am I in trouble for having it? Is this actually going anywhere?) risks pushing them to abandon the report partway through.

**Need(s) / Motivation(s):** The user needs the submission step to feel like it is being taken seriously the moment they act — plain-language reassurance about what happens next and who reviews it — so that the emotional cost of reporting doesn't feel wasted or ignored. Their underlying motivation isn't curiosity about the platform; it's a moral impulse to stop harm, and the flow needs to honour that without adding friction or judgment.

**Design implication:** A short, human-toned confirmation immediately after upload ("Your report has been received and will be reviewed by a trained auditor") may matter more to this persona than upload speed itself.

---

### Research Note 2/3 — The case ID as an anxious tether
**Type:** Assumption-based (not yet validated with a real user)

**Touchpoint(s):** case ID issuance, status notification

**Scenario:** A user submitted a report three days ago on their phone, half-distracted, and was given a case ID on screen. They didn't screenshot it. Now they're wondering whether the report is being acted on, but they can't remember exactly where they saw the ID or whether they wrote it down anywhere.

**Pain point(s):** For a one-off, emotionally charged interaction (not a habitual account-based service), the user has no strong incentive or established habit to carefully store a code. If the case ID is the only link between the user and the outcome of their report, losing it means losing all visibility into whether their report mattered — which is a plausible and fairly common failure mode given the platform is designed for anonymous, non-account public use.

**Need(s) / Motivation(s):** The user needs the case ID to be genuinely hard to lose — not just displayed once — because their motivation for checking status isn't idle curiosity, it's wanting confirmation that something they found disturbing is actually being handled by someone qualified.

**Design implication:** Consider low-friction ways to preserve the case ID beyond a one-time on-screen display (e.g., an optional email/download option) — without requiring account creation, since that would add friction at the point of reporting.

---

### Research Note 3/3 — Distrust of the silent middle
**Type:** Assumption-based (not yet validated with a real user)

**Touchpoint(s):** status notification

**Scenario:** A user checks their case ID a week after submitting, expecting some kind of update. Per the confirmed case lifecycle (Submitted → AI Processing → Assigned → Under Review → Completed), most of that pipeline is invisible to them by design — the AI processing and auditor assignment happen entirely in the background. All the user is likely to see is "Submitted," and then, eventually, a resolution.

**Pain point(s):** A long, unexplained gap between "Submitted" and any further update reads as inaction to someone who doesn't know the pipeline exists — even if the system is actively working the case. Without any visible signal in between, the user has no way to distinguish "still being processed" from "forgotten" or "ignored," which risks eroding trust in the platform (and, by extension, in reporting this kind of content at all).

**Need(s) / Motivation(s):** The user needs some form of intermediate reassurance that acknowledges progress without over-promising a timeline or exposing internal auditor/case-routing detail that isn't the user's business. Their motivation is closure and reassurance, not operational transparency — they don't need to know a case was "Assigned," just that it's moving.

**Design implication:** This is the open design challenge Naresh flagged directly at kickoff ("find an innovative way to notify users of updates on their case status") — worth treating as a genuinely unsolved problem rather than a simple "add a status page" fix.

---

## Assumptions & What Still Needs Validation

- All three notes are entirely hypothesis-driven — no real users (public reporters) have been interviewed yet. They're grounded in the confirmed case lifecycle and the three known User touchpoints (upload, case ID, status notification), but the emotional framing (guilt, self-doubt, anxiety about losing the ID) is inferred, not observed.
- We don't yet know whether real users would primarily report via mobile or desktop, which affects how much weight the "losing the case ID" risk (Note 2) actually carries — could be validated with a quick 3–5 person usability/interview pass once a clickable prototype exists.
- We don't know what tone or channel (in-app only vs. email vs. SMS) users would actually trust for status updates — Note 3's design implication is a starting hypothesis, not a confirmed direction, and ties directly into Naresh's still-open "innovative notification" challenge.
- These notes assume the reporting user is a concerned bystander (not, e.g., a platform/content moderator doing this as part of their own job) — if the client later clarifies a narrower target sub-group within "the public," these notes should be revisited.
