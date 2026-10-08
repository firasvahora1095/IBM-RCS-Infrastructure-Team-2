# watsonx Orchestrate Integration

## Overview

When a new case is submitted, the backend uses IBM watsonx Orchestrate to automatically assign the best available auditor. The Orchestrate agent evaluates current auditor workloads and exposure levels, then returns the selected auditor ID.

---

## How It Works

### Full Flow

```
B2B Portal → POST /api/reports
           → backend calls Orchestrate Native Runs API
           → Orchestrate agent calls GET /api/internal/auditors/available
           → LLM scores auditors and selects the best one
           → backend polls for result
           → case assigned to returned auditor_id
```

### Step-by-Step

1. **Case submitted** — B2B portal sends a video to `POST /api/reports`
2. **Run submitted** — backend sends `POST /v1/orchestrate/runs` with the agent ID and a user message containing the Case ID
3. **Orchestrate calls our API** — the agent calls `GET /api/internal/auditors/available` on our deployed backend to get eligible auditors with their scores
4. **LLM selects auditor** — the agent scores each auditor using the formula below and returns the best one
5. **Polling** — backend polls `GET /v1/orchestrate/runs/{run_id}` every 3 seconds until `status: "completed"` (typically takes ~10–30s)
6. **Result extracted** — backend reads the last assistant message from `GET /v1/orchestrate/threads/{thread_id}/messages` and extracts the `auditor_id`
7. **Case assigned** — DB updated with the selected auditor

### Scoring Formula

```
score = (0.6 × exposure_minutes / 120) + (0.4 × active_case_count / 10)
```

Lower score = better candidate. Tiebreakers:
1. Prefer auditors with no prior cases
2. Prefer auditor assigned least recently
3. Alphabetical by auditor_id

---

## Orchestrate Agent

| Field | Value |
|---|---|
| Name | RCS Case Assignment Agent |
| Agent ID | `f2e08661-775a-4f55-9611-c40a9426d702` |
| Region | Canada Toronto (`ca-tor`) |
| Environment | live (version 1) |
| LLM | `groq/openai/gpt-oss-120b` |

### Agent Instruction

```
You are a case assignment agent for RCS (Review Content System).

When asked to assign a case, follow these steps:
1. Call Get Available Auditors to get the list of eligible auditors.
2. Select the auditor with the lowest score. Score = (0.6 × exposure_minutes/120) + (0.4 × active_case_count/10).
3. If scores are tied, prefer auditors who have never been assigned a case. If still tied, prefer the auditor assigned least recently. If still tied, pick alphabetically by auditor_id.
4. Return ONLY the auditor_id string exactly as provided in the tool response (e.g. "auditor-02"). No explanation, no punctuation, no other text.

If no auditors are available, respond with exactly: "No eligible auditors available"
```

### Registered Tools

| Tool | Used? | Purpose |
|---|---|---|
| Get Available Auditors | ✅ Yes | Lists eligible auditors with scores — this is the only tool the agent needs |
| Get Auditor Exposure | ❌ Not used | Individual exposure lookup (redundant — already included in available list) |
| Get Auditor Active Cases | ❌ Not used | Individual case count lookup (redundant — already included in available list) |

---

## Backend Configuration

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ORCHESTRATE_MODE` | Yes | `remote` to use Orchestrate, `mock` to use local assignment logic |
| `WATSONX_ORCHESTRATE_URL` | Yes (remote) | Base instance URL (without agent path) |
| `WATSONX_ORCHESTRATE_AGENT_ID` | Yes (remote) | UUID of the deployed agent |
| `IBM_CLOUD_API_KEY` | Yes (remote) | Used to auto-fetch IAM bearer tokens |
| `WATSONX_ORCHESTRATE_TIMEOUT_SECONDS` | No | Default: 90s |

### Example `.env`

```
ORCHESTRATE_MODE=remote
WATSONX_ORCHESTRATE_URL=https://api.ca-tor.watson-orchestrate.cloud.ibm.com/instances/<tenant_id>
WATSONX_ORCHESTRATE_AGENT_ID=<agent_id>
```

### IAM Token Caching

The backend fetches an IBM IAM bearer token on first use and caches it for 55 minutes (IAM tokens expire after 1 hour). This avoids re-fetching on every case submission.

---

## Mock Mode

Set `ORCHESTRATE_MODE=mock` to skip the Orchestrate API call entirely. The backend runs the same scoring logic locally using `assignment.py`. Useful for local development without an internet connection or when Orchestrate is unavailable.

---

## Observability

### Backend logs (look for these lines)

```
INFO:httpx: POST .../v1/orchestrate/runs "HTTP/1.1 200 OK"
INFO:     GET /api/internal/auditors/available → 200        ← Orchestrate calling our API
INFO:httpx: GET .../v1/orchestrate/runs/{run_id} "HTTP/1.1 200 OK"   ← polling
[ASSIGN] case_id=XXXXXXXX assigned_to=auditor-02
```

### Orchestrate UI

Go to the agent → **Conversations** tab to see each run's full reasoning steps, including which tool was called and what data it returned.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| No eligible auditors | `NoEligibleAuditorError` → 409 response |
| Orchestrate run fails/cancelled | `AssignmentOrchestrationError` → 503 response |
| Polling timeout (20 attempts × 3s = 60s) | `AssignmentOrchestrationError` → 503 response |
| LLM returns extra text around auditor_id | Regex `auditor-\w+` extracts the ID automatically |
| LLM returns wrong case | Falls back to error if no `auditor-` pattern found |
