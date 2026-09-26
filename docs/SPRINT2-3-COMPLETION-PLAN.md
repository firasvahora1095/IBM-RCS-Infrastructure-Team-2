# Sprint 2 + 3 Completion Plan — Status Update
**Last updated:** 2026-09-26

Legend: ✅ Done · ⚠️ Partial · ❌ Not done · ➡️ Deferred

## Summary

| Area | Status |
|---|---|
| Case upload → AI analysis → Auditor review → Complete | ✅ Working locally + deployed on Code Engine |
| Exposure tracking (active + replay seconds) | ✅ Done — DB column fixed to float, update query fixed, bar rounds to nearest minute |
| Auditor decline → Manager declined queue → Reassign / Close | ✅ Done |
| SOS → DB cooldown → 30-min timer → Manager follow-up → clear | ✅ Done — acknowledge now persisted to DB |
| Wellbeing check-in (Talk to manager / Request break) | ✅ Done |
| Manager dashboard, SOS inbox, case oversight | ✅ Done — real DB data, not mock |
| Video streaming from COS (proxy blob + Range requests) | ✅ Working (206 Partial Content; slow without HMAC) |
| Weighted Orchestrate assignment | ✅ Done |
| flagged_entities returned from manager case review API | ✅ Fixed — was returning hardcoded [], now returns case.flagged_entities |
| flagged_entities aggregated from watsonx per-frame output | ✅ Done — AI pipeline stores entities in DB, API now returns them |
| Narrative summary quality (watsonx reasoning used) | ✅ Done — _build_narrative_summary() reads per-frame reasoning from watsonx |
| Transcript / audio intensity panel | ✅ Done — AiEvidencePanels.tsx built and wired |
| Watson Speech-to-Text integration | ✅ Done — speech_to_text.py integrated in analysis pipeline |
| Real ground-truth validation results | ❌ Mock only |
| Code Engine deployment | ✅ Done — backend + frontend live (Docker Hub → IBM Code Engine ca-tor) |
| Email notification on SOS | ❌ Not done |
| Session timeout / login lockout | ⚠️ Login lockout implemented (rate_limit.py, 429 handled in frontend) — session timeout not done |
| S3/S4 automatic cooldown at case resolution | ✅ Done — S3/S4 cooldown triggered at case resolution (main.py:584) |
| Watsonx Governance logging | ⚠️ governance.py implemented — not verified on deployed environment |

---

## What's Left Before Monday Demo (Priority Order)

1. ~~**Code Engine deploy**~~ ✅ Done — backend + frontend live
2. ~~**STT integration**~~ ✅ Done
3. ~~**S3/S4 cooldown at resolution**~~ ✅ Done
4. **Real validation results** — ground-truth comparison must run on deployed pipeline
5. **E2E UAT on deployed URL** — environment is up, full flow UAT still needed

### Deliberately deferred (not blocking demo)
- Email notification on SOS
- Session timeout / login lockout
- Exceptional Manager raw-content access (MR-CR-08)
- Decline free-text field for OTHER reason (AR-DF-03)
- Role-play usability testing

---

## Day 1 (Friday) — Finish Sprint 2 End-to-End

### Aiden — Expose real AI analysis output via API
✅ process_case_analysis() pipeline exists and produces severity score, incident timeline, narrative summary
✅ Results stored to DB and returned via GET /api/auditor/cases/{id}
⚠️ No dedicated GET /cases/{id}/analysis endpoint — results are embedded in the case detail response instead
✅ Narrative summary uses per-frame reasoning field from watsonx — _build_narrative_summary() deduplicates and concatenates frame reasoning strings
✅ GET /api/manager/cases/{id}/review now returns real flagged_entities from DB (was hardcoded [])
✅ flagged_entities stored in DB by AI pipeline and now returned correctly from API

### Firas — AI Analysis Summary screen + override/outcome/Complete
✅ AI Analysis Summary screen built and wired to real case detail API
✅ Auditor can override severity score with a comment
✅ Outcome selector and Complete submission working
✅ Case reaches COMPLETE status end-to-end
✅ Incident timeline label overlap fixed (greedy row assignment + offset for same-timestamp markers)
✅ Incident timeline tick lines removed; all events shown as colored dot + short pin stem
✅ Flagged entity pills: single timestamp shown when start == end

### Firas — Decline Reason Modal
✅ Decline endpoint exists (POST /api/auditor/cases/{id}/decline)
✅ Four decline reasons accepted: CONTENT_MORE_SEVERE, NEAR_EXPOSURE_LIMIT, PERSONAL_TRIGGER, OTHER
➡️ Optional free-text field on OTHER reason (AR-DF-03) — deliberately deferred

### Jana — Exposure tracking API
✅ Exposure recorded per-auditor in DB (exposure_minutes on auditors table — fixed from integer to float)
✅ Both {active_seconds, replay_seconds} and legacy {seconds} accepted
✅ Exposure data returned in wellbeing API response
✅ Exposure bar updates automatically after each flush (no page refresh needed)
✅ Exposure bar displays rounded minutes
✅ Video onEnded stops exposure counter

### Jana — Login lockout threshold / AR-WB-12 review-block window
✅ Login lockout implemented — rate_limit.py tracks failed attempts, 429 returned after threshold; frontend handles lockout state
❌ Session timeout not implemented

### Hyuna — SOS event logging API
✅ SOS trigger logs to audit_logs with SOS_TRIGGERED action
✅ SOS event creates a manager-visible alert (GET /api/manager/sos-alerts)
✅ Acknowledge now persisted to DB (AuditLog.after_value)
✅ SOS list reads acknowledged status from DB and returns ACKNOWLEDGED / UNACKNOWLEDGED
❌ Email notification to manager on SOS — not implemented

### Hyuna — E2E test of Sprint 2 flow
✅ Tested locally: upload → AI analysis → case detail → override → outcome → Complete
⚠️ Deployed environment up — full E2E UAT on live URL still in progress

---

## Day 2 (Saturday) — Wellbeing Layer + Manager APIs

### Aiden — watsonx Orchestrate weighted assignment
✅ Weighted assignment formula implemented (Score = 0.6×exposure_ratio + 0.4×case_ratio)
✅ Lowest score wins; ties broken by least-recently-assigned
✅ Wired through POST /api/internal/assignments/select-auditor for Orchestrate to call
⚠️ Auditors in cooldown not explicitly excluded from the eligibility pool

### Aiden — Declined-case routing + reassignment endpoint
✅ Declined cases appear in GET /api/manager/declined-cases
✅ Declined cases hidden from auditor's own case list (NULL-safe filter)
✅ Manager can reassign via POST /api/manager/cases/{id}/reassign
✅ Manager can close without reassignment via POST /api/manager/cases/{id}/close
✅ Reassignment candidates exclude the declining auditor

### Aiden — Role-based access hardening
✅ Auditor token cannot call Manager endpoints (403)
✅ Manager token cannot call Auditor case endpoints (403)
✅ Login lockout after N failed attempts — rate_limit.py, 429 response
❌ Session timeout not implemented

### Firas — Oversight Dashboard
✅ GET /api/manager/auditors returns per-auditor exposure/cooldown state
✅ Manager dashboard page built and wired — real DB data
✅ Three-state exposure indicator (UNDER / APPROACHING / AT_LIMIT)

### Firas — SOS Inbox + Alert Detail + Acknowledge
✅ GET /api/manager/sos-alerts lists unresolved SOS events
✅ GET /api/manager/sos-alerts/{id} returns alert detail
✅ POST /api/manager/sos-alerts/{id}/acknowledge marks acknowledged and persists to DB
✅ POST /api/manager/sos-alerts/{id}/follow-up resolves and sets cooldown_check_in_done=1

### Firas — Reassignment Queue
✅ Declined queue page built
✅ Reassignment context (candidates list) via GET /api/manager/cases/{id}/reassignment
✅ Reassign action wired end-to-end
✅ Manager case review returns real flagged_entities (was hardcoded [])

### Firas — Transcript/audio-intensity + entities panels
✅ Built and wired — AiEvidencePanels.tsx handles transcript, audio intensity, and entities from real STT + AI pipeline

### Jana — Cooldown logic
✅ Cooldown durations stored in DB (cooldown_ends_at, cooldown_trigger, cooldown_check_in_done)
✅ SOS triggers 30-minute cooldown with requires_check_in=True
✅ Wellbeing API returns real cooldown from DB — CooldownPage timer works
✅ Manager follow-up clears the check-in requirement
✅ S3/S4 cooldown triggered automatically at case resolution (main.py:584)

### Hyuna — Wire SOS alerts into Manager notification path
✅ SOS events create audit log entries visible in manager SOS inbox
❌ Email delivery to manager not implemented or tested

### Hyuna — Verify watsonx.governance logging
⚠️ governance.py implemented — not yet verified on deployed environment

### Firas / Hyuna — Deploy to Code Engine
✅ Backend deployed: https://rcs-backend.2emp87e5l3yh.ca-tor.codeengine.appdomain.cloud
✅ Frontend deployed: https://rcs-frontend.2emp87e5l3yh.ca-tor.codeengine.appdomain.cloud
✅ PostgreSQL bundled inside backend container (demo mode, resets on redeploy)
✅ COS video storage wired — videos uploaded to IBM COS bucket
✅ WatsonX AI analysis running (WATSONX_VISION_MODEL_ID configured in secrets)
✅ Demo seed accounts: auditor-01~03 / demo-pass-01~03, manager-01 / demo-mgr-01

---

## Day 3 (Sunday) — STT, Validation, UAT, Final Deploy

### Aiden — Watson Speech-to-Text integration
✅ Done — speech_to_text.py integrated; transcribe(), parse_transcript_lines(), extract_audio_intensity() wired into analysis_service.py

### Aiden — Ground-truth comparison results API
❌ GET /api/manager/validation exists but returns placeholder/mock data only

### Jana — Run ground-truth validation comparison
❌ Not done

### Jana — Wellbeing rationale document
❌ Not done

### Jana — Final traceability check (AR-* / MR-* IDs)
❌ Not done

### Firas — Swap transcript/entities from mock to real STT
✅ Done — AuditorCaseDetailPage passes caseDetail.transcript and audio_intensity from real API

### Firas — Build Validation View (mock → real)
✅ ManagerValidationPage built — wired to /api/manager/validation, shows illustrative banner when is_placeholder=True
⚠️ Backend still returns hardcoded placeholder data (is_placeholder: True) — real ground-truth pipeline not run

### Firas — Fix bugs from UAT + final redeploy
❌ UAT not done yet; redeploy pending

### Hyuna — Full E2E UAT (deployed environment)
⚠️ Environment live — video upload → case created → auditor assigned confirmed working; AI analysis result on deployed URL still verifying

### Hyuna — Demo script + rehearsal
❌ Not done

### Aleeya — Accessibility pass
❌ Not tracked here

### Aleeya — Style Validation View
❌ Not done
