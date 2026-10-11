# Cross-Test: watsonx Orchestrate Integration

**Date:** 2026-10-11  
**Branch tested:** `feature/watsonx-orchestrate-integration` (rebased onto `test`)  
**Deployment:** IBM Code Engine — `rcs-backend-test`  

---

## What Was Tested

End-to-end case assignment via watsonx Orchestrate Native Runs API in a live Code Engine deployment.

- `ORCHESTRATE_MODE=remote` set in Code Engine environment
- New case submitted via frontend → backend calls Orchestrate → auditor assigned

---

## Flow Verified

1. **IAM token fetch** — `POST https://iam.cloud.ibm.com/identity/token` → 200 OK
2. **Run submitted** — `POST /v1/orchestrate/runs` with `agent_id` + user message → 200 OK, returns `run_id` + `thread_id`
3. **Async polling** — `GET /v1/orchestrate/runs/{run_id}` → status: `running` → `completed`
4. **Message fetch** — `GET /v1/orchestrate/threads/{thread_id}/messages` → 200 OK
5. **Assignment extracted** — last assistant message parsed for `auditor-XX` pattern
6. **Case assigned** — `[ASSIGN] case_id=UCCY4FO7LPHBVZ5L assigned_to=auditor-02`

---

## Code Engine Log Evidence

```
INFO:httpx:HTTP Request: POST https://iam.cloud.ibm.com/identity/token "HTTP/1.1 200 OK"
INFO:httpx:HTTP Request: POST https://api.ca-tor.watson-orchestrate.cloud.ibm.com/instances/30d04976-81b3-428f-b021-ac99604b0b13/v1/orchestrate/runs "HTTP/1.1 200 OK"
INFO:ibm_rcs.api:GET /api/internal/auditors/available -> 200
INFO:httpx:HTTP Request: GET https://api.ca-tor.watson-orchestrate.cloud.ibm.com/instances/30d04976-81b3-428f-b021-ac99604b0b13/v1/orchestrate/runs/281d837f-89d3-4db5-b8af-108efe7338a6 "HTTP/1.1 200 OK"
INFO:httpx:HTTP Request: GET https://api.ca-tor.watson-orchestrate.cloud.ibm.com/instances/30d04976-81b3-428f-b021-ac99604b0b13/v1/orchestrate/threads/3339de5f-e7ed-42fb-bd05-3546dd4324ed/messages "HTTP/1.1 200 OK"
[ASSIGN] case_id=UCCY4FO7LPHBVZ5L assigned_to=auditor-02
INFO:ibm_rcs.api:case UCCY4FO7LPHBVZ5L assigned to auditor-02
INFO:ibm_rcs.api:POST /api/reports -> 201
```

---

## Agent Details

- **Agent:** RCS Case Assignment Agent
- **Tool called by agent:** `Get Available Auditors` (calls `GET /api/internal/auditors/available` on the deployed backend)

---

## Auditor State at Test Time (seed_demo.py defaults)

| Auditor    | Exposure (min) | Active Cases | Eligible |
|------------|----------------|--------------|----------|
| auditor-01 | 45             | 2            | Yes      |
| auditor-02 | 30             | 1            | Yes ✓    |
| auditor-03 | 110            | 1            | Yes (approaching limit) |
| auditor-04 | 120            | 0            | No (AT_LIMIT) |

Orchestrate selected **auditor-02** (lowest exposure score among eligible auditors).

---

## Implementation Reference

- [`backend/app/orchestrate.py`](../../backend/app/orchestrate.py) — `RemoteWatsonxOrchestrator.assign_case()`
- [`docs/ORCHESTRATE-BASICS.md`](../ORCHESTRATE-BASICS.md) — full integration guide
