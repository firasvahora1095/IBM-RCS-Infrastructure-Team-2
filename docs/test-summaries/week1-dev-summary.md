# Sprint 2 Week 1 — Dev Work Summary (Aiden T20-T23 + Firas T14-T19)

Personal experiment session: built and deployed the full Week 1 mocked-AI vertical
slice solo, to prove the flow end-to-end before the real team split does it
properly (with independent cross-testing, per the team's Definition of Done).

---

## 1. Files created/changed and what each does

### Backend (`backend/app/`)

| File | Purpose |
|---|---|
| `db.py` | SQLAlchemy engine + session factory. Reads `DATABASE_URL` from `.env`. `get_db()` is the FastAPI dependency every endpoint uses to get/release a DB session. |
| `models.py` | SQLAlchemy ORM models (`Auditor`, `Case`, `FrameAnalysis`, `AuditLog`) — Python classes mapped to the tables in `db_schema.sql`. |
| `cases.py` | `generate_case_id()` — non-sequential/non-guessable ID (UR-ID-08). `get_public_status()` — maps internal states (`SUBMITTED`, `AI_PROCESSING`, ...) to the public labels Received/Being Reviewed/Complete (UR-ST-02). |
| `auth.py` | bcrypt password hashing + a simple in-memory session-token store (Week 1 placeholder — no real JWT infra yet, flagged in code). |
| `uploads.py` | `validate_video()` — checks file extension against MP4/MOV/WEBM/AVI and checks the file's actual header bytes match the claimed format (UR-VU-05/06/08). |
| `assignment.py` | `calculate_score()` implements the exact AR-AS-02 formula. `select_auditor()` picks the lowest-score auditor, tie-broken by round-robin (oldest `last_assigned_at` first). |
| `rate_limit.py` | In-memory tracker: 5 invalid case-ID lookups in 10 minutes → 15-minute lockout (UR-ST-07). |
| `main.py` | All FastAPI routes. Extended heavily today — see section 3. |

### Backend (`backend/scripts/`)

| File | Purpose |
|---|---|
| `DB_TEST.py` | Connects to Postgres and confirms all 4 tables exist. |
| `ASSIGNMENT_TEST.py` | Pure unit tests for the weighted-assignment formula and round-robin tie-break (no DB/server needed). |


### Backend (schema/infra)

| File | Purpose |
|---|---|
| `schemas/db_schema.sql` | The DB schema (see section 2 for why it's shaped this way). |
| `schemas/seed_test_data.sql` | Test-only: seeds one auditor (`auditor-1` / `testpassword123`) so a fresh deploy has a working login. |
| `Dockerfile` | Original backend-only image. Fixed today: added `setuptools<81` (newer setuptools dropped `pkg_resources`, which `ibm-cloud-sdk-core`'s old `setup.py` still needs) and `--no-access-log` (UR-NFR-05 — stops uvicorn's own access log from printing raw case IDs). |
| `Dockerfile.testcombined` | **Test-only**: Postgres + FastAPI in one container via `supervisord`, so both start under one image. Built specifically to get around Code Engine's Knative-based networking not supporting raw TCP (see section 4). |
| `supervisord.conf` | Runs `postgres` and `uvicorn` as two supervised processes in the combined image; `uvicorn` auto-restarts until Postgres is ready. |

### Frontend (`frontend/`, all new)

| File | Purpose |
|---|---|
| `src/App.jsx` | React Router setup — the 5 required routes (`/`, `/status`, `/staff/login`, `/auditor`, `/manager`). |
| `src/pages/UploadPage.jsx` | Public upload form, case ID display/copy, localStorage retention (UR-ID-04/06/07). |
| `src/pages/StatusPage.jsx` | Public case-ID lookup, generic "not found" message (UR-ST-08). |
| `src/pages/StaffLoginPage.jsx` | Staff login, stores session token, role-based redirect. |
| `src/pages/AuditorPage.jsx` | Assigned-case queue, case detail, resolve form (override + comment + outcome). Logout clears the token. |
| `src/pages/ManagerPage.jsx` | Scaffold only, explicitly labelled placeholder (per Sprint 2 scope). |
| `src/lib/api.js` | All `fetch()` calls to the backend, reading the backend URL from `VITE_API_BASE_URL`. |
| `Dockerfile` / `nginx.conf` | Builds the static site and serves it via nginx on port 8080 for Code Engine. |

---

## 2. Why the DB schema is shaped the way it is

Decisions made on top of those two sources:

- **`frame_analyses` is a separate table from `cases`.** The frame schema is per-frame (one row per analysed frame), but `cases` needs one severity value per case. Section 2 of the severity-scale doc ("worst-tier-wins") is exactly "pick the single worst frame's severity as the case's severity" — that only makes sense if frames are stored separately from the case-level rollup.
- **`auditors.last_assigned_at`** was added — not in the original table description — because the AR-AS-02 round-robin tie-break ("the Auditor who hasn't received a new case in the longest time") needs a timestamp to compare.
- **`auditors.active_case_count` / `exposure_minutes`** were added for the same reason: the weighted formula needs live counters to compute against, even though exposure is pinned to 0 in Sprint 2.
- **Field names were cross-checked against `frame-analysis.schema.json`** so `frame_analyses` matches Aiden's already-agreed contract exactly (`watson_severity_score`, `effective_severity_score`, `severity_tier`, `reasoning`, `entities`, `model_id`, `model_version`, `prompt_version`, `decision_timestamp`), rather than inventing new field names for the same concepts.

---

## 3. How this satisfies the Week 1 AC

| Task | AC | Status |
|---|---|---|
| T20 (Aiden) | 3 tables exist, backend can read/write, non-guessable case IDs | ✅ |
| T21 (Aiden) | Upload w/ format+integrity check, login, assigned-only case access, status lookup w/ rate-limit+generic error, case-ID redaction, mock AI insert, resolve→Complete | ✅ all sub-items built and curl/browser-tested |
| T22 (Aiden) | Case creation automatically triggers real weighted assignment + status→AI Processing, no manual step | ✅ (`assign_case_to_auditor` runs inside `create_report`) |
| T14 (Firas) | 5 routes reachable via `npm run dev` | ✅ |
| T15 (Firas) | Real upload → visible case ID, copy button, survives refresh, retain-ID messaging | ✅ |
| T16 (Firas) | Login redirects by role; logout blocks back-button access | ✅ |
| T17 (Firas) | Weighted-assignment endpoint returns correct auditor for given case counts, ties broken round-robin, **and Orchestrate's selection step actually calls it end-to-end** | ✅ — confirmed live via Orchestrate Preview returning `{"auditor_id":"auditor-1"}` |
| T18 (Firas) | Auditor queue/detail shows severity/summary/timeline, confirm/override+outcome submits without error | ✅ (built against the real API, not mock JSON) |
| T19 / T23 (cross-test) | Independent verification by someone other than the builder | ⚠️ **not met** — this was a solo session, so per the team's own Definition of Done this still needs Firas/Aiden to actually check each other's real pieces |

**Governance (Sprint 2 Week 2, T44)** and **frontend/backend production deployment (Week 3, T60)** were explicitly out of scope for Week 1 — today's cloud deployment was a disposable test environment, not the real Week 3 deploy.

---

## 4. How the (test) deployment was actually done

### The problem: Code Engine can't serve Postgres

Code Engine "Applications" are built on Knative and only understand HTTP traffic on
the declared port. Deploying Postgres as its own Code Engine app resulted in
`server closed the connection unexpectedly` — the platform's proxy layer doesn't
pass through the raw Postgres wire protocol, even with the readiness probe
correctly set to `tcp` and `min-scale=1` (both were already correct; this wasn't a
probe/config mistake).

### The workaround: one container, not two

`Dockerfile.testcombined` runs **both Postgres and FastAPI inside the same
container**, supervised by `supervisord`. FastAPI talks to Postgres over
`localhost:5432` — a connection that never leaves the container, so Code Engine's
HTTP-only proxy never sees it. Only port 8080 (FastAPI) is exposed externally,
which Code Engine handles fine.

**This does not solve data persistence** — the container's filesystem (including
Postgres's data) is wiped on redeploy or scale-to-zero. Fine for a disposable
connectivity test; **not a substitute for a real Week 3 answer** (VSI or a
properly persistent volume is still needed then).

### Deployment steps actually run

1. `docker build --platform linux/amd64` — had to force this explicitly; a plain
   `docker build` on this Apple Silicon Mac produces an ARM64 image, which Code
   Engine (linux/amd64) rejected with `no match for platform in manifest`.
2. Pushed to Docker Hub (`hyunabae/rcs-combined-test`) — IBM Container Registry
   was blocked by the account's pre-existing image storage quota (same issue
   already logged from Sprint 1's Docker Hub decision).
3. Created a Code Engine registry secret (`dockerhub-secret`) so Code Engine could
   pull from a private Docker Hub repo.
4. `ibmcloud ce app create` with the image, port 8080, and the app's environment
   variables (watsonx/COS credentials — DB credentials are baked into the image
   for this combined build).
5. Hit a stale-digest bug: `ibmcloud ce app update --image ...:latest` pinned to
   an old digest because Docker Hub hadn't finished propagating the new push yet.
   Fix was simply re-running `app update` once the push had fully landed.
6. Frontend was built as a separate Code Engine app: `npm run build` → static
   files served via nginx on port 8080, with `VITE_API_BASE_URL` baked in at
   build time via `--build-arg`.
7. Backend's CORS (`allow_origins`) had to explicitly list the deployed frontend's
   Code Engine URL, or the browser blocked every request.
8. For the Orchestrate connection, FastAPI's auto-generated `/openapi.json` was
   used directly as the tool-import source — but it initially had no `servers`
   field (Orchestrate requires exactly one) and the `select-auditor` endpoint's
   response schema was empty (`schema: {}`) because the route had no
   `response_model`, so Orchestrate's tool-output picker had nothing to offer.
   Fixed by adding a Pydantic `SelectedAuditorResponse` model to that route and
   manually injecting a `servers` entry into the downloaded spec before
   re-importing it.

### End result (confirmed live)

- Backend: `https://rcs-combined-test.2e76lsq2uda9.ca-tor.codeengine.appdomain.cloud`
- Frontend: `https://rcs-frontend-test.2e76lsq2uda9.ca-tor.codeengine.appdomain.cloud`
- Orchestrate workflow calling the live `/api/assignment/select-auditor` tool and
  returning a real auditor ID from the deployed database.

---

## 5. What's still open (not done today)

- **Cross-testing** (T19/T23) — needs Firas and Aiden to actually check each
  other's pieces per the team's Definition of Done.
- **CI/CD (GitHub Actions)** — discussed but deferred. Needed so deployment isn't
  tied to any one person's personal Docker Hub account.
