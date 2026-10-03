# Sprint 2 UAT Checklist

**Current status: Week 2 revision — real AI pipeline.** Items 4 and 8 have
been updated to reflect the live watsonx.ai pipeline that replaced the mock
in Week 2. Sprint 3 features (decline/reassign, exposure/cooldown, SOS,
Manager oversight) are now implemented and added as new items below.

This checklist should be run to completion against the live deployment as
the final end-to-end UAT before Sprint 3 playback.

## Deployment URLs

| Service | URL |
|---|---|
| Frontend | https://rcs-frontend.2emp87e5l3yh.ca-tor.codeengine.appdomain.cloud |
| Backend API | https://rcs-backend.2emp87e5l3yh.ca-tor.codeengine.appdomain.cloud |
| Backend Docs | https://rcs-backend.2emp87e5l3yh.ca-tor.codeengine.appdomain.cloud/docs |

## Demo Seed Accounts

To reset demo data: `POST /api/admin/reseed` from the backend `/docs` page.

| Account | Password | Role | Notes |
|---|---|---|---|
| auditor-01 | test123 | Auditor | 45 min exposure, 3 active cases (S1, S2, S3) |
| auditor-02 | test123 | Auditor | 30 min exposure, 1 active case (S4 SOS demo) |
| auditor-03 | test123 | Auditor | 110 min exposure — APPROACHING limit |
| auditor-04 | test123 | Auditor | 120 min exposure — AT_LIMIT, excluded from assignment |
| manager-01 | test123 | Manager | Manager dashboard |

## Core pipeline (all stages)

| # | Stage | Check | Pass/Fail |
|---|---|---|---|
| 1 | Upload | A real video file (MP4/MOV/WEBM/AVI) submitted via the public form returns a visible Case ID | Pass |
| 2 | Case ID retention | The Case ID survives a page refresh (local storage) and has a working Copy button | Pass |
| 3 | Assignment | Submitting a case automatically assigns it to an eligible Auditor with no manual step | Pass |
| 4 | Real AI result | After upload the case moves from AI_PROCESSING → READY_FOR_REVIEW with no manual trigger; the Auditor's case-detail screen shows a real severity tier, narrative summary, incident timeline, and flagged entities from watsonx.ai | Pass |
| 5 | Auditor review | A logged-in Auditor sees only their own assigned cases; a severity override without a comment is rejected, one with a comment is accepted | Pass |
| 6 | Complete | Selecting a final outcome transitions the case to Complete with no further manual step | Pass |
| 7 | Status lookup | The public status page shows only Received / Being Reviewed / Complete (never internal state names) and shows the final outcome once Complete | Pass |

## Exposure, cooldown, and SOS (Sprint 3)

| # | Stage | Check | Pass/Fail |
|---|---|---|---|
| 8 | Exposure tracking | Submitting an exposure sample updates the Auditor's exposure_minutes in the DB | Pass |
| 9 | Cooldown trigger (SOS) | Triggering SOS sets cooldown_ends_at and cooldown_trigger='SOS' in DB; Auditor sees cooldown screen | Pass |
| 10 | Wellbeing check-in | Auditor can request wellbeing support (talk to manager / take a break) without a 500 error, with or without an active case | Pass |
| 11 | Manager follow-up | Manager can mark a cooldown check-in done; cooldown_check_in_done flips to 1 in DB | Pass |

## Manager oversight (Sprint 3)

| # | Stage | Check | Pass/Fail |
|---|---|---|---|
| 12 | Manager dashboard | Manager dashboard loads live auditor list and pending declined case count without errors | Pass |
| 13 | Case review | Manager can open a declined case and see AI analysis, auditor assessment, and decline reason | Pass |
| 14 | Decline → reassign | Manager can reassign a declined case to a different auditor; case status returns to READY_FOR_REVIEW | Pass |
| 15 | Decline → close | Manager can close a declined case; case transitions to COMPLETE | Pass |

## Video playback

| # | Stage | Check | Pass/Fail |
|---|---|---|---|
| 16 | Immediate playback | Video begins playing in the Auditor case-detail screen as soon as the page loads, without waiting for a full download | Pass (brief buffering observed; streams without full download) |

## Explicitly out of scope for this checklist

- Blur/grayscale/mute controls
- Ground-truth/validation view (Manager)
- Watson STT transcript display in frontend
- Code Engine production deployment
