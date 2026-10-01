# Final Outcome & Status Transition — UAT Evidence

**Run on:** 30 September 2026
**Deployment:** `https://rcs-backend.2emp87e5l3yh.ca-tor.codeengine.appdomain.cloud`
**Task:** [TEST] Verify final-outcome behaviour & status transitions

---

## Test case

- **Case ID:** `D2KLVNNRIWTV6WO5`
- **Source:** Real video uploaded via public form to COS
- **Assigned auditor:** `auditor-02`
- **Watson severity score:** 75 (S3)
- **Auditor action:** Severity override with comment, final outcome selected

---

## Step 1 — Upload & assignment

```
GET /api/status/D2KLVNNRIWTV6WO5
→ { "status": "Being Reviewed", "submitted_at": "2026-09-30T11:21:11.201976+00:00" }
```

Case uploaded, AI processed, automatically assigned to `auditor-02`. ✓

---

## Step 2 — Auditor review with severity override

Auditor (`auditor-02`) opened the case, reviewed AI output (watson score 75, S3), overrode severity with comment:

> "Officer response appeared proportionate; AI severity appears overstated."

Final outcome selected: `NO_VIOLATION_FOUND`

---

## Step 3 — Case transitions to Complete

```
GET /api/status/D2KLVNNRIWTV6WO5
→ {
    "case_id": "D2KLVNNRIWTV6WO5",
    "status": "Complete",
    "final_outcome": "NO_VIOLATION_FOUND",
    "submitted_at": "2026-09-30T11:21:11.201972+00:00"
  }
```

Case transitioned to `Complete` automatically after auditor submission. ✓

---

## Step 4 — Public status page reflects correct outcome

Public endpoint returns only `Complete` and `NO_VIOLATION_FOUND` — no internal state names, no auditor info exposed. ✓

---

## Summary

| Check | Result |
|---|---|
| Real video upload → Case ID generated | Pass |
| AI processing → automatic assignment to auditor | Pass |
| Severity override with comment accepted | Pass |
| Case transitions to Complete after submission | Pass |
| Public status shows Complete + correct outcome | Pass |
| No internal state names exposed on public endpoint | Pass |