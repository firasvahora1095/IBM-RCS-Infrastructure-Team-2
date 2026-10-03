# Final UAT & Requirements Regression — Evidence

**Run on:** 30 September 2026
**Deployment:** `https://rcs-frontend.2emp87e5l3yh.ca-tor.codeengine.appdomain.cloud`
**Task:** [TEST] Support final UAT & requirements regression

---

## Part 1 — Full E2E UAT

All 16 items in [`docs/SPRINT2-UAT-CHECKLIST.md`](../SPRINT2-UAT-CHECKLIST.md) passed against the live Code Engine deployment.

See [`docs/evidence/final-outcome-status-transition-results.md`](final-outcome-status-transition-results.md) for detailed API evidence on the core pipeline (upload → AI processing → assignment → override → Complete → public status).

---

## Part 2 — Requirements regression: new this week

The following items were added or changed this sprint week. Each is checked against existing requirements to confirm no regression.

### GitHub Actions auto-deploy (`deploy.yml`)

- Triggers on push to `main`, builds Docker images, redeploys to Code Engine automatically
- No functional requirements affected — infrastructure change only
- Existing AR-* requirements unaffected ✓

### Dockerfile: POSTGRES_PASSWORD via ARG

- Password no longer hardcoded in image layer — injected at build time via GitHub Secret
- No functional requirements affected ✓

### `seed_demo.py` rewrite

- Corrected `NO_VIOLATION` → `NO_VIOLATION_FOUND` (was causing seed failure)
- Added correct `transcript`, `audio_intensity`, `incident_timeline` structure
- Demo accounts and case flows unchanged — all existing UAT scenarios still covered ✓

### `paths-ignore` in deploy.yml

- `docs/**` and `**.md` changes no longer trigger CI/CD pipeline
- Prevents unnecessary redeploys on documentation-only commits ✓

---

## Summary

| Area | Result |
|---|---|
| Full E2E UAT (16 items) | All Pass |
| New infra changes regress existing requirements | No regression found |
| Demo seed correctness | Fixed and verified |
| Security: credentials in Docker image | Resolved via ARG |