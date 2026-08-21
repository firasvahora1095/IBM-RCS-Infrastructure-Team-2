# Expert Interview Synthesis — Marielle Lee (Ethical/Responsible Design Specialist)
**Interviewee:** Marielle Lee | **Interviewer:** Aleeya Ahmad | **Date:** August 21, 2026 | **Length:** ~25 min
**Context:** Capstone project — AI-assisted content moderation platform (IBM x RMIT). Public reports harmful video content → AI pre-screens → human reviewers assess. Design goal: protect reviewer wellbeing structurally, not just process content faster.

---

## Q1. "Do you want to proceed willingly?" pop-up before reviewers see flagged content — is this a soft dark pattern? What's a neutral version?

**Marielle's response:**
- Pushed back on the premise first: she questioned *why* the wording needed to imply willingness at all, and asked what problem the phrasing was trying to solve.
- Her core correction: **there is no such thing as a "soft" dark pattern — a dark pattern is a dark pattern.** Don't hedge the category; either it manipulates or it doesn't.
- Recommendation: **strip the loaded language entirely.** Just ask "Would you like to proceed?" — plain, no persuasive framing.
- She suggested the *reason* for the prompt doesn't need to be spelled out every time — after a reviewer has used the system once or twice, they'll understand why the check-in exists without it being over-explained.
- Defined dark patterns for context: a deliberate trick businesses use to steer users toward a choice that serves the business, not the user.

**Key takeaway:** Simplify the copy. Drop "willingly." A neutral confirmation doesn't need justification baked into the sentence — repetition of *why* across every instance can itself feel patronizing or manipulative.

---

## Q2. How do we design so declining a case carries no real or perceived penalty?

**Marielle's response:**
- Reframed the premise: reviewing/filtering *is the reviewer's actual job.* Declining isn't inherently negative — it's a normal outcome of doing the job properly. The design shouldn't over-signal "this is fine!" in a way that implies it's usually not.
- Practical suggestion: **before the reviewer has to decide "this is bad content," give them context first** — e.g., a reason or signal for *why* the content might be flagged as difficult, so the decision to decline isn't a cold, unexplained judgment call.
- Strongly recommended **talking to actual reviewers** (real end users) rather than designing this purely from assumption — she returned to this point multiple times later in the interview too.

**Key takeaway:** Don't over-engineer reassurance messaging around declining — instead, give reviewers better context *before* the decision point so declining feels like a natural, informed outcome, not an emotionally loaded moment.

---

## Q3. Public reporting flow (no account, just a tracking ID) — biggest privacy-by-design traps?

**Marielle's response:**
- Offered a personal-preference framing rather than a strict "trap list": if she were reporting content, she wouldn't mind being identifiable, and would even welcome being asked why she reported someone.
- Recommendation: **give reporters a choice** — option to leave contact details (name, email) for follow-up, or stay anonymous.
- On accounts specifically: **requiring full account creation is a barrier** — it would stop her from reporting in the moment. Keep the flow lightweight (e.g., just name, email, message) rather than forcing signup.
- Overall design principle repeated here: **make it easy** for the reporter — friction at the reporting stage discourages reporting altogether.

**Key takeaway:** Offer an anonymous-vs-identified choice rather than forcing anonymity or forcing an account. Minimal friction > formal account system.

---

## Q4. Managers can see reviewers' exposure time, case history, wellbeing alerts — where's the line between protective monitoring and surveillance?

**Marielle's response:**
- Analogy: this is like **cookie consent on a website** — the person knows their session is being recorded once told, and doesn't need to be reminded constantly.
- Direct advice: **don't make the monitoring visually loud or repetitive.** Reviewers should know monitoring exists and is for their wellbeing, but constant on-screen reminders ("you are being watched") create discomfort rather than reassurance.
- She explicitly agreed that repeated visible monitoring indicators would feel bad if she were the one being monitored.

**Key takeaway:** Disclose monitoring once/upfront (like a consent step), then keep it in the background. Constant visible tracking indicators undermine the "protective" framing and tip into surveillance-*feeling*, even if the intent is good.

---

## Q5. Could progress bars/counters around workload limits quietly pressure reviewers to overexpose themselves?

**Marielle's response:**
- She didn't see progress indicators themselves as inherently risky — in fact she said they're **useful and clarifying** ("1 of 10 completed" or a simple progress bar is good enough).
- No strong caution raised here about subtle pressure — her framing was that a visible indicator helps reviewers understand their own status, and the level of visual polish ("how fancy") is a design/team choice, not an ethics issue on its own.

**Key takeaway:** This is one area where she didn't flag risk the way the question anticipated — worth noting as a gap. The team may want to probe this further with actual reviewers, since Marielle's answer treated progress indicators as neutral/helpful rather than a dark-pattern risk.

---

## Q6. Her healthcare UX background involves people encountering distressing situations — what transfers to reviewers viewing traumatic material?

**Marielle's response:**
- **Warn people before they're hired** that the role involves viewing this kind of material — set expectations at the outset, not just at point-of-content.
- **Use careful, non-sensational wording** in in-the-moment warnings — avoid overly graphic or triggering phrasing even in a content warning itself.
- Suggested a **simple pop-up-style warning**: something like "this content may contain something that could be triggering" (exact wording still to be workshopped).
- **Build in a visible path to support** — e.g., a way to flag that they need to talk to their manager, right at the point of difficulty.
- On what managerial support should look like: manager's role is to **talk to the reviewer and find out how they're feeling**, and the UI trigger for this can be as simple as **one line/one button** ("Do you want to talk to your manager about this video?").

**Key takeaway:** Warn early (at hiring) and again in-context (before content), keep warning language plain, and give a low-friction, one-click path to manager support tied to the moment of distress — not buried in a separate menu.

---

## Q7. Go-to checklist/heuristic for catching dark patterns late in the design process?

**Marielle's response:**
- She doesn't use a formal checklist. Her actual heuristic, paraphrased:
  - **If you have doubt about a design choice, it probably is a problem** — trust that instinct rather than rationalizing it away.
  - Ask: **"Who benefits from this?"** — is it fair to the user, or does it primarily serve the business/platform?
  - Ask: **"Does the user have the freedom to make their own choice?"** — this was framed as the most important test.

**Key takeaway:** A lightweight two-question gut-check for late-stage review: (1) who benefits, (2) does the user retain real choice. Simple enough to run before every client review.

---

## General / Cross-Cutting Advice (not tied to one question)

- **Talk to real reviewers before finalizing designs.** Marielle raised this unprompted multiple times — she wants the team designing from actual reviewer pain points, not assumptions about what reviewers might feel. She suggested **LinkedIn outreach** as one practical way to find and message potential reviewers cold (this is how she's found people for her own work).
- When asked to sketch her own approach to the reviewer screen (2-hour daily cap scenario), she proposed:
  - **Two large primary buttons** (approve/flag decision)
  - **A comment box** so the reviewer can explain their reasoning to the manager (e.g., "flagged for violence")
  - **A filter/category tag** for why content was flagged
  - **A separate wellbeing check-in element** — phrasing still undecided, but something like "Do you feel uncomfortable with this video?" — which, if selected, signals the manager to follow up directly
  - An optional **direct "talk to your manager" trigger** tied to a specific video/case, not just a generic contact-manager option

---

## Action Items / Open Questions for the Team

1. Revise the pre-content pop-up copy from "Do you want to proceed willingly?" to a plain "Would you like to proceed?" — drop persuasive/justifying language.
2. Redesign the decline flow to surface *context/reason* before the decision point, rather than adding reassurance messaging after the fact.
3. Build the public reporting flow with an explicit **anonymous vs. identified** choice (name/email optional), and avoid requiring full account creation.
4. Disclose reviewer monitoring once (consent-style), then remove persistent/repeated on-screen monitoring indicators.
5. Progress bars/exposure counters: treated as low-risk by Marielle — flag this as an area to validate directly with reviewers rather than over-index on her answer alone.
6. Add a pre-hiring expectation-setting step (not just an in-app warning) — may be outside UX/Figma scope but worth flagging to PM/BA.
7. Design a simple, low-friction wellbeing check-in element on the review screen (checkbox or short question) plus a one-click "talk to manager" action tied to the specific case.
8. Adopt Marielle's two-question dark-pattern gut-check ("who benefits?" / "does the user have real freedom to choose?") as a lightweight review step before client presentations.
9. Prioritize recruiting real reviewers for research (via LinkedIn or similar) once supervisor approval is secured — Marielle flagged this as the most important next step.
