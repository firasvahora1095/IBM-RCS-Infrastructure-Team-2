# Sprint 2 UAT Checklist

**Current status: Week 1 draft.** The checks below are written against the
mocked-AI flow, since that's all that exists this week.

This same file is meant to be revised, not replaced, as the sprint goes on:
once the mocked AI step is replaced with the real watsonx.ai pipeline in
Week 2, item 4 below should be updated to describe real output instead of a
mock value. In Week 3, this checklist should be run to completion against
the live deployment as the final end-to-end UAT before playback.

No Sprint 3 features (blur/grayscale/mute, decline flow, exposure/cooldown,
SOS, ground-truth validation, live Manager oversight) are in scope for this
checklist.

| # | Stage | Check | Pass/Fail |
|---|---|---|---|
| 1 | Upload | A real video file (MP4/MOV/WEBM/AVI) submitted via the public form returns a visible Case ID | |
| 2 | Case ID retention | The Case ID survives a page refresh (local storage) and has a working Copy button | |
| 3 | Assignment | Submitting a case automatically assigns it to an eligible Auditor with no manual step | |
| 4 | Mock AI result | The assigned case shows a severity tier, narrative summary, and incident timeline on the Auditor's case-detail screen | |
| 5 | Auditor review | A logged-in Auditor sees only their own assigned cases, and a severity override without a comment is rejected while one with a comment is accepted | |
| 6 | Complete | Selecting a final outcome transitions the case to Complete with no further manual step | |
| 7 | Status lookup | The public status page shows only Received / Being Reviewed / Complete (never internal state names) and shows the final outcome once Complete | |
| 8 | Manager scaffold | The Manager dashboard renders without errors and reads clearly as a placeholder, not live data | |

## Explicitly out of scope for this checklist

- Blur/grayscale/mute controls
- Content-warning/decline flow
- Exposure-time tracking, cooldowns, SOS
- Ground-truth/validation view (Manager)
- Live Manager dashboard functionality (scaffold only this sprint)
