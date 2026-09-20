# Sprint 2 Week 1 Backend API

This is the minimum T21 API for the mocked end-to-end flow. A valid upload
creates a `SUBMITTED` case, asks the configured watsonx Orchestrate adapter to
select an Auditor, stores that Auditor on the case, and records a
`CASE_ASSIGNED` audit event. `ASSIGNED` is not a case status.

The status intentionally remains `SUBMITTED` after assignment. Triggering the
AI pipeline and moving the case to `AI_PROCESSING` is the next task; assignment
is isolated in `app/case_workflow.py` so that follow-up can be connected at one
explicit boundary.

## Assumptions and decisions

- Staff accounts are provisioned in the `auditors` table; there is no public
  registration endpoint.
- Staff credentials are sent in a JSON body, never in a query string.
- Opaque sessions are stored in-process for eight hours. A shared persistent
  session store and formal timeout policy are deployment follow-ups.
- Basic upload integrity means extension plus container header/truncation
  checks before durable storage. Malware scanning is outside Sprint 2 MVP.
- Local file storage is the Week 1 default. Set `VIDEO_STORAGE_BACKEND=cos`
  after the existing IBM COS environment variables are configured.
- Uploads currently pass through the API before storage. Direct signed COS
  uploads are a planned storage-adapter change and are not part of this task.
- `ORCHESTRATE_MODE=mock` is an explicit local-development stand-in. It runs
  the same weighted selector that the protected Orchestrate tool endpoint
  exposes. `ORCHESTRATE_MODE=remote` sends the new case ID to the configured
  workflow URL and requires a JSON response containing `auditor_id`.
- Sprint 2 assignment uses the approved 0.6 exposure / 0.4 active-case formula,
  with exposure pinned to zero until Sprint 3 tracking exists. Equal scores are
  broken by the oldest `CASE_ASSIGNED` event.
- The temporary mock-AI route requires `X-Internal-API-Key`; it is not a public
  test backdoor.
- Invalid public lookup attempts are tracked in-process by client IP: five in
  ten minutes causes a fifteen-minute lockout. A shared store is required when
  the API is scaled beyond one instance.
- The application logger and Uvicorn access logger redact case-ID path
  segments. Do not add request-body logging containing case IDs.

## Endpoints

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/reports` | Public | Validate/store `video` multipart upload and create case |
| `POST` | `/api/internal/assignments/select-auditor` | Internal key | Weighted selection tool called by Orchestrate |
| `POST` | `/api/staff/login` | Public | JSON `{staff_id, password}` → role-scoped bearer session |
| `POST` | `/api/staff/logout` | Bearer | Invalidate the current session |
| `GET` | `/api/status/{case_id}` | Public | Public-safe status/outcome lookup |
| `GET` | `/api/auditor/cases` | Auditor bearer | List only the Auditor's assigned cases |
| `GET` | `/api/auditor/cases/{case_id}` | Auditor bearer | Retrieve an owned case and mock/real AI output |
| `POST` | `/api/internal/cases/{case_id}/mock-ai-result` | Internal key | Insert temporary Week 1 AI output |
| `POST` | `/api/auditor/cases/{case_id}/resolve` | Auditor bearer | Submit JSON outcome/override and complete a standard case |
| `GET` | `/api/manager/dashboard` | Manager bearer | Retained Sprint 2 empty manager scaffold |

The frontend draft currently sends login and resolution values in query
strings. Before integrating `feature/frontend`, update its `httpClient.ts` to
send these JSON bodies instead:

```json
{"staff_id": "auditor-1", "password": "..."}
```

```json
{
  "final_outcome": "POLICY_VIOLATION_FOUND",
  "auditor_severity_score": 80,
  "auditor_comment": "Required when the score changes"
}
```

Provision a local staff account from `backend/` (the password is prompted and
is never passed on the command line):

```bash
python -m scripts.CREATE_STAFF auditor-1 auditor
```

Run the isolated API checks from `backend/`:

```bash
python -m unittest discover -s tests -v
```

## Orchestrate integration contract

For local development, leave `ORCHESTRATE_MODE=mock`. No Auditor action or
manual database assignment is needed.

For the deployed workflow, set `ORCHESTRATE_MODE=remote` and configure
`WATSONX_ORCHESTRATE_URL`. The API sends:

```json
{"case_id": "ABC123..."}
```

The workflow calls `POST /api/internal/assignments/select-auditor` with the
internal API key, uses the returned `auditor_id`, and returns:

```json
{"auditor_id": "auditor-1"}
```

Case creation validates that the returned ID is a real Auditor account before
it commits the assignment.
