# Mandatory Features QA Verification — With Screenshot Evidence

## Purpose

Verify the mandatory/core RCS requirements against the deployed live build, record implementation evidence, and log any gaps between the approved requirements baseline and the current application.

> **Evidence note:** The screenshots below are the live-build screenshots captured during QA. They are stored in the accompanying `evidence/` folder.

## Reporter / Public User Flow — PASS

### Public status tracking

The public status page correctly showed a completed case and final outcome without exposing internal Auditor/AI details.

![Reporter final status](evidence/01_reporter_final_status.png)

### Case ID generation

The Reporter confirmation screen displayed the generated Case ID, a copy action, a warning to retain the ID, browser-device storage, and optional email/phone updates.

![Case ID confirmation](evidence/02_case_id_confirmation.png)

### Invalid lookup handling

A fake Case ID produced a generic not-found response.

![Invalid Case ID](evidence/22_invalid_case_id_generic_error.png)

Repeated invalid lookups then triggered temporary blocking.

![Case lookup rate limit](evidence/23_case_lookup_rate_limit.png)

**Result: PASS**

---

## Auditor Protected Review — PASS

The raw-content screen provided blur, grayscale and independent audio controls.

![Protected video controls](evidence/03_auditor_protected_video_controls.png)

Before raw content was revealed, the Auditor received a warning gate with Proceed/Decline and a required acknowledgement.

![Content warning](evidence/04_content_warning_proceed_decline.png)

**Result: PASS**

---

## Decline and Reassignment Workflow — PASS

The Auditor decline flow provided structured reasons and clearly explained that the case would go to the Manager rather than be automatically reassigned.

![Decline reason modal](evidence/05_decline_reason_modal.png)

The decline was confirmed without further harmful-content exposure.

![Decline confirmation](evidence/06_decline_confirmation.png)

The Manager queue then showed the case in Manager Review with a Declined flag.

![Manager declined-case queue](evidence/07_manager_declined_case_queue.png)

The Manager could review AI/context without being forced to view raw footage.

![Manager declined-case detail](evidence/08_manager_declined_case_detail.png)

The reassignment screen showed candidate Auditors and their exposure headroom.

![Reassignment decision](evidence/09_reassignment_decision.png)

The Manager's reassignment was recorded successfully.

![Reassignment confirmed](evidence/10_reassignment_confirmed.png)

The reassigned case then appeared in the new Auditor's queue.

![Reassigned case in Auditor queue](evidence/11_reassigned_case_in_auditor_queue.png)

**Result: PASS**

---

## SOS / Unexpected Exposure Flow — PASS, WITH EMAIL NOT DIRECTLY EVIDENCED

When SOS was triggered, the case was immediately paused and content was hidden.

![SOS pauses and hides content](evidence/12_sos_content_paused_hidden.png)

The Auditor entered an approximately 30-minute cooldown with a mandatory Manager/support check-in.

![SOS cooldown](evidence/13_sos_cooldown_top.png)

Support and stop-shift options were available while return to queue was blocked.

![SOS cooldown actions](evidence/14_sos_cooldown_actions.png)

The Manager received an urgent SOS alert.

![Manager SOS banner](evidence/15_manager_sos_alert_banner.png)

The alert appeared in the SOS Inbox.

![Manager SOS inbox](evidence/16_manager_sos_inbox.png)

The Manager could inspect Auditor/case context without raw footage by default.

![Manager SOS detail](evidence/17_manager_sos_detail.png)

The Manager could record follow-up notes and choose an outcome.

![Manager SOS follow-up form](evidence/18_manager_sos_followup_form.png)

The follow-up outcome was recorded.

![Manager SOS outcome logged](evidence/19_manager_sos_outcome_logged.png)

The SOS Inbox then showed the event as resolved.

![Manager SOS resolved](evidence/20_manager_sos_resolved.png)

**Result: PASS for in-app SOS workflow.**

**Not directly evidenced:** actual delivery of the separate Manager email notification.

---

## Exposure Tracking — PASS

Before raw playback, the Auditor exposure counter showed no accumulated exposure.

![Exposure before playback](evidence/24_exposure_before_playback.png)

After approximately one minute of active raw-video playback, the counter increased by one minute.

![Exposure after playback](evidence/25_exposure_after_playback.png)

After the video was paused, the exposure total remained unchanged.

![Paused video does not add exposure](evidence/26_exposure_paused_no_increase.png)

**Result: PASS**

---

## Severity-Based Cooldowns

### S3 — PASS

A normal S3 completion triggered the expected approximately 15-minute cooldown and paused new harmful-content assignment.

![S3 cooldown](evidence/27_s3_cooldown.png)

**Result: PASS**

### S4 — PASS on Auditor side / Manager check-in GAP

A standard S4 case completed normally.

![S4 case completion](evidence/28_s4_case_completion.png)

The S4 completion triggered an approximately 30-minute cooldown.

![S4 cooldown dashboard](evidence/29_s4_cooldown_dashboard.png)

The cooldown page stated that a mandatory Manager/support check-in would occur.

![S4 cooldown detail](evidence/30_s4_cooldown_detail_top.png)

The Auditor could request support, take a break or stop their shift.

![S4 cooldown actions](evidence/31_s4_cooldown_detail_actions.png)

The Manager dashboard correctly showed the Auditor as in cooldown.

![Manager Auditor availability](evidence/32_manager_auditor_availability.png)

However, the Manager's Auditor detail page did **not** show a pending mandatory S4 check-in action.

![S4 Manager check-in gap](evidence/33_manager_s4_checkin_gap.png)

**Result: IMPLEMENTATION GAP — the Auditor is told a Manager/support check-in is mandatory, but the Manager UI does not surface a pending S4 check-in workflow.**

---

## Manager Exposure Oversight — PASS

The Manager could adjust an individual Auditor's exposure limit.

![Manager sets exposure limit](evidence/34_manager_limit_updated_100.png)

The new limit propagated to the Auditor-facing dashboard.

![Auditor sees updated limit](evidence/35_auditor_limit_reflected_100.png)

The test value was restored to 120 minutes after verification.

**Result: PASS**

---

## Authentication and Role-Based Access — PASS

After sign-out, the application returned to Staff login, and protected Manager routes redirected back to login.

![Staff login after sign-out](evidence/21_staff_login_after_signout.png)

Additional live checks confirmed:

- an Auditor attempting to open a Manager-only page was redirected to the Auditor dashboard;
- a logged-out user attempting to open a Manager page was redirected to Staff login.

**Result: PASS**

---

## Automatic Assignment and AI Processing — PASS

The Manager dashboard showed two Auditors in cooldown and two available Auditors with different active-case counts.

![Manager assignment state](evidence/36_manager_assignment_state.png)

The supporting evidence view confirmed the dashboard uses live exposure, exposure-limit, cooldown and assigned-case source fields.

![Manager evidence sources](evidence/37_manager_evidence_sources.png)

A newly submitted Reporter case was then observed to assign automatically to the eligible Auditor with the lower active workload, and AI processing started automatically without manual triggering.

**Result: PASS**

> The final assignment event was observed live; no separate assignment-result screenshot was retained.

---

## Validation / Audit Data — PASS

Three previously completed live cases were checked against the combined Validation/Audit screen:

| Case ID | AI Result | Auditor Result | Comparison |
|---|---|---|---|
| `C4T1B43BK072LJ4Z` | S1 / 20 | S1 / 10 | AI Override |
| `DQAN8Z6TM3GIP97F` | S3 / 75 | S3 / 75 | AI Match |
| `X235T7ZUJZXKG71M` | S1 / 20 | S1 / 20 | AI Match |

The live governance fields were confirmed as:

- Prompt Leakage — `NOT_DETECTED`
- Source Attribution — stored evidence reference available
- Accumulated Score — recorded and displayed

**Result: PASS**

---

## AI vs Ground Truth Validation — GAP

The AI-vs-Ground-Truth view remains placeholder/demo data and does not yet use a real manually labelled validation dataset.

The implemented **AI vs Auditor** comparison is useful operationally but is not controlled ground-truth validation.

**Result: IMPLEMENTATION GAP**

---

## Additional Issues Logged

### Declined-case wording

The Manager declined-case detail displayed `Auditor assessment — Unknown` while also displaying an `Auditor-adjusted CVI` value. For a decline before assessment, this wording can imply that a human-adjusted assessment exists when it does not.

**Status: UI/DATA-LABELLING ISSUE**

### Policy violation criteria

The controlled final outcomes are:

- No Violation Found
- Policy Violation Found

However, a complete moderation-policy decision guide defining exactly what qualifies as a policy violation was not found in the current requirements baseline.

**Status: REQUIREMENTS CLARIFICATION GAP**

### AI/STT failure fallback

A real AI/STT processing failure was not deliberately induced during this QA session.

**Status: NOT DIRECTLY TESTED**

### Non-guessable Case ID generation

Case IDs appeared random and the live application enforced generic errors and rate limiting, but the underlying entropy/non-guessability mechanism was not independently verified.

**Status: NOT DIRECTLY EVIDENCED**

---

## Overall QA Conclusion

The deployed build successfully passed the main Reporter, Auditor and Manager workflows tested in the live environment.

Two material implementation gaps were identified:

1. **S4 Manager/support check-in workflow** — the Auditor is told a mandatory check-in is required, but the Manager side does not surface a pending S4 check-in action.
2. **AI vs Ground Truth validation** — the client-confirmed manually labelled validation requirement remains placeholder/demo rather than real validation data.

The unexpected-exposure email notification, AI/STT failure fallback, and underlying Case ID entropy were not directly evidenced during this QA session.

---

## Master Document Update

### Mandatory Features QA — Live Build Verification

A live QA verification was completed against the deployed RCS build using real Reporter, Auditor and Manager workflows.

Successfully verified areas included Reporter submission and tracking, Case ID handling and rate limiting, Auditor protected viewing, AI review/override, standard completion, decline/reassignment, SOS, exposure tracking, S3/S4 cooldowns, Manager exposure oversight, custom Auditor exposure limits, authenticated role-based access, automatic assignment/AI processing, and live Validation/Audit governance data.

Two implementation gaps were identified:

1. The S4 cooldown tells the Auditor that a mandatory Manager/support check-in is required, but the Manager UI does not currently surface a pending S4 check-in action.
2. AI-vs-Ground-Truth validation still uses placeholder/demo data and does not yet satisfy the client-confirmed requirement for manually labelled validation statistics and graphical comparison.

Additional mandatory items not directly evidenced during live QA were the unexpected-exposure email notification, AI/STT failure fallback behaviour, and the underlying non-guessable Case ID generation mechanism.

All identified gaps and non-evidenced items should remain explicitly documented rather than being treated as passed.
