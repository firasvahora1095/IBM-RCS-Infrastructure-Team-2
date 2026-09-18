# Sprint 2 Microcopy Correctness Audit (Task 100)

**Track:** Design / Product · **Sprint:** Sprint 2 · **Owner:** Aleeya Ahmad (UX) · **Date:** 18 Sep 2026
**Branch:** `feature/frontend` · **Related:** [UI review against Figma (Task 57)](sprint2-ui-review-figma-log.md) · [Build-scope handoff (Task 54)](sprint2-build-scope-handoff.md)

**AC:** every checked label matches the confirmed documentation exactly.

---

## 1. Method and sources

1. **Controlled values first.** The exact strings were copied from the confirmed documents and pinned in `frontend/src/design-tokens/canonicalLabels.test.ts` (commit `2655e44`), so any wording drift now fails CI:
   - `docs/ba/ba-requirements-sprint2-final.md`: **RT-01** (Final Outcome Taxonomy, PM-confirmed 16 Sep 2026), **RT-02** (internal → staff → public status), **AR-DF-03** (decline reasons and order).
   - `docs/ba/severity-scale.md`: S1–S4 names and CVI bands.
   - Manager Figma `0qMhTLDlozGkcdqcgbwyse`: exposure states (78:69), SOS status column (103:151), follow-up outcomes (103:228).
2. **Every other user-facing string.** String literals and JSX text were extracted from `src/pages`, `src/components` and `src/hooks` (≈540 candidates). They were compared with the matching Figma frame, exported during the Task 57 review, and with the running app in each state.
3. **Classification:** matches · fixed (with commit) · deliberate keep (with reason) · needs sign-off (no approved source, or the sources disagree).

---

## 2. Controlled values (all match, locked by test)

| String(s) | Where shown | Source | Matches? | Action |
|---|---|---|---|---|
| Received · Being Reviewed · Complete | Public status page | RT-02 Public Status | Yes | Locked (`canonicalLabels.test.ts`) |
| Submitted · AI Processing · Ready for Review · Auditor Review · Complete | Manager Case Oversight, staff lists | RT-02 Staff-Facing Label | Yes | Locked |
| No Violation Found / "Your report has been reviewed and no policy violation was identified based on the available information." | Status page (Complete), Auditor outcome picker | RT-01 | Yes | Locked |
| Policy Violation Found / "Your report has been reviewed and a policy violation was identified. Thank you for taking the time to submit your report." | Same | RT-01 | Yes | Locked; the test also checks Auditors are offered only these two |
| RT-01 scope note (no removal, reporting to authorities or "actioned" in outcome copy) | Public outcome copy | RT-01 scope note | Yes | Locked (regex check over all three public outcomes) |
| S1 Low · S2 Moderate · S3 High · S4 Critical; bands 0–39 / 40–64 / 65–84 / 85–100 | Severity tags, CVI slider | Severity scale | Yes | Locked (edges 39/40, 64/65, 84/85) |
| Content more severe than AI indicated · Near my exposure limit · Personal Trigger · Other | Decline modal, Manager queue | AR-DF-03 (order is part of the requirement) | Yes | Locked |
| Under · Approaching · At limit | Oversight Dashboard | Figma 78:69 | Yes | Locked |
| Acknowledged — in progress · Resolved | SOS Inbox | Figma 103:151 | Yes | Locked |
| Followed up — no further action · — reassigned remaining cases · — Auditor stopped shift | SOS follow-up | Figma 103:228 | Yes | Locked |

## 3. Screen copy checked against Figma

| String | Screen | Source | Matches? | Action |
|---|---|---|---|---|
| Upload intro, trust banner, format help, detail field, reporting choice, consent, errors, footer | Upload (video / link / screenshot / identified) | NU 5:2, 72:28, 72:58, 418:72, 73:29, 73:41 | Yes | — |
| Case ID confirmation copy (save warning, updates block, requirement links, footnote) | Case ID confirmation | NU 6:2 | Yes | — |
| Being Reviewed panel, "Coming up", estimate, "We don't share who is reviewing…", add-information button + modal | Status page | NU 7:16, 80:31 | Yes | — |
| Lookup and not-found copy | Status lookup | NU 7:15, 7:41 | Yes | — |
| Login, incorrect credentials, "Too many attempts. Try again in 15 minutes." | Staff login | Auditor 8:2, 8:22, 36:129 | Yes (apart from the eyebrow and field label, §4) | — |
| Queue intro, status copy, empty / cooldown / exposure-limit banners, "Locked during cooldown" | Auditor queue | Auditor 10:6, 36:146, 36:189, 34:121 | Yes | — |
| "This case was flagged for:", consent label, decline note | Content warning | Auditor 16:19 | Yes | Heading weight fixed `04c0140` |
| "Proceeding opens the Review Workspace directly at maximum blur — regardless of any AI suggestion, since severity is unknown here, not neutral. There is no AI Analysis Summary screen for this case; there is nothing to summarize." | AI-failure gate | Auditor 25:212 | **No** — the build had a shortened sentence | **Fixed** `04c0140` |
| Decline question, supported-action note, "Case declined: Your manager will review it directly." | Decline modal / confirmation | Auditor 25:137, 25:353 | Yes | — |
| AI summary figure caption, effective-score note, timeline note, transcript caption | AI Analysis Summary | Auditor 18:26 | Yes | — |
| Blur, grayscale, "Something about this one? Talk to your manager", SOS note, connection-lost banner | Review Workspace | Auditor 20:35, 42:352 | Yes | — |
| CVI help, comment-required label, outcome help, "Couldn't submit — check your connection and try again." | Severity & comment | Auditor 25:53, 42:405 | Yes | — |
| "What was recorded" rows | Submission confirmation | Auditor 25:280 | Yes, except the Sprint 3 cooldown sentence | Deliberate keep (the build triggers AR-WB-12 cooldowns, so it states the cooldown instead) |
| "Cooldown in progress", "This cooldown is a built-in protection, not a penalty.", "Stop my shift" | Cooldown | Auditor 31:99 | Yes for S3/S4 | S2/SOS intros need sign-off (§4) |
| "We've paused this case and notified your manager." + follow-up lines | SOS | Auditor 31:257 | Yes | — |
| Session-expired modal | Auditor / Manager | Auditor 36:235, Manager 1:1231 | Yes (staff ID replaces the name) | Deliberate keep |
| Manager dashboard, Auditor Detail, Case Oversight, SOS pages, reassignment, raw access, Validation | Manager | Manager 78:69 … 136:257 | Yes | — |
| "Exposure limit saved: … daily limit is now 90 minutes." | Auditor Detail after saving | Manager 356:364: "Success: Exposure limit updated to 90 min." | **No** | **Fixed** `b4250b9` |
| "2:07 am", "18 Sept 2026, 1:36 AM" | SOS Inbox, Declined queue | Manager 103:151, 119:289: "9:14 AM", "Yesterday, 2:15 PM", "2 days ago" | **No** | **Fixed** `18e6dfa` |
| "1h 8m ago" | SOS Inbox | Manager 103:151 says "1 hr 8 min ago"; Auditor 34:121 says "4h 10m ago" | The Figma files disagree | Deliberate keep: one app-wide format (Auditor style) |
| Case Oversight statuses "Complete", "Auditor Review" | Case Oversight | Manager 86:198 says "Completed", "Under Review" | No, by design | Deliberate keep: RT-02 says Devs must use its wording |
| "Mock:" prefix on seeded AI narratives and "Other" decline text | Manager review / SOS | Task 96 honesty rule | — | Deliberate keep; removed once real data flows |

## 4. Needs UX/BA sign-off

| # | Copy | Where | Question | Owner |
|---|---|---|---|---|
| 1 | "This case has been reviewed and closed. No further action is required from you." (`CLOSED_NO_REASSIGNMENT`) | Public status after a Manager closes a declined case | Approved in the Normal User handoff (Round 8) but **not in RT-01**. Add it as a third public outcome. | Jana |
| 2 | "Manager Review" | Manager staff lists | RT-02 has no internal state for a declined or SOS case awaiting a Manager; the build derives the label from `manager_flag`. Add a state, or confirm the flag approach. | Jana (with Aiden) |
| 3 | "(AR-WB-11)" in the effective-score note; "(AR-WB-12)" in the submission cooldown notice; "(AR-AI-04)" in the timeline note; "(AR-AS-04)" in the queue footer | AI summary, confirmation, timeline, queue | Requirement IDs are visible to Auditors. AR-WB-11, AR-AI-04 and AR-AS-04 come straight from Figma; AR-WB-12 was added in the build. Keep IDs in staff UI, or strip them all? | Aleeya |
| 4a | "You used SOS during a review. This cooldown is a built-in protection, not a penalty." / "You've had sustained exposure to moderate-severity content. This cooldown is a built-in protection, not a penalty." | Cooldown page (SOS and S2 triggers) | Figma 31:99 only covers the high-severity intro. | Aleeya |
| 4b | "This isn't something you need to trigger — this cooldown includes a mandatory check-in that your manager or support initiates." | Cooldown page | Figma words it for S4 only ("an S4 cooldown includes…"); the build uses it for S4 and SOS. | Aleeya |
| 4c | "Tell your manager more (optional)" | Decline modal, "Other" free text | AR-DF-03 requires the field; no Figma label. | Aleeya |
| 4d | "Asked to talk to you (about case …) — reach out when you can." | Manager Auditor Detail, check-in row | No Figma source (86:94 shows a routine check-in line only). | Aleeya |
| 4e | "Break requested. Your manager will confirm it with you." / "Your manager has been asked to reach out to you." | Wellbeing check-in confirmations | No Figma source. | Aleeya |
| 4f | "No SOS alerts have been raised." · "No cases match your search." · "No declined cases are waiting for a decision." · "No completed cases in the last 24 hours." · "No check-ins raised today." | Manager empty states | No Figma empty-state frames. | Aleeya |
| 4g | "Nothing from this case is shown until you choose to proceed." | Behind the content-warning gate (Auditor and Manager) | No Figma source; added so the page behind the gate isn't blank. | Aleeya |
| 4h | "AI analysis for this case failed during your review." · Manager "Raised by": "Auditor SOS" / "AI failure mid-review" | SOS confirmation when AR-AI-11 pauses the case; SOS Alert Detail | Added 18 Sep 2026. Figma has no AR-AI-11 frame (the 25:212 annotation reuses 31:257 SOS), so the Auditor and the Manager are told why the case paused. | Aleeya |
| 5 | "I understand my video and any details I provide will be used only to review this report, in line with the privacy notice." | Upload → **Paste a link** | Figma 72:28 also says "my video" for a link. Proposed: "I understand the linked content and any details I provide will be used only to review this report, in line with the privacy notice." | Aleeya |
| 6 | "You'll see a plain-language result here — for example, whether the content was actioned — without any internal review details." | Status page outcome preview (Figma 7:16) | RT-01's scope note says public wording must not imply content was "otherwise actioned". Proposed: "You'll see a plain-language result here — whether a policy violation was found — without any internal review details." | Aleeya / Jana |
| 7 | "RCS — Staff" eyebrow | Shared staff login | The Auditor and Manager Figma files say "RCS — Auditor" / "RCS — Manager"; the build has one login for both roles. | Aleeya |
| 8 | "Enter your staff ID and password" / "Staff ID" | Staff login | Auditor 8:2 says staff ID, but Auditor 36:129 says "work email" / "Email". The backend contract uses staff ID. Align the Figma frames. | Aleeya / Aiden |
| 9 | "Updates enabled — you'll get a message when your case status changes." (mock) vs "Email and SMS updates aren't available yet." (api mode) | Case ID confirmation | The api mode is honest that the feature isn't built; confirm both wordings. | Aleeya |

## 5. Summary

- **Controlled values:** 10 groups checked, all match, all locked by test.
- **Screen copy:** 3 mismatches found and fixed: the AI-failure footnote, the saved-limit message and the Manager time formats.
- **Deliberate keeps:** 5, each with its reason.
- **Needs sign-off:** 9 items (18 strings, including 4h added with AR-AI-11 on 18 Sep 2026). These are also listed as owned open items in the [Task 54 handoff](sprint2-build-scope-handoff.md).
