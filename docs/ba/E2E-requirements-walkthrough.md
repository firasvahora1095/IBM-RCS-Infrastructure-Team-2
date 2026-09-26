# E2E Requirements Walkthrough

**Upload → Processing / Being Reviewed → Ready for Review / Auditor review stage**

and check the observed behaviour against the Sprint 2 requirements.

## Test setup

- Branch: `main`
- Frontend: local Vite application
- Backend: local FastAPI/Uvicorn application
- Database: local PostgreSQL setup
- Frontend mode observed during walkthrough: **Demo data**
- Test video format: MP4
- Test case ID: `RCS-62QD-FJET`

## Walkthrough evidence

### 1. Public upload

Observed:
- The public reporting page was accessible without login.
- A video could be selected and submitted.
- The interface showed accepted formats including MP4, MOV, WEBM and AVI.
- The report was submitted anonymously.
- A consent/privacy checkbox was shown before submission.

Result: **Pass**

Relevant requirements checked:
- `UR-VU-01` — public user can upload and submit a video.
- `UR-VU-02` — no account is required.
- `UR-VU-03` — the upload enters the review process without making a content decision at submission.
- `UR-VU-04` — successful submission produces confirmation.
- `UR-VU-05` — supported Sprint 2 formats are displayed.

### 2. Confirmation and Case ID

Observed:
- A **Report received** confirmation was displayed.
- A unique case ID was shown: `RCS-62QD-FJET`.
- A **Copy case ID** option was available.

Result: **Pass**

Relevant requirements checked:
- `UR-ID-01` — a unique case ID is generated for a successful submission.
- `UR-ID-02` — the case ID is displayed immediately after submission.
- `UR-ID-04` — the user can copy the case ID.

### 3. Case status lookup

Observed:
- The case ID could be entered on the case-status page.
- The case was successfully retrieved.
- The public-facing status showed:
  - `Received`
  - `Being Reviewed`
  - `Complete` as the next/final stage
- Internal workflow details were not exposed to the public user.
- Case details showed the case ID, submission time and uploaded video filename.

Result: **Pass**

Relevant requirement check:
- The Sprint 2 public status model uses simplified user-facing states rather than exposing internal workflow states.

### 4. Review-stage handoff

Observed:
- The current demo flow displayed the case as **Being Reviewed**.
- This represents the user-facing equivalent of the internal review stage.

Result: **Pass for the frontend/demo requirements walkthrough**

## Limitation

The local walkthrough was completed while the frontend displayed the **Demo data** badge.

Therefore, this walkthrough validates:
- the public upload experience;
- confirmation and case-ID behaviour;
- status lookup behaviour; and
- the user-facing progression into the review stage.

It does **not independently prove that real watsonx processing occurred during this local run**.

The real-AI pipeline should be evidenced separately using an integrated run where the frontend is connected to the live backend/AI path.

## Mismatch / observation log

No blocking mismatch was identified in the user-facing demo flow.

One limitation was recorded:

- The local frontend was operating in **Demo data** mode, so real AI execution could not be independently verified from this walkthrough.

## Overall result

**PASS — Demo-mode requirements walkthrough**

The observed local flow matched the intended Sprint 2 user-facing requirements from public upload through confirmation, case ID generation, status lookup and the Being Reviewed stage.

