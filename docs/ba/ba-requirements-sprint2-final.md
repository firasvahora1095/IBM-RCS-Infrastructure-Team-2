# BA Requirements — Sprint 2 Final

**Owner:** Janataarah Begum

**Deliverable:** [Persona Requirements (Google Doc)](https://docs.google.com/document/d/1VrQGkNYEAd849qMMxLy8atYuAYg6u3NAOvUbZnb-np4/edit?usp=sharing) — the source doc linked from `persona-requirements-week2.md`. Now also mirrored in this repo as markdown below, so both are available: the Google Doc for live editing, this file for direct in-repo reference/linking from other docs.

Finalised persona-by-persona functional baseline for Sprint 2 handover — Normal User, Auditor and Manager. Document status: **Final BA baseline for Sprint 2 handover; Week 3 technical follow-ups explicitly noted.** This is the `Requirements-BA-FINAL.md` baseline already referenced throughout the UX handoff docs in `docs/ux/` (e.g. `auditor-prototype-handoff-sprint1.md` Round 10, `manager-assumptions-note-sprint1-week2.md`).

---

# 1. Normal User Requirements

**Purpose**

To define the finalised requirements for the Normal User persona, covering video upload, case ID issuance and status tracking — informed by the agreed project scope, Aleeya's UX research, Marielle Lee's expert interview, and the team's Week 1 feasibility and client-clarification work.

| Persona definition The Normal User is defined as a member of the public who submits or requests review of flagged video content, receives a case ID, and uses it to track the status of the submitted case. |
| :---- |

## Video Upload Requirements

| ID | Requirement | Priority | Notes |
| :---- | :---- | :---- | :---- |
| **UR-VU-01** | **The system shall allow a public user to upload and submit a video for safety review.** | **Mandatory** |   |
| **UR-VU-02** | **The system shall allow a public user to submit a report without requiring an account.** | **Mandatory** |   |
| **UR-VU-03** | **The system shall submit successfully uploaded video content into the case review process without making a content-based decision at the user submission stage.** | **Mandatory** |   |
| **UR-VU-04** | **The system shall immediately display a confirmation when a video submission has been successfully received, or an error message when the upload fails.** | **Mandatory** |   |
| **UR-VU-05** | **The system shall support the Sprint 2 baseline video formats MP4, MOV, WEBM and AVI.** | **Mandatory** | **Baseline set for the planned Upload -> FFmpeg processing pipeline. Revalidate only if the technical pipeline changes.** |
| **UR-VU-06** | **If a selected video format cannot be processed, the system shall inform the user and provide guidance on acceptable alternative formats.** | **Mandatory** |   |
| **UR-VU-07** | **The system shall support the upload and processing of videos with a target duration range of approximately 10–15 minutes for Sprint 2 testing.** | **Mandatory** | **Client-confirmed, 28 Aug 2026: Naresh advised the team to work with average 10–15 minute videos. This is a target testing range, not a hard maximum duration. A maximum raw-video file-size limit remains a Week 3 Dev follow-up and will be validated through the end-to-end pipeline test.** |
| **UR-VU-08** | **The system shall validate uploaded files for basic file integrity before they are stored or enter the review pipeline.** | **Mandatory** | **Basic file-integrity validation is mandatory for MVP/Sprint 2. Malware scanning itself is optional and is not an MVP requirement; it may be added only if suitable tooling is available and Dev confirms feasibility.** |
| **UR-VU-09** | **The system shall be validated using videos of varying durations to assess end-to-end upload, processing and analysis-timeline performance.** | **Mandatory** | **Client-confirmed, 28 Aug 2026: Naresh requested variation in video timelines/durations so pipeline performance can be demonstrated and checked. Exact test durations are a Dev/test-design detail.** |

## Case ID Requirements

| ID | Requirement | Priority | Notes |
| :---- | :---- | :---- | :---- |
| **UR-ID-01** | **The system shall automatically generate a unique case ID for every successfully submitted report.** | **Mandatory** |   |
| **UR-ID-02** | **The system shall display the generated case ID to the user immediately after successful submission.** | **Mandatory** |   |
| **UR-ID-03** | **The system shall allow the generated case ID to be used to identify and retrieve the corresponding submitted case for status tracking.** | **Mandatory** |   |
| **UR-ID-04** | **The system shall provide a "Copy Case ID" option for the user to copy the generated case ID.** | **Mandatory** | **Primary retention path, alongside UR-ID-07.** |
| **UR-ID-05** | **The system shall allow the user to optionally provide an email address or phone number to receive their case ID and case status updates.** | **Nice-to-Have** | **Deprioritised below copy (UR-ID-04) and local storage (UR-ID-07), which satisfy the core no-account tracking need. Contact details add PII handling and email/SMS integration effort not needed for MVP.** |
| **UR-ID-06** | **The system shall clearly inform the user that they must retain their case ID in order to track the case later.** | **Mandatory** | **Retaining the case ID via copy or local storage is the primary tracking path. Contact details remain an optional future enhancement.** |
| **UR-ID-07** | **The system shall retain the generated case ID locally in the user's browser after successful submission to support later retrieval without requiring an account.** | **Mandatory** | **Implementation note: Local Storage is the proposed method.** |
| **UR-ID-08** | **The system shall generate case IDs in a non-sequential and non-guessable format to reduce the risk of unauthorised case lookup.** | **Mandatory** |   |
| **UR-ID-09** | **The system shall warn the user before they navigate away from the confirmation screen without copying or saving their case ID.** | **Nice-to-Have** | **Directly addresses the "case ID as anxious tether" research finding (no account system means the case ID is the user's only link to an outcome, and it's easy to lose). Low build cost, not functionally blocking. Resolved 2026-09-09 (Hyuna/PM): implementation mechanism (browser beforeunload vs. in-app route guard) left to Dev's discretion — no visible UI/behavioural difference to specify at BA level.** |

## Status Tracking Requirements

| ID | Requirement | Priority | Notes |
| :---- | :---- | :---- | :---- |
| **UR-ST-01** | **The system shall allow the user to retrieve the current status of their submitted report using the case ID.** | **Mandatory** |   |
| **UR-ST-02** | **The system shall update the user-facing case status when the report progresses to a new user-facing stage of the review process.** | **Mandatory** | **Confirmed with UX: Received -> Being Reviewed -> Complete. These public labels intentionally avoid exposing internal states such as Assigned or AI Processing.** |
| **UR-ST-03** | **The system shall display the final public-facing outcome of the submitted report when the case reaches Complete. For standard cases with no SOS or Decline flag, the public-facing outcome shall be derived from the Auditor's submitted final case outcome.** | **Mandatory** | **Internal severity/CVI, Auditor comments and Auditor identity shall not be exposed to the Normal User. The exact positive public-facing outcome label remains to be confirmed.** |
| **UR-ST-04** | **The system shall display user-facing case status without exposing auditor identities, internal assignment logic or other internal review details.** | **Mandatory** |   |
| **UR-ST-05** | **The system shall allow users who provide an email address or phone number to receive case status updates through email or SMS.** | **Nice-to-Have** | **Same reasoning as UR-ID-05 — deprioritised below the core case-ID retrieval path.** |
| **UR-ST-06** | **Email or SMS status updates shall provide a secure link or code that allows the user to access the corresponding case status page.** | **Nice-to-Have** | **Only relevant if/when UR-ST-05 is built.** |
| **UR-ST-07** | **The system shall rate-limit repeated invalid case ID lookup attempts to reduce the risk of automated guessing or brute-force access.** | **Mandatory** | **Proposed implementation threshold: 5 invalid case ID lookup attempts within 10 minutes from the same IP address or browser session trigger a temporary 15-minute lookup restriction. Exact threshold may be adjusted with Dev if needed.** |
| **UR-ST-08** | **The system shall return a generic "case not found" message for invalid or nonexistent case ID lookups, without indicating whether the ID format itself is valid.** | **Mandatory** | **Closes an enumeration gap UR-ST-07 alone doesn't cover — prevents distinguishing "malformed ID" from "real format, wrong value."** |
| **UR-ST-09** | **The system should display an estimated review timeframe on the status page.** | **Nice-to-Have** | **Directly addresses the "distrust of the silent middle" research finding — most of the pipeline is invisible to the user; an ETA reduces perceived inaction without requiring real-time/push updates. Depends on operational SLA data not yet available.** |

**Tracking note:** Case-ID-based status tracking is part of the core workflow. The primary retention path is the "Copy Case ID" option (UR-ID-04) or browser-based local storage (UR-ID-07). Providing contact details and receiving email/SMS status updates are optional Nice-to-Have features. If a user loses their case ID and does not opt into contact-based updates, they may be unable to retrieve the case status later.

## Nice-To-Have Requirements — UX Exploration

| ID | Requirement | Priority | Notes |
| :---- | :---- | :---- | :---- |
| **UR-NTH-01** | **The system should allow a user to provide a link to the online content being reported as an alternative to uploading the video.** | **Nice-to-Have** |   |
| **UR-NTH-02** | **The system should allow a user to optionally provide a screenshot as supporting evidence.** | **Nice-to-Have** |   |
| **UR-NTH-03** | **The reporting interface should allow users to choose between the available evidence options rather than requiring every evidence type to be provided.** | **Nice-to-Have** |   |
| **UR-NTH-04** | **The system should allow a user to optionally provide a short free-text description of the reported content as supporting context.** | **Nice-to-Have** |   |
| **UR-NTH-05** | **The system should allow a user to add follow-up information or evidence to an already-submitted case using their case ID.** | **Nice-to-Have** |   |
| **UR-NTH-06** | **If a user's previously submitted content is ever displayed back to them in the flow, the system should present it behind a content warning.** | **Nice-to-Have** | **Reflects Marielle Lee's trauma-informed UX guidance from the expert interview.** |

**Priority note:** MVP uses direct video upload as the primary submission method. Link/screenshot submission and all items above remain UX exploration concepts, not currently planned for MVP implementation.

## Non-Functional Requirements

| ID | Requirement | Priority | Notes |
| :---- | :---- | :---- | :---- |
| **UR-NFR-01** | **The system shall present user-facing case status information in plain, non-technical language, support screen-reader interpretation, and shall not communicate status using colour or icons alone.** | **Mandatory** | **Provides a clear, testable accessibility baseline while keeping persona demographics and tech-literacy profiling outside this requirements document.** |
| **UR-NFR-02** | **The system shall present a clear consent/privacy notice to the user at the point of report submission, explaining what data is collected and how it will be used.** | **Mandatory** | **Baseline expectation for a public, unauthenticated form collecting sensitive report data.** |
| **UR-NFR-03** | **The system shall retain case records and associated data in accordance with a defined data-retention policy.** | **Mandatory** | **Provisional project rule: retain the closed case record for 12 months post-closure, then make it eligible for deletion/de-identification unless an ongoing legal or business need applies. This is a team project rule, not a claim of Australian legal mandate.** |
| **UR-NFR-04** | **The system shall protect uploaded video, case information and staff review data while in transit and while stored.** | **Mandatory** | **Security baseline: encryption in transit and at rest is required for sensitive case data. Exact protocols, key-management controls and cloud configuration are defined in the technical/security specification.** |
| **UR-NFR-05** | **Case IDs used for unauthenticated status retrieval shall be treated as sensitive access tokens and shall not be exposed unnecessarily through URL query strings, third-party analytics or application logs.** | **Mandatory** | **Security/privacy baseline: where operational logging is required, the raw Case ID shall be redacted or otherwise protected. This complements UR-ID-08 and UR-ST-07/08 by reducing accidental disclosure of the no-account lookup credential. Resolved 2026-09-09 (Hyuna/PM): implementation mechanism left to Dev's discretion — no visible UI/behavioural difference to specify at BA level.** |

## Normal User — Finalised Decisions & Remaining Follow-Ups

1. User-facing status wording is closed for Sprint 2: Received -> Being Reviewed -> Complete (UR-ST-02).
2. Email/SMS/secure-link features remain Nice-to-Have; if built later, their privacy, consent and security details must be specified at that time.
3. UR-VU-07 is updated with the client-confirmed target duration of approximately 10–15 minutes for Sprint 2 testing. The maximum raw-video file-size limit remains a Week 3 Dev follow-up for Firas/Aiden to validate through the real pipeline test. UR-VU-09 additionally requires testing across varying video durations to demonstrate pipeline/timeline performance.
4. UR-ST-03's completion/outcome flow is defined for standard cases; the exact positive public-facing outcome label remains to be confirmed. Production use would still require formal legal/privacy review.
5. UR-VU-08 is closed as a requirement decision: file-integrity validation is mandatory; malware scanning is optional and not an MVP/Sprint 2 requirement.
6. UR-NFR-03 uses a provisional 12-month post-closure retention rule for the project baseline; it is not presented as a legally mandated Australian retention period.

**Legal/regulatory escalation scope note:** The Sprint 2 prototype does not define or automate external mandatory-reporting or law-enforcement escalation. Where reviewed content may require statutory reporting or specialist legal handling, the case shall remain escalated internally pending an authorised legal/policy decision. Any production reporting workflow, recipients, disclosure rules and preservation obligations require formal legal review.

---

# 2. Auditor Requirements

**Purpose**

To define the finalised functional and wellbeing requirements for the Auditor persona, combining the project brief, Week 1 client-confirmed specifications, Aleeya's Auditor research/persona snapshots, the Marielle Lee expert interview, and the Core Use Cases & Business Rules handover.

| Persona definition The Auditor is a human reviewer who receives assigned cases, reviews AI-assisted analysis under wellbeing protections, decides whether to proceed with potentially harmful content, records an assessment and comments, may adjust the AI severity/CVI rating, and submits the reviewed case to the Manager. |
| :---- |

## Case Assignment & Access Requirements

| ID | Requirement | Priority | Notes |
| :---- | :---- | :---- | :---- |
| **AR-AS-01** | **The system shall allow an Auditor to access only cases that are assigned to them.** | **Mandatory** | **Project baseline: Role-based access is a project success criterion; Auditors see assigned cases only.** |
| **AR-AS-02** | **The system shall automatically assign submitted cases to eligible Auditors using a weighted score combining exposure level and current case count: Score = (0.6 × exposure ratio) + (0.4 × case ratio), where exposure ratio = current exposure minutes ÷ 120 and case ratio = active case count ÷ 10 (reference constant, not an enforcement cap). The eligible Auditor with the lowest score is assigned the case; ties are broken by round-robin (the Auditor who hasn't received a new case in the longest time). Auditors in cooldown or at their daily exposure cap are excluded before scoring.** | **Mandatory** | **Client-confirmed: Exposure level + case count are the confirmed assignment factors. Formula adopted 2026-09-09 (team decision, Option 2 of two proposals): the 0.6/0.4 weighting is a team-defined operational choice directly implementing the already-confirmed wellbeing-priority principle (CV-04/AR-WB-08) — exposure is weighted higher than case count, not an external standard. The "10" reference constant in the case ratio is a scaling constant for this formula only, not a hard caseload limit — it does not reopen Naresh's confirmed answer that case count alone shouldn't be used as the exposure-cap metric.** |
| **AR-AS-03** | **The system shall automatically trigger the AI-processing pipeline once a case is assigned, without requiring a manual Auditor or Manager action.** | **Mandatory** | **Client-confirmed: Assignment triggers AI processing automatically.** |
| **AR-AS-04** | **The Auditor dashboard shall indicate when an assigned case is still processing and shall prevent normal review until AI processing has completed sufficiently for review.** | **Mandatory** | **Client-confirmed: During processing, the Auditor view shows the case as processing/in review; review follows processing.** |
| **AR-AS-05** | **The case-assignment logic shall gently deprioritise (not exclude) an Auditor for a 30-minute window immediately after they exit a cooldown triggered by an S3/S4 case, based on the Auditor's own cooldown-completion timestamp rather than the new case's severity. If every eligible Auditor is within this window, standard weighted round-robin applies** | **Mandatory** | **Team-defined business rule. Complements the client-confirmed exposure + case-count weighted round-robin without allowing cases to remain unassigned.** |
| **AR-AS-06** | **Auditor and Manager access shall require authenticated, role-scoped login, with visibility controlled by the user role.** | **Mandatory** | **Baseline access requirement. Detailed MFA and session-timeout rules are deferred to the technical/security specification and must be tracked there before implementation; they are not defined in this persona baseline.** |

## Pre-Viewing & Content Exposure Requirements

| ID | Requirement | Priority | Notes |
| :---- | :---- | :---- | :---- |
| **AR-PV-01** | **Before potentially harmful source content is displayed, the system shall present a content-warning modal that allows the Auditor to proceed or decline.** | **Mandatory** | **Project baseline: Content warning and right-to-decline are required wellbeing controls.** |
| **AR-PV-02** | **The content-warning modal shall use neutral, non-persuasive language and present Proceed and Decline as genuine choices.** | **Mandatory** | **UX / expert-informed: Marielle Lee recommended neutral wording and real user choice.** |
| **AR-PV-03** | **Potentially harmful thumbnails and source video shall be blurred or suppressed by default before deliberate Auditor viewing.** | **Mandatory** | **Project baseline: Blur-by-default is an agreed protective control.** |
| **AR-PV-04** | **The Auditor shall be able to adjust visual exposure using a fine-grained, self-controlled blur-intensity slider (0–100%, small fixed step increments, defaulting to 100%/maximum) during review, rather than a small set of named preset levels.** | **Mandatory** | **Adopted 27 Aug 2026: fine-grained moderator-controlled blur slider, rather than named preset levels. The interaction approach is informed by Das, Dang & Lease (2020), which supports interactive blur control for moderators. The 0–100% scale, maximum-blur default, small fixed step increments and AI suggested-severity reference marker are team-defined implementation choices.** |
| **AR-PV-05** | **The Auditor shall be able to enable or disable grayscale while reviewing source video.** | **Mandatory** | **Project baseline: Grayscale control was demonstrated in the working concept and is retained in the Auditor scope.** |
| **AR-PV-06** | **The Auditor shall be able to mute or unmute source audio independently of video playback.** | **Mandatory** | **Team-defined: Audio mute is adopted as a practical exposure-control enhancement; it is not a separate client-confirmed requirement.** |
| **AR-PV-07** | **If previously hidden or blurred source content is revealed, the system shall do so only after the Auditor has deliberately chosen to proceed.** | **Mandatory** | **Project baseline: Raw-content exposure follows an explicit proceed decision.** |
| **AR-PV-08** | **The system shall require the Auditor to actively acknowledge the content warning before raw source content is revealed. This acknowledgement shall be required when raw content is first accessed and whenever the review has returned to a protected state before raw content is revealed again.** | **Mandatory** | **The acknowledgement should use neutral wording and require a deliberate action to proceed. This complements AR-PV-01, AR-PV-02 and AR-PV-07.** |

## AI Analysis & Review Requirements

| ID | Requirement | Priority | Notes |
| :---- | :---- | :---- | :---- |
| **AR-AI-01** | **The system shall display the AI-generated severity/CVI rating for the assigned case.** | **Mandatory** | **Project baseline: Severity scoring is a core pipeline output.** |
| **AR-AI-02** | **The system shall display a narrative summary explaining the AI analysis before requiring raw-content review.** | **Mandatory** | **Project baseline: A safe narrative summary is a core reviewer-facing output.** |
| **AR-AI-03** | **The system shall display an incident timeline with timestamps showing where harmful or relevant events were detected in the video.** | **Mandatory** | **Project baseline: Incident timestamps/timeline are core outputs.** |
| **AR-AI-04** | **The incident timeline shall mark each AI-flagged incident at the available timestamp resolution, including brief incidents; no universal minimum harmful-content duration is required for a timeline marker.** | **Mandatory** | **Team-defined safety rule: a brief but high-impact incident should not disappear from the warning timeline because it falls below an arbitrary duration threshold.** |
| **AR-AI-05** | **The system shall display flagged entities and associate them with relevant incident timestamps where available.** | **Mandatory** | **Project baseline: Flagged entities and entity/timestamp mapping were part of the demonstrated review flow.** |
| **AR-AI-06** | **Where Speech-to-Text/audio analysis is available, the system shall display the transcript and a timestamped audio-intensity graph aligned to the review timeline.** | **Mandatory** | **Project baseline: The demonstrated audio analysis used STT and a timestamped audio-intensity graph; this is not an emotion graph.** |
| **AR-AI-07** | **The Auditor shall be able to adjust or override the AI-generated severity/CVI rating. If the Auditor changes the AI-generated rating, the system shall require a comment explaining the human assessment before the completed assessment can be submitted.** | **Mandatory** | **Client-confirmed: Auditor override and comments are explicitly approved. Team-defined traceability rule: a comment is required when the AI-generated rating is changed.** |
| **AR-AI-08** | **The system shall store both the AI output and the Auditor-adjusted rating/comments with the case.** | **Mandatory** | **Client-confirmed: Both AI and human inputs must be captured.** |
| **AR-AI-09** | **The Auditor shall be able to submit the completed assessment and comments to the Manager review queue.** | **Mandatory** | **Client-confirmed: Auditor review + comments are submitted to the Manager. Submission to the Manager review queue does not require active Manager approval for standard cases; standard-case completion follows MR-CR-06.** |
| **AR-AI-10** | **If AI or Speech-to-Text processing fails before review, the system shall default the case to maximum visual protection, display an explicit failure state, and require the Auditor to deliberately proceed with reduced AI support or decline before raw content is shown.** | **Mandatory** | **Team-defined fallback. The client delegated AI/STT failure handling to the team; failed processing must not be presented as successful.** |
| **AR-AI-11** | **If AI/STT processing fails after review has begun and creates unexpected exposure risk, the system shall treat the event as unexpected exposure and apply the SOS/wellbeing notification path.** | **Mandatory** | **Team-defined fallback linked to AR-WB-07.** |
| **AR-AI-12** | **The system shall preserve a timestamped audit history of changes to AI-generated severity/CVI assessments, Auditor overrides, Auditor comments and relevant case-status changes, including the authenticated user responsible and the previous and updated values where applicable.** | **Mandatory** | **Traceability requirement: the business need is a reliable change history for Manager oversight and review. The implementation mechanism (for example, an append-only event log or database audit table) is a Dev/security decision; this requirement does not prescribe cryptographic immutability.** |
| **AR-AI-13** | **The system shall allow the Auditor to return to the previous step or screen during an active case review without losing their current review progress or entered information.** | **Mandatory** | **Team-defined UX requirement. Returning to a previous review step shall not automatically replay raw source content. If the Auditor chooses to replay source video, the additional active playback time counts toward exposure under AR-WB-01.** |
| **AR-AI-14** | **The Auditor shall select a final case outcome when submitting a completed standard review.** | **Mandatory** | **The final outcome is separate from the AI/Auditor severity-CVI rating and determines the public-facing result for standard cases.** |

## Exposure, Cooldown & SOS Requirements

| ID | Requirement | Priority | Notes |
| :---- | :---- | :---- | :---- |
| **AR-WB-01** | **The system shall track each Auditor's accumulated exposure time for the working day and display progress against the applicable limit.** | **Mandatory** | **Client-confirmed time-based exposure tracking. Sprint 2 counting rule: time accrues while source video is actively playing, including when blur/grayscale/audio mute are enabled; paused/stopped video and AI-only analysis do not count; replays count again.** |
| **AR-WB-02** | **For testing purposes, the default daily exposure cap shall be 120 minutes.** | **Mandatory** | **Client-confirmed: 2 hours / 120 minutes is the confirmed testing cap.** |
| **AR-WB-03** | **An Auditor who reaches the applicable exposure limit shall not receive further normal case assignments.** | **Mandatory** | **Project baseline: Exposure limits block further assignment.** |
| **AR-WB-04** | **The system shall enforce the applicable cooldown after high-severity or unexpected harmful exposure.** | **Mandatory** | **Project baseline: severity-based cooldowns are part of the wellbeing layer; AR-WB-12 defines the Sprint 2 tier durations.** |
| **AR-WB-05** | **The Auditor shall have an immediately accessible SOS/support action while reviewing a case.** | **Mandatory** | **Project baseline: SOS is a core wellbeing control.** |
| **AR-WB-06** | **When the Auditor activates SOS, the system shall record the event and notify the Manager.** | **Mandatory** | **Client-confirmed / project baseline: SOS is routed to Manager oversight.** |
| **AR-WB-07** | **If an Auditor is unexpectedly exposed to harmful content beyond expected levels, the system shall log the exposure, apply relevant wellbeing protections, and send an email notification to the Manager.** | **Mandatory** | **Client-confirmed: A simple email to the Manager is sufficient for unexpected exposure notification.** |
| **AR-WB-08** | **Where wellbeing protections conflict with moderation speed, the system and workflow shall prioritise Auditor wellbeing.** | **Mandatory** | **Client-confirmed: Wellbeing always takes precedence over moderation speed.** |
| **AR-WB-09** | **When an Auditor activates SOS during source-video playback, the system shall immediately pause playback and return the review interface to a protected state. Resuming raw-content review shall require a new deliberate Proceed action.** | **Mandatory** | **Team-defined safety behaviour: Closes the immediate post-SOS exposure gap while preserving the client-confirmed Manager notification path in AR-WB-06.** |
| **AR-WB-11** | **The system shall classify each case using a four-tier exposure-severity framework (S1–S4) to support wellbeing controls such as cooldowns and severity-aware case assignment.** | **Mandatory** | **Approved 27 Aug 2026 (team-defined working baseline): CVI 0–39 = S1 Low; 40–64 = S2 Moderate; 65–84 = S3 High; 85–100 = S4 Critical. The 0–100 CVI scale is a project placeholder, not an external standard. The specific tag-to-tier / minimum-severity floor taxonomy remains open for Week 3 pending Aiden's actual pipeline output/schema.** |
| **AR-WB-12** | **The system shall apply cooldowns by the S1–S4 exposure-severity framework: S1 none; S2 5 minutes after sustained/repeated exposure, defined as continuous S2 exposure beyond approximately 2 minutes in one case or 2+ S2 cases within the agreed review-block window; S3 15 minutes mandatory; S4 30 minutes minimum plus a mandatory Manager/support check-in and an option to stop/reassign. Immediately after an S3/S4 cooldown, the next assigned case shall not be S3/S4. An SOS event (AR-WB-06) triggers the same cooldown protocol as an S4 case — 30 minutes minimum, plus a mandatory Manager/support check-in and the option to stop or reassign the remaining shift — regardless of the case's originally-assigned severity tier, since SOS is by definition unexpected exposure and its severity can't be reliably known in advance.** | **Mandatory** | **Team-defined Sprint 2 wellbeing rule. Review-block window adopted 2026-09-09: 45 minutes — the more protective end of the previously-cited 45–50 minute working range, consistent with CV-04's unconditional wellbeing-priority ruling. No additional whole-shift severe-case spacing rule applies; AR-AS-05's 30-minute soft deprioritisation plus the single post-cooldown exclusion above remain the Sprint 2 baseline. SOS-cooldown mapping added 2026-09-09 (see requirement text) — reuses the existing S4 protocol rather than a new number, consistent with AR-AI-10/AR-AI-11's default-to-maximum-protection logic. Only the tag/floor taxonomy (AR-WB-11) remains a Week 3 follow-up.** |
| **AR-WB-15** | **The system shall calculate a case's overall severity using the highest S-tier reached by any flagged incident in the video ("worst-tier-wins"), with AR-WB-12's S2 sustained/repeated escalation logic layered on top.** | **Mandatory** | **Approved 27 Aug 2026 (team yes). Case-level severity is not averaged across the full video runtime; the most severe flagged incident determines the baseline tier, while repeated moderate exposure may still escalate under AR-WB-12.** |
| **AR-WB-16** | **The Auditor shall have access to an optional, low-friction wellbeing check-in, distinct from SOS, allowing them to flag a difficult case or request a break without formal escalation** | **Nice-to-Have** | **Adopted 1 Sep 2026. Structurally separate from SOS (reserved for unexpected exposure) — no urgent/alarm framing, optional to answer, appears at the cooldown moment and during review. Matched Manager-side requirement: MR-SOS-07** |

**CVI/tag follow-up:** CVI score cut-offs are approved under AR-WB-11. Only the tag-to-tier / minimum-severity floor taxonomy remains open for Week 3, pending Aiden's actual pipeline output/schema.

**Severity-duration clarification:** For severity/cooldown classification, duration refers to the cumulative duration of harmful or flagged segments, not the total video length. No universal minimum duration applies to S3/S4 because a brief high-impact incident may still warrant a High/Critical classification. AR-WB-12 defines the S2 trigger structure using the adopted 45-minute review-block window.

## Decline Flow Requirements

| ID | Requirement | Priority | Notes |
| :---- | :---- | :---- | :---- |
| **AR-DF-01** | **The Auditor shall be able to decline a case instead of proceeding with potentially harmful source content.** | **Mandatory** | **Client-confirmed / project baseline: Right to decline is a core wellbeing control.** |
| **AR-DF-02** | **A declined case shall be routed directly to the Manager and shall not be automatically reassigned by the system.** | **Mandatory** | **Client-confirmed: The Manager decides whether reassignment is appropriate.** |
| **AR-DF-03** | **The decline flow shall capture one structured decline reason; selecting "Other" shall reveal an optional free-text field.** | **Nice-to-Have** | **Adopted 27 Aug 2026. Reasons, in order: Content more severe than AI indicated; Near my exposure limit; Personal Trigger; Other (free-text). No option shall be pre-selected by default, so the Auditor actively selects the reason that best reflects their decision.** |
| **AR-DF-04** | **The interface shall explain that declining is a supported wellbeing action and that the case will be returned to the Manager for review/reassignment where appropriate.** | **Mandatory** | **UX / expert-informed: Use neutral reassurance without pressuring the Auditor to proceed.** |
| **AR-DF-05** | **The declined-case workflow shall remain lower implementation priority than the main end-to-end review flow.** | **Mandatory** | **Client-confirmed: Build the decline/reassignment flow later in the pilot rather than ahead of the core flow.** |

## Auditor — Week 3 / Implementation Follow-Ups

1. Exposure-clock counting is closed for the BA baseline and recorded in AR-WB-01: active source-video playback counts; paused/stopped video and AI-only analysis do not; replays count again.
2. AR-PV-04 is resolved as a fine-grained 0–100% slider (small fixed step increments, defaults to maximum), not named levels — see AR-PV-04's Notes. No open design question remains here.
3. AI/STT failure handling is closed at requirement level through AR-AI-10 and AR-AI-11; Dev will map the behaviour to the actual pipeline failure states.
4. Decline copy must remain neutral and procedural. Do not promise a performance/employment outcome such as "no performance penalty" unless PM/BA formally adopt that policy.
5. AR-WB-11's CVI score cut-offs are approved for the working 0–100 placeholder scale. Week 3 work with Aiden is limited to validating the actual pipeline tag/schema and finalising the tag-to-tier / minimum-severity floor mapping.
6. AR-WB-12 review-block window is closed for Sprint 2 at 45 minutes, as adopted 2026-09-09; no further Week 3 decision is required for this value.
7. Exposure-cap active-case behaviour remains a Week 3 decision: confirm what happens if an Auditor reaches the applicable exposure limit during an active case (for example, whether source playback must stop immediately or the current case may be completed). Dev should not assume this behaviour until the business rule is closed.
8. Cooldown scope remains a Week 3 decision: define which actions are blocked during an active cooldown, including new harmful-content assignments, raw source-video playback and any AI-only or administrative review activity.
9. Post-cooldown assignment fallback remains a Week 3 decision: define what happens if every eligible Auditor is subject to the one-case S3/S4 exclusion in AR-WB-12 while only S3/S4 cases are waiting (for example, hold the case or require Manager intervention).
10. Daily exposure reset remains a Week 3 decision: define the boundary for "working day"/daily exposure accumulation (for example, shift start/end, calendar day, or another agreed reset rule) before Dev implements persistent exposure totals.

---

# 3. Manager Requirements

**Purpose**

To define the finalised requirements for the Manager persona, combining confirmed oversight, exposure, SOS and reassignment responsibilities with Aleeya's Manager persona snapshots/assumptions and the Core Use Cases & Business Rules handover.

| Persona definition The Manager oversees multiple Auditors, monitors workload and exposure, receives and responds to SOS/unexpected-exposure alerts, reviews Auditor assessments, and decides whether declined or escalated cases should be reassigned or progressed. |
| :---- |
| **Source note** Combines client-confirmed Manager responsibilities with Aleeya Ahmad's Manager assumptions/persona handover. Jordan/Reese/Sam remain design lenses for one Manager role; UX-only workflow details are labelled Team-defined. |

## Team Oversight & Exposure Monitoring Requirements

| ID | Requirement | Priority | Notes |
| :---- | :---- | :---- | :---- |
| **MR-OV-01** | **The system shall provide a Manager dashboard showing the Auditors under the Manager's oversight and relevant workload/exposure information.** | **Mandatory** | **Project baseline: Managers oversee multiple Auditors, exposure levels and case activity.** |
| **MR-OV-02** | **The dashboard shall display each Auditor's accumulated exposure against their applicable exposure limit using a clear progress indicator.** | **Mandatory** | **Team-defined: Exposure progress bars are the adopted UX representation of the confirmed exposure-monitoring responsibility.** |
| **MR-OV-03** | **The dashboard shall display active cooldown status and remaining cooldown time for Auditors where applicable.** | **Mandatory** | **Team-defined: Cooldown timers provide actionable visibility for the confirmed wellbeing controls.** |
| **MR-OV-04** | **The Manager shall be able to set or adjust an individual exposure limit for an Auditor.** | **Mandatory** | **Client-confirmed: Individual Manager-controlled exposure limits are explicitly approved.** |
| **MR-OV-05** | **The dashboard shall visually distinguish Auditors who are comfortably below, approaching, or at their exposure limit.** | **Mandatory** | **Team-defined operational threshold: Approaching Limit begins at 75% of the applicable exposure cap (90 minutes when the default 120-minute testing cap applies); At Limit begins at 100%.** |
| **MR-OV-06** | **The Manager shall have broader role-based visibility than Auditors for oversight of relevant cases, reviews and wellbeing events.** | **Mandatory** | **Project baseline: Managers require broader oversight while Auditors see assigned cases only.** |
| **MR-OV-08** | **The Manager dashboard shall provide a distinct validation view, separate from live case oversight, showing the AI pipeline's severity/tag outputs compared against manually labelled ground-truth values for the project's synthetic/staged validation set, summarised graphically or through simple validation statistics.** | **Mandatory** | **Client-confirmed validation requirement: Mandatory but lower implementation priority than the main end-to-end flow. The specific pass/fail accuracy or recall threshold remains open pending real pipeline results. Any mock or demo values used before validation must be clearly labelled as placeholder/mock data and must not be presented as real validation results.** |

## SOS & Wellbeing Response Requirements

| ID | Requirement | Priority | Notes |
| :---- | :---- | :---- | :---- |
| **MR-SOS-01** | **When an Auditor activates SOS, the system shall notify the Manager and make the event available for follow-up.** | **Mandatory** | **Project baseline: Managers respond to Auditor SOS alerts.** |
| **MR-SOS-02** | **When unexpected harmful exposure is detected/reported beyond expected levels, the system shall send an email notification to the Manager.** | **Mandatory** | **Client-confirmed: A simple email is sufficient as the baseline notification.** |
| **MR-SOS-03** | **Unresolved SOS events shall also appear as a visually urgent in-app banner or alert on the Manager dashboard.** | **Mandatory** | **Team-defined: In-app urgency complements, rather than replaces, the confirmed email baseline.** |
| **MR-SOS-04** | **The Manager shall be able to acknowledge an SOS alert and record that follow-up has begun.** | **Mandatory** | **Project baseline / team-defined UI: Manager acknowledgement and check-in are part of the intended response flow.** |
| **MR-SOS-05** | **The Manager SOS view shall display relevant Auditor exposure and case context without requiring raw source-video viewing by default.** | **Mandatory** | **Team-defined: Supports rapid wellbeing response while minimising unnecessary Manager exposure.** |
| **MR-SOS-06** | **The Manager shall be able to follow up with the affected Auditor after an SOS or unexpected-exposure event.** | **Mandatory** | **Client-confirmed / project baseline: Manager check-in is a core responsibility.** |
| **MR-SOS-07** | **The Manager shall be able to view an Auditor-raised wellbeing check-in (including any break request) within that Auditor's normal case/record view, distinct from the SOS alert surface.** | **Nice-to-Have** | **Adopted 1 Sep 2026. Routine check-ins are logged only, no Manager action required; a flagged break request gets a distinct low-key marker with an Approve action. No aggregated per-Auditor tally. Matched Auditor-side requirement: AR-WB-16.** |

## Case Review & Reassignment Requirements

| ID | Requirement | Priority | Notes |
| :---- | :---- | :---- | :---- |
| **MR-CR-01** | **The Manager shall be able to review the AI-generated analysis, the Auditor assessment, Auditor comments and any adjusted severity/CVI rating for a submitted review.** | **Mandatory** | **Project baseline: Auditor review/comments and adjusted rating flow into Manager review.** |
| **MR-CR-02** | **A case declined by an Auditor shall appear in a Manager review/reassignment queue.** | **Mandatory** | **Client-confirmed: Declined cases route directly to the Manager.** |
| **MR-CR-03** | **The Manager shall decide whether a declined case requires reassignment using the Auditor comments, applicable exposure/SLA information and available AI-processing output.** | **Mandatory** | **Client-confirmed: These are the confirmed reassignment considerations.** |
| **MR-CR-04** | **The reassignment queue should display a structured decline reason and optional Auditor comments where provided.** | **Nice-to-Have** | **Lower priority: Team-defined to support fast reassignment decisions with minimal additional review burden.** |
| **MR-CR-05** | **Routine reassignment decisions shall be possible using AI output and Auditor context without requiring the Manager to view raw harmful footage.** | **Mandatory** | **Team-defined: Supports the project wellbeing goal; this is not a client-confirmed prohibition on Manager raw access.** |
| **MR-CR-06** | **Cases submitted by an Auditor with no SOS or Decline flag shall automatically progress to Complete using the Auditor's submitted final case outcome and shall not require active Manager review or approval. They shall remain visible in the Manager's consolidated oversight view. Cases flagged through SOS or Decline shall require Manager review and action before they can progress to completion.** | **Mandatory** | **Team-defined completion rule. Standard cases progress without an additional Manager approval step; active Manager action is reserved for SOS- or Decline-flagged cases. Clarification 2026-09-09: the Manager's "process it myself" path for a declined/flagged case is the existing "no reassignment needed" decision — it closes the case to Complete without the Manager viewing raw content or making a content judgment (MR-CR-05/MR-CR-08). The Manager is never expected to perform an Auditor-style content review, CVI adjustment, or outcome selection; that stays exclusively an Auditor responsibility (AR-AI-07/AR-AI-14).** |
| **MR-CR-07** | **The declined/reassignment workflow shall remain lower implementation priority than the main end-to-end case flow.** | **Mandatory** | **Client-confirmed: Reassignment is a later-pilot feature.** |
| **MR-CR-08** | **If a Manager genuinely needs to view raw source content for an exceptional case, the Manager shall pass through the same content-warning and exposure-protection controls used for Auditor raw-content review.** | **Mandatory** | **Team-defined wellbeing rule. Routine Manager decisions should continue to use structured AI/Auditor context without raw viewing where possible.** |

## Manager — Remaining Implementation Follow-Ups

1. Exposure progress states are defined for Sprint 2, including the 75% Approaching Limit threshold; UX may refine visual presentation without changing the threshold.
2. Structured decline reasons remain lower-priority/Nice-to-Have, but the labels, order and no-default-selection rule are now resolved in AR-DF-03. UX may refine visual presentation without changing that adopted content.
3. Manager completion behaviour must remain aligned with the public status/outcome rules in UR-ST-02 and UR-ST-03 so internal labels are not leaked to the Normal User.
4. Exceptional Manager raw-content access is covered by MR-CR-08; detailed Manager exposure logging/caps are not part of the Sprint 2 baseline unless separately adopted.
5. The exact visual escalation/reminder behaviour for unresolved in-app SOS alerts remains a UX/implementation detail; the confirmed baseline is Manager notification and follow-up, with email for unexpected exposure.
6. AI/model validation acceptance threshold remains an explicit open decision under MR-OV-08/CV-10. The team shall agree the pass/fail metric and threshold after initial validation-set results are available; any preliminary figure (including a 90% recall candidate) is not an adopted requirement.

---

# Staff Access & Authentication

| ID | Requirement | Priority | Notes |
| :---- | :---- | :---- | :---- |
| **SR-SA-01** | **The system should provide a separate staff portal for authorised Auditor and Manager users to access internal case-management functionality.** | **Mandatory** | **Sprint 2 approach: Staff access the internal portal through a dedicated staff URL separate from the public reporting journey. For example, this could be a subdomain such as `staff.company.com` or a dedicated path such as `company.com/staff`. The organisation is responsible for providing authorised staff with access to this URL.** |
| **SR-SA-02** | **The system should require Auditor and Manager users to authenticate before accessing the staff portal.** | **Mandatory** |   |
| **SR-SA-03** | **The system should restrict staff functionality based on the authenticated user's assigned role.** | **Mandatory** |   |
| **SR-SA-04** | **The system should prevent public users from creating Auditor or Manager accounts.** | **Mandatory** |   |
| **SR-SA-05** | **The system shall allow authenticated Auditor and Manager users to securely sign out of the staff portal.** | **Mandatory** | **On sign-out, the user shall be returned to the Staff Portal login screen and shall no longer be able to access authenticated staff functionality without signing in again.** |

**Assumption:** Auditor and Manager accounts are provisioned by the organisation before use. Staff self-registration, account creation and account administration are outside the Sprint 2 scope.

---

# Client-Confirmed Values Incorporated as Final Specs

**Purpose**

This summary makes the Week 1 client clarifications explicit so the team can quickly verify which values and behaviours are treated as final specifications for Sprint 2.

| ID | Requirement | Priority | Notes |
| :---- | :---- | :---- | :---- |
| **CV-01** | **Case assignment weighting uses accumulated exposure level + case count in a round-robin style distribution.** | **Final** | **Applied to AR-AS-02 and assignment logic.** |
| **CV-02** | **Case assignment automatically triggers AI processing; no manual trigger is required.** | **Final** | **Applied to AR-AS-03 / AR-AS-04.** |
| **CV-03** | **Auditor exposure is measured by time, with a 120-minute daily testing cap.** | **Final** | **Applied to AR-WB-01 / AR-WB-02.** |
| **CV-04** | **Auditor wellbeing takes precedence over moderation speed.** | **Final** | **Applied to AR-WB-08 and Manager oversight decisions.** |
| **CV-05** | **Auditors may adjust/override the AI severity/CVI rating and submit comments; both are recorded.** | **Final** | **Applied to AR-AI-07 / AR-AI-08.** |
| **CV-06** | **Managers may set individual Auditor exposure limits.** | **Final** | **Applied to MR-OV-04.** |
| **CV-07** | **Declined cases route directly to the Manager; the Manager decides on reassignment using comments, exposure/SLA and AI output.** | **Final** | **Applied to AR-DF-02 and MR-CR-02 / MR-CR-03.** |
| **CV-08** | **Unexpected harmful Auditor exposure triggers a Manager email notification; a simple email is sufficient as the baseline.** | **Final** | **Applied to AR-WB-07 and MR-SOS-02.** |
| **CV-09** | **The declined/reassignment workflow is lower priority than the main end-to-end application flow.** | **Final** | **Applied to AR-DF-05 and MR-CR-07.** |
| **CV-10** | **When reporting AI/model performance, the project shall provide manually labelled ground-truth statistics for a sample set and present the comparison graphically.** | **Final** | **Client-confirmed project validation requirement. Applied to MR-OV-08 as the validation view/mechanism. The exact pass/fail threshold remains open pending real pipeline results and is not fixed at a 90% recall figure.** |
| **CV-11** | **For Sprint 2 testing, the project shall support average 10–15 minute videos and include videos of varying durations to demonstrate and assess pipeline/timeline performance.** | **Final** | **Client-confirmed, 28 Aug 2026. Applied to UR-VU-07 and UR-VU-09. This does not define a hard 15-minute maximum or a raw-video file-size cap.** |
