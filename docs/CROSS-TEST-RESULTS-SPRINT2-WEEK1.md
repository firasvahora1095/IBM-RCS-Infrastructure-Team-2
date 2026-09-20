# Sprint 2 Week 1 — Cross-Test Results

**Date:** 2026-09-20
**Tester:** Hyuna and Firas
**Tasks covered:** T30 (Firas — integrate & cross-check with Aiden's APIs), T45 (Hyuna — cross-test Week 1 frontend/API contract with Firas)
**Method:** Manual — clicked through the live UI at http://localhost:5174 with the real backend at http://localhost:8081

---

## Environment Setup

| Component | URL | Branch |
|-----------|-----|--------|
| Backend | http://localhost:8081 | `feature/backend-api` |
| Frontend | http://localhost:5174 | `feature/frontend` |
| Database | `postgresql://postgres@localhost:5433/rcs_infra` | Docker `rcs-postgres` |

**Backend startup flags:** `ORCHESTRATE_MODE=mock`, `INTERNAL_API_KEY=dev-secret`, `CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174`

### Pre-test fixes required

| Fix | Detail |
|-----|--------|
| `VITE_DATA_SOURCE=api` added to `frontend/.env.local` | Frontend defaulted to mock mode — no real API calls were made until this was set |
| DB column renames | `cases.assigned_auditor` → `assigned_auditor_id`, `audit_logs.id` → `audit_log_id` (older schema out of sync with current `models.py`) |
| Auditor password reset | DB had bcrypt hash from older setup; updated to PBKDF2 via `app.auth.hash_password`. Password: `correct horse battery staple` (same as `tests/test_api.py`) |

---

## API Contract Mismatches Found and Fixed

### 1. `POST /api/staff/login` — wrong request shape

| | Before | After |
|--|--------|-------|
| Transport | Query string `?auditor_id=...&password=...` | JSON body `{"staff_id": "...", "password": "..."}` |
| Field name | `auditor_id` | `staff_id` |

**File fixed:** `frontend/src/services/api/httpClient.ts` — `staffLogin` function

### 2. `POST /api/auditor/cases/{id}/resolve` — wrong request shape

| | Before | After |
|--|--------|-------|
| Transport | Query string `?final_outcome=...` | JSON body `{"final_outcome": "..."}` |

**File fixed:** `frontend/src/services/api/httpClient.ts` — `resolveCase` function

### All other endpoints — verified OK

| Endpoint | Result |
|----------|--------|
| `POST /api/reports` | ✅ OK |
| `GET /api/status/{id}` | ✅ OK |
| `POST /api/staff/login` | ✅ Fixed |
| `GET /api/auditor/cases` | ✅ OK |
| `GET /api/auditor/cases/{id}` | ✅ OK |
| `POST /api/auditor/cases/{id}/resolve` | ✅ Fixed |
| `GET /api/manager/dashboard` | ✅ OK |
