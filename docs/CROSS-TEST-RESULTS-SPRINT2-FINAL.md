# Sprint 2 Week 1 — Cross-Test Results

**Date:** 2026-10-04
**Tester:** Aiden
**Tasks covered:** Cross-test Firas's deployed frontend flow & follow up on backend e2e bugs
**Method:** Manual — clicked through the local UI at http://localhost:5174 with the backend at http://localhost:8081. Clicked through the deployed UI at https://rcs-frontend.2emp87e5l3yh.ca-tor.codeengine.appdomain.cloud/

---

## Local Environment Setup

| Component | URL | Branch |
|-----------|-----|--------|
| Backend | http://localhost:8081 | `feature/backend-api` |
| Frontend | http://localhost:5174 | `feature/frontend` |
| Database | `postgresql://postgres@localhost:5433/rcs_infra` | Docker `rcs-postgres` |

**Backend startup flags:** `ORCHESTRATE_MODE=mock`, `INTERNAL_API_KEY=dev-secret`, `CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174`

### Discovered Issues

The frontend remains consistent locally and with deployment. However, further issues have been found with the site.

| Fix | Detail |
|-----|--------|
| Video Buffering | Increased streaming chunk size, corrected part video requests, and ensured connections close when playback requests are cancelled. Currently testing with deployment |
| Restart playback at the end | Clicking Play after the video finishes now resets playback to the beginning. |
| Synchronise the playback timer | Playback position follows the actual video. Buffering no longer advances the timeline or counts as viewing exposure as it did prior. |
| Group duplicate timestamps | Tags with identical start and end times share one timestamp label, while retaining every tag. Different time ranges remain separate. |

The fixes being tested are present on fix/narrative-framing-and-bugs.
In the event of a bad testing pull to main, please use git revert.

### Additional Issues
The `View Requirements*` and `Contact support*` links are still not implemented.
Additionally, there is examples of text in the UI that is likely leftover from a LLM. E.g. "Every "Processing" row is disabled — not just discouraged. A case only enters this queue if the Look-Ahead Assignment Check confirmed your remaining exposure budget covers its full video duration." 
OR
"Cases assigned to you, in the order the system assigned them. Thumbnails are suppressed — open a case to see its content-warning gate."
Should be cutdown or reworded to improve the user experience.

### All other endpoints — verified OK

| Endpoint | Result |
|----------|--------|
| `POST /api/reports` | ✅ OK |
| `GET /api/status/{id}` | ✅ OK |
| `POST /api/staff/login` | ✅ OK |
| `GET /api/auditor/cases` | ✅ OK |
| `GET /api/auditor/cases/{id}` | ✅ OK |
| `POST /api/auditor/cases/{id}/resolve` | ✅ OK |
| `GET /api/manager/dashboard` | ✅ OK |