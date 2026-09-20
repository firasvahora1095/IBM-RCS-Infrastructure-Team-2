# Connecting the Real Backend to the Frontend

**For:** Firas (integration) and Aiden (DB / API / watsonx pipeline) · **Written:** 18 September 2026 · **Branch:** `feature/frontend`

The frontend is the full UI shell for all three personas. It runs on a **mock data source** by default. This guide explains how to swap in the real backend one operation at a time without touching any page.

## 1. How the data layer works

```
page / hook  ──calls──▶  src/services/index.ts  ──delegates to──▶  mock  (src/services/mock)
                          (one export per operation)                 api   (src/services/api)
```

- **Pages never call `fetch`.** They import operations from `src/services` (for example `getAuditorCases`).
- `VITE_DATA_SOURCE` chooses the implementation at start-up: `mock` (default) or `api`. `VITE_API_BASE_URL` is the backend's base URL in `api` mode. See `frontend/.env.example`.
- **The contract is `src/services/types.ts`.** The `DataService` interface lists every operation and every response shape. Both data sources implement it, so TypeScript flags any mismatch.
- **Errors:** every failure is thrown as `ApiError(message, status)`. The HTTP client reads FastAPI's `detail` field (a string, or a list of `{ msg }` validation errors). A 200 response with no JSON body becomes a 502 `ApiError` ("Check the API address"), because it almost always means `VITE_API_BASE_URL` is wrong.
- **Not connected yet:** an operation with no endpoint calls `notConnected("op")`, which rejects with `NotImplementedError` (status 501, "This feature isn't connected to the backend yet."). Screens show that message instead of crashing.
- **401 = session expired.** Staff screens reopen a sign-in dialog in place when any staff call returns 401 (Auditor Figma 36:235, Manager 1:1231). Return 401 for an unknown or expired token.

## 2. Connecting one operation

1. Add a function to `frontend/src/services/api/httpClient.ts` that calls the endpoint and returns `parseJsonOrThrow<T>(response)`.
2. In `frontend/src/services/api/index.ts`, replace `notConnected("op")` with that function.
3. Run with `VITE_DATA_SOURCE=api VITE_API_BASE_URL=http://127.0.0.1:8080 npm run dev` and walk the screen listed below.
4. If the real response shape differs from `types.ts`, change the backend or map the response in `httpClient.ts`. Don't change page code to match a one-off shape.

Staff calls send `Authorization: Bearer <token>`. Public calls (upload, status) send no auth, ever (UR-VU-02).

## 3. Operation list

"Wired" means `httpClient.ts` already calls a real endpoint. The paths were captured from the team's test harness (`spike/week1-fullstack-experiment`, Hyuna's personal harness, which is never merged). **Aiden's API may choose different paths**: if so, change `httpClient.ts`, not the pages.

### Normal User (public)

| Operation                                    | Status        | Endpoint (harness)                           | Used by                     | Figma           |
| -------------------------------------------- | ------------- | -------------------------------------------- | --------------------------- | --------------- |
| `createReport(videoFile)`                    | Wired         | `POST /api/reports`, multipart field `video` | Upload                      | NU 5:2          |
| `createLinkReport(url)`                      | Not connected | —                                            | Upload → Paste a link       | NU 72:28        |
| `createScreenshotReport(image)`              | Not connected | —                                            | Upload → Add a screenshot   | NU 72:58        |
| `getStatus(caseId)`                          | Wired         | `GET /api/status/{caseId}`                   | Status lookup               | NU 7:65, 145:75 |
| `addCaseInformation(caseId, details, file?)` | Not connected | —                                            | Add more information dialog | NU 80:31        |
| `requestStatusUpdates(caseId, contact)`      | Not connected | —                                            | Case ID confirmation        | NU 6:2          |

`getStatus` must only ever return the three public states (Received / Being Reviewed / Complete) and the RT-01 outcome value. It must never return internal state names (UR-ST-02, RT-02). After 5 invalid IDs it should return 429 (UR-ST-07); the page already handles that.

### Staff sign-in

| Operation                       | Status | Endpoint (harness)                              | Used by                 | Figma          |
| ------------------------------- | ------ | ----------------------------------------------- | ----------------------- | -------------- |
| `staffLogin(staffId, password)` | Wired  | `POST /api/staff/login?auditor_id=…&password=…` | Staff login (`useAuth`) | A 8:2, M 1:342 |

The harness takes query parameters, not a JSON body. A JSON body is better, and changing it is a one-line edit in `httpClient.ts`. The response must include `role` (`auditor` or `manager`). The route guard uses it.

### Auditor

| Operation                                               | Status        | Endpoint (harness)                                         | Used by                                         | Figma                        | Requirement    |
| ------------------------------------------------------- | ------------- | ---------------------------------------------------------- | ----------------------------------------------- | ---------------------------- | -------------- |
| `getAuditorCases(token)`                                | Wired         | `GET /api/auditor/cases`                                   | Queue                                           | A 10:6                       | AR-AS-01       |
| `getAuditorCaseDetail(caseId, token)`                   | Wired         | `GET /api/auditor/cases/{caseId}`                          | Case review (all steps)                         | A 16:19 → 25:280             | AR-AI-01–05    |
| `resolveCase(caseId, token, outcome, score?, comment?)` | Wired         | `POST /api/auditor/cases/{caseId}/resolve?final_outcome=…` | Severity & comment                              | A 25:53, 25:280              | AR-AI-06–09    |
| `getMyWellbeing(token)`                                 | Not connected | —                                                          | Header exposure bar, cooldown page              | A 34:121, 31:99              | AR-WB-01–04    |
| `acknowledgeContentWarning(caseId, token)`              | Not connected | —                                                          | Content warning → Proceed                       | A 16:19                      | AR-PV-01/08    |
| `declineCase(caseId, token, reason, other?)`            | Not connected | —                                                          | Decline dialog                                  | A 25:137                     | AR-DF-01–03    |
| `recordExposure(caseId, token, sample)`                 | Not connected | —                                                          | Review Workspace (sends measured playback time) | A 20:35                      | AR-WB-01       |
| `triggerSos(caseId, token)`                             | Not connected | —                                                          | SOS button                                      | A 31:257                     | AR-WB-05/06/09 |
| `reportUnexpectedExposure(caseId, token, reason)`       | Not connected | —                                                          | Case paused by an AI/STT failure mid-review     | A 25:212 annotation → 31:257 | AR-AI-11       |
| `requestWellbeingSupport(token, kind, caseId?)`         | Not connected | —                                                          | Wellbeing check-in, cooldown page               | A 31:188                     | AR-WB-16       |

Notes for the Auditor endpoints:

- **Override rule (AR-AI-07):** `auditor_severity_score` is only sent when the Auditor changed the AI's rating, or when the AI failed and there is no rating. The backend must reject a changed score with no comment (the harness returns 400). The UI blocks it first.
- **AI failure before review (AR-AI-10):** set `ai_failure` on the case detail (`"vision"` or `"speech_to_text"`) and leave the severity fields `null`. The UI then opens at maximum blur with no summary and asks for the Auditor's own rating.
- **AI failure after review has begun (AR-AI-11):** the UI is ready (`reportUnexpectedExposure`, reason `AI_FAILURE_MID_REVIEW`). The backend should treat it exactly like `triggerSos`: log the alert with its reason, route the case to the Manager and start the S4-equivalent cooldown (AR-WB-12). **Still open:** how the pipeline tells the open review page that processing failed. In mock mode the Demo scenarios menu fires the event. Aiden and Firas need to choose the real signal (for example a status field returned when the page polls the case).
- **Cooldowns (AR-WB-12):** the mock applies S2 5 min, S3 15 min, S4 30 min + check-in, SOS = S4 protocol, by the worse of the AI tier and the Auditor's rating. `resolveCase` returns `cooldown` when one starts, and the page sends the Auditor to `/auditor/cooldown`.

### Manager

| Operation                                        | Status                                                                                                                                                                                       | Used by                                     | Figma                   | Requirement  |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------- | ------------ |
| `getManagerDashboard()`                          | Wired (`GET /api/manager/dashboard`) — **no page uses it any more**. It fed the Sprint 2 scaffold, which the full Oversight Dashboard replaced. Kept so the harness endpoint stays callable. | —                                           | —                       | —            |
| `getAuditorOverview(token)`                      | Not connected                                                                                                                                                                                | Oversight Dashboard                         | M 78:69                 | MR-OV-01–05  |
| `getSosSummary(token)`                           | Not connected                                                                                                                                                                                | SOS banner + header badge (`useSosSummary`) | M 103:294               | MR-SOS-03    |
| `getAuditorDetail(auditorId, token)`             | Not connected                                                                                                                                                                                | Auditor Detail                              | M 86:94                 | MR-OV-04     |
| `setExposureLimit(auditorId, token, minutes)`    | Not connected                                                                                                                                                                                | Auditor Detail                              | M 356:364, 197:309      | MR-OV-04     |
| `approveBreakRequest(requestId, token)`          | Not connected                                                                                                                                                                                | Auditor Detail                              | M 357:314               | MR-SOS-07    |
| `getCaseOversight(token)`                        | Not connected                                                                                                                                                                                | Case Oversight                              | M 86:198                | MR-OV-06     |
| `listSosAlerts(token)`                           | Not connected                                                                                                                                                                                | SOS Inbox                                   | M 103:151               | MR-SOS-01    |
| `getSosAlert(alertId, token)`                    | Not connected                                                                                                                                                                                | SOS Alert Detail, Follow-up                 | M 103:197, 103:228      | MR-SOS-05    |
| `acknowledgeSosAlert(alertId, token)`            | Not connected                                                                                                                                                                                | SOS Alert Detail                            | M 103:197               | MR-SOS-04    |
| `logSosFollowUp(alertId, token, notes, outcome)` | Not connected                                                                                                                                                                                | Follow-up                                   | M 103:228               | MR-SOS-04/06 |
| `listDeclinedCases(token)`                       | Not connected                                                                                                                                                                                | Declined / Reassignment queue               | M 119:289               | MR-CR-02/04  |
| `getManagerCaseReview(caseId, token)`            | Not connected                                                                                                                                                                                | Case Review Detail                          | M 118:198               | MR-CR-01     |
| `getReassignmentContext(caseId, token)`          | Not connected                                                                                                                                                                                | Reassignment                                | M 119:405               | MR-CR-03     |
| `reassignCase(caseId, token, auditorId)`         | Not connected                                                                                                                                                                                | Reassignment                                | M 357:397, 197:321      | MR-CR-03     |
| `closeWithoutReassignment(caseId, token, note)`  | Not connected                                                                                                                                                                                | Reassignment → close                        | M 344:282               | MR-CR-04     |
| `getCaseForExceptionalAccess(caseId, token)`     | Not connected                                                                                                                                                                                | Raw-content access                          | M 1:454 / 1:512 / 1:612 | MR-CR-08     |
| `recordExceptionalAccess(caseId, token)`         | Not connected                                                                                                                                                                                | Raw-content access                          | M 1:512                 | MR-CR-08     |
| `getValidationSummary(token)`                    | Not connected                                                                                                                                                                                | Validation View                             | M 136:257               | MR-OV-08     |

Notes for the Manager endpoints:

- **SOS alerts carry `trigger`** (`AUDITOR_SOS` or `AI_FAILURE_MID_REVIEW`). SOS Alert Detail shows it as "Raised by".
- **SOS follow-up completes the check-in.** `logSosFollowUp` must also record the Manager check-in that the Auditor's SOS/S4 cooldown is waiting for. Otherwise the Auditor stays locked out.
- **`reassignCase` must re-check the target at confirm time.** If the target is now at their limit or cooling down, return an error. The page shows Figma 197:321 instead of reassigning silently.
- **Validation View** is always labelled as placeholder data until MR-OV-08's threshold is agreed (Sprint 3). Don't remove the banner when connecting it.
- **No per-Auditor decline counts** anywhere, by design (MR-CR-02).

## 4. Business rules already implemented in the mock

`frontend/src/services/mock/index.ts` implements the BA rules, so the backend can copy them and the UI behaves the same in both modes:

| Rule                                                                                                                                                          | Where in the mock                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| AR-AS-02 assignment: lowest `0.6 × exposure ratio + 0.4 × case ratio` wins, ties go to whoever waited longest, at-limit and cooling-down Auditors are skipped | `selectAuditor` (Firas can mirror this in `POST /api/assignment/select`, Tasks 61/84) |
| AR-WB-12 cooldowns by the worse of the AI tier and the Auditor rating, including the S2 sustained/repeated rule; SOS = S4 protocol                            | `cooldownForResolvedCase`, `startCooldown`, `raiseSos`                                |
| AR-WB-04: raw content cannot be opened during a cooldown (409)                                                                                                | `acknowledgeContentWarning`                                                           |
| UR-ST-07 status-lookup lockout after 5 invalid IDs                                                                                                            | `getStatus`                                                                           |
| RT-02 internal → public status mapping                                                                                                                        | `mapStatusToPublicLabel` in `design-tokens/statusLabels.ts`                           |
| AR-AI-11 unexpected exposure = SOS path                                                                                                                       | `raiseSos`                                                                            |
| MR-CR-03: the reassignment target is re-checked at confirm time (409)                                                                                         | `reassignCase`                                                                        |

`frontend/src/services/mock/mockDataService.test.ts` tests each of these rules. It is a ready-made list of cases for the backend's own tests.

## 5. Checking a connection

- `npx vitest run --maxWorkers=2` covers the UI against the mock. It does not need a backend.
- For `api` mode, start a second dev server so the mock one keeps running: `VITE_DATA_SOURCE=api VITE_API_BASE_URL=http://127.0.0.1:8080 npx vite --port 5174 --strictPort`.
- Every header shows a **Demo data** badge in mock mode only. If the badge shows while you think you're on `api`, the environment variable wasn't picked up. Restart the dev server.
