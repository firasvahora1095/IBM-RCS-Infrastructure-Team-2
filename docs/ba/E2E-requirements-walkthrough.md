# T32 — E2E Requirements Walkthrough

 
**Task:** Walk upload → processing → Ready for Review against the requirements documents and log any mismatch early    
**Environment:** Localhost, API mode, local PostgreSQL database  
**Test case ID:** `2814SA0N025WOOPL`

## Objective

Validate the end-to-end Sprint 2 path from the **Normal User upload flow** through to the **Auditor Ready for Review state**:

**Upload video → Submit report → Case created / assigned → AI analysis in progress → Ready for review**

Each observed stage was checked against the requirements baseline and any mismatch was recorded.

---

## 1. User upload and submission

### What was tested

A video was selected and submitted through the public reporting interface.

Observed behaviour:

- the public user could select and upload a video;
- no user account was required;
- the report could be submitted anonymously;
- a consent/privacy acknowledgement was presented before submission;
- the submission entered the review workflow rather than presenting a content decision to the user.

### Requirements checked

- `UR-VU-01` — public user can upload and submit a video for safety review.
- `UR-VU-02` — report can be submitted without an account.
- `UR-VU-03` — successfully uploaded content enters the case review process without a content-based decision at submission.
- `UR-VU-04` — successful submission should produce confirmation, or an error if submission fails.
- `UR-VU-05` — Sprint 2 baseline formats include MP4, MOV, WEBM and AVI.

**Result:** PASS

---

## 2. Case creation and handoff into processing

After the user submission, the case entered the staff-side workflow and appeared in the Auditor dashboard.

Test case:

`2814SA0N025WOOPL`

Initial Auditor queue status:

**AI analysis in progress**

The processing row was disabled and could not yet be opened for normal review.

This matches the expected requirement behaviour that a case should enter processing before becoming available to the Auditor for review.

**Result:** PASS

---

## 3. Processing → Ready for Review

The same case ID, `2814SA0N025WOOPL`, was later observed in the Auditor dashboard with status:

**Ready for review**

This confirms the expected transition:

**AI analysis in progress → Ready for review**

The case was then selectable from the Auditor queue.

**Result:** PASS

---

## 4. Auditor review entry

After the case reached **Ready for review**, it could be opened from the Auditor dashboard.

The system displayed the review/content-warning gate before exposing the case content.

This confirms that the case successfully reached the Auditor review stage after processing.

**Result:** PASS

---

## Walkthrough summary

| Stage | Expected behaviour | Observed behaviour | Result |
|---|---|---|---|
| User upload | User can upload and submit video | Video selected and submitted | PASS |
| Submission | Report enters review flow without immediate content decision | Submission entered workflow | PASS |
| Case processing | Case enters processing after submission/assignment | `AI analysis in progress` shown in Auditor queue | PASS |
| Ready for Review | Case becomes available after processing | Same case changed to `Ready for review` | PASS |
| Auditor entry | Review-ready case can be opened | Case opened and content-warning gate displayed | PASS |
| AI output | Severity/timeline available after AI processing | AI analysis unavailable for this case | MISMATCH / FOLLOW-UP |

---

## Overall result

**PASS — E2E requirements walkthrough for Upload → Processing → Ready for Review**

Case `2814SA0N025WOOPL` was followed from the user submission flow into the Auditor queue, where it was first observed as **AI analysis in progress** and later as **Ready for review**.

The required workflow transition was confirmed. One mismatch was logged: AI severity/timeline output was unavailable when the case was opened.

