> ⚠️ **PROVISIONAL — ASSUMPTION-BASED, NOT CONFIRMED**
> This persona is a hypothesis built from Aleeya's Week 1 research notes, the Marielle Lee expert interview, and confirmed kickoff/client facts about the Normal User role. **No real reporters or members of the public have been interviewed.** Do not treat any detail below as validated fact — see "Assumptions & Validation Needed" at the end before using this to justify a design or requirement decision.

# Persona Snapshot — Concerned Bystander "Casey"

**Track:** Design / Product · 

**Sprint:** Sprint 1, Week 1 · 

**Owner:** Aleeya Ahmad (UX)

**Photo:**

![Casey](./Casey.jpeg)

---

### Background
Casey is **27, works as a marketing coordinator, and lives in Melbourne.** She's an everyday, confident social-media user — active on Instagram and TikTok daily, comfortable with common app flows and mobile-first interactions — but has no technical background and isn't especially tech-savvy beyond that. Based on our research, this is the demographic the public-reporting flow should be designed around: an ordinary social-media user, not a technical or professional audience.

Casey is a **concerned bystander**: she came across the flagged video content mid-scroll on social media — not searching for it, not personally targeted by it — and decided it needed reporting. She's reporting on behalf of the situation, not as someone directly harmed by the content herself. This is our working definition of "the public" for this platform; if the client later narrows this further, the persona gets revisited, but this is the team's confident starting point, not an open question we're waiting on them to answer.

### Goals
- Report the content quickly, without having to create an account or hand over personal details.
- Feel confident the report is being taken seriously — not dropped into a void.
- Retain a simple way to check back later without needing to remember much.
- Avoid personal exposure or risk (not wanting to be identified, contacted unnecessarily, or drawn into a lengthy process).

### Frustrations / Pain Points
*(Sourced directly from Aleeya's Week 1 research notes — still hypotheses, not confirmed findings.)*

1. **Trust at the moment of reporting.** Submitting feels emotionally loaded — self-doubt about whether this "counts" as reportable, and whether it's worth the effort. Without immediate, plain-language reassurance at submission, there's a real risk of drop-off before the report is even completed.
2. **The case ID as an anxious tether.** With no account system, the case ID is Casey's *only* link back to an outcome. It's easy to lose, and losing it means losing the ability to ever find out what happened.
3. **Distrust of the silent middle.** Most of the pipeline — AI processing, assignment, review — is invisible. Without some intermediate signal, silence reads as inaction, not progress. (This directly maps to Naresh's own open "innovative notification" challenge raised at kickoff.)
4. **Privacy/surveillance anxiety** *(from the Marielle Lee expert interview)*: a general wariness about reporting tools that feels like being watched or logged, rather than being helped — relevant given this platform inherently involves monitoring content.

### Tasks (Touchpoints)
1. Upload/submit flagged video content for review.
2. Receive and save/retain the generated case ID.
3. Return later and use the case ID to check the case's status.

### Context of Use
A single, spontaneous session on her phone, mid-scroll — Casey didn't plan to be here today. She arrives at the reporting flow moments after seeing the content, in a heightened emotional state rather than a calm, exploratory one. She wants the reporting step itself to be short; she will not tolerate friction like account creation. She'll likely check the status page once or twice afterward on the same phone, not repeatedly.

### Constraints
- No account/login — must be able to complete the entire flow anonymously (confirmed: UR-VU-02).
- Sole recovery path for tracking is the case ID itself, unless she opts into email/SMS (deprioritised to Nice-to-Have in the requirements doc).
- Comfortable everyday smartphone/app user, not tech-savvy beyond that — no familiarity assumed with terms like "case assignment" or "AI processing" (informs plain-language requirement UR-NFR-01).
- Content sensitivity means UI must avoid re-traumatising Casey (e.g. no unprompted re-display of the reported content — see UR-NTH-06).

### Illustrative Quote
> *"I don't know if this is a big deal enough to report, but it didn't feel right. I just want to know someone's actually looking at it."*

**This is not a real quote.** It's an illustrative synthesis of the "trust at reporting" and "silent middle" research notes, written the way IBM's persona-quote convention expects — but flagged here explicitly because, unlike a quote sourced from an actual interview transcript, this one was authored by the team, not captured from a person.

---

## Assumptions & Validation Needed *(required per GStack Stage 3 + Planner acceptance criteria)*

**Assumptions used:**
- Casey represents a "concerned bystander" reading of "the public" — narrower than the full possible range the client may intend (see kickoff note flag below).
- Demographics (27, marketing coordinator, Melbourne, daily Instagram/TikTok user, non-technical) are a **team-defined working profile**, presented confidently per Emily Chin's 21 Aug guidance ("this is the demographic we are focused on") rather than left blank pending client input.
- Emotional-state assumptions (anxiety, self-doubt, silent-middle distrust) come from Aleeya's own Week 1 research notes, which are themselves assumption-based, not from real user interviews.
- The privacy/surveillance concern is carried over from Marielle Lee's expert opinion — one expert's view, not validated research.
- Single-session, low-repeat usage pattern is inferred from the anonymous/no-account design, not observed.

**Still requires validation:**
- No real reporters have been interviewed — every pain point above is a hypothesis.
- Whether "concerned bystander" vs. "person reporting content that affects them directly" is the right split, or whether both need distinct personas, is unresolved and materially changes the emotional stakes involved.
- Actual tech-literacy range, device mix, and session behaviour are unknown.
- Whether an ETA/status-notification design actually relieves the "silent middle" anxiety in practice. Per the 21 Aug 2026 Support Session decision (Emily Chin, Meeting No. 1), client-side interviews are ruled out (delay/penalty risk), so validation must come from a **synthetic AI-agent persona profile**, optionally benchmarked against public government reporting workflows (e.g. VicHealth), rather than real-user recruitment.

**If the client later clarifies a narrower target sub-group within "the public,"** this persona should be revisited — this note is carried over directly from the Week 1 research notes handover to Jana and still applies here.

---

### Traceability
- Builds on: `Research User Persona` (Week 1) research notes and `Conduct Expert Interview` (Marielle Lee) synthesis.
- Feeds into: `Normal User Requirements` (UR-NFR-01 plain-language/accessibility requirement, UR-ID-09 case-ID-loss warning, UR-ST-09 estimated timeframe, UR-NTH-06 content-warning re-display — all trace back to pain points 1–4 above).
- **Action for UX:** add a one-line pointer to this persona snapshot in the Sprint 1 master proposal doc's persona/Target Users section, so it's discoverable.
