## Week 1 E2E Acceptance Scenarios

**Owner:** Janataarah Begum

### 1. Upload Returns a Case ID
**Given** a public user selects a valid supported video, **when** they submit the report, **then** the upload should succeed and a unique Case ID should be generated and displayed.

**Pass:** The upload completes successfully and a Case ID is generated and shown.  
**Fail:** The upload fails, or no Case ID is generated/displayed.

### 2. Case Record Is Created
**Given** a successful submission has generated a Case ID, **when** the backend processes the submission, **then** exactly one case record should be created for that Case ID.

**Pass:** One case record exists and can be retrieved using the Case ID.  
**Fail:** The record is missing, duplicated, or cannot be retrieved.

### 3. Case Is Assigned to an Auditor
**Given** a valid case exists and eligible Auditors are available, **when** assignment runs, **then** the case should be assigned to exactly one eligible Auditor and proceed to AI processing.

**Pass:** Exactly one Auditor is assigned correctly and the workflow continues.  
**Fail:** The case remains unassigned, is assigned to multiple Auditors, or is assigned incorrectly.

### 4. Mock AI Result Appears
**Given** a case has been assigned to an Auditor, **when** the mock AI result is inserted and the Auditor opens the case, **then** the severity/CVI, narrative summary and incident timeline should be displayed.

**Pass:** All expected AI fields appear for the correct case.  
**Fail:** The result is missing, incomplete, or linked to the wrong case.

### 5. Auditor Can Confirm or Override
**Given** the Auditor is viewing the AI assessment, **when** they confirm or override the result, **then** confirmation should be accepted and an override should require a comment while preserving both the AI and Auditor values.

**Pass:** Confirm works, and override works only when the required comment is provided.  
**Fail:** Override is accepted without a comment, confirm/override fails, or the original AI value is lost.

### 6. Auditor Selects a Final Outcome
**Given** the Auditor has completed the assessment, **when** they select a final outcome, **then** exactly one approved `RT-01` outcome should be accepted: `NO_VIOLATION_FOUND` or `POLICY_VIOLATION_FOUND`.

**Pass:** Exactly one valid outcome is selected and submitted.  
**Fail:** No outcome is required, multiple outcomes are accepted, or an invalid outcome is accepted.

### 7. Case Progresses to Complete
**Given** a standard review has been completed with no SOS or Decline flag, **when** the Auditor submits the resolution, **then** the case should automatically transition to `COMPLETE` without active Manager approval.

**Pass:** The case reaches `COMPLETE` and retains the submitted final outcome.  
**Fail:** The case remains in an earlier state, requires unnecessary Manager approval, or loses the final outcome.

### 8. Public User Can Check Status
**Given** a completed case exists and the public user has the Case ID, **when** they use the public status lookup, **then** the correct case should display **Complete** and the approved public-facing outcome without exposing internal review information.

**Pass:** The correct public status and outcome are displayed.  
**Fail:** Lookup fails, the wrong case is returned, or internal workflow/Auditor information is exposed.