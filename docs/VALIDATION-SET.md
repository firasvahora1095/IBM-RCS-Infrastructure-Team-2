# AI Validation Set — Ground Truth Record

## Overview

Ten video clips were manually reviewed by the RCS Infrastructure team to establish a ground truth dataset for measuring AI severity classification accuracy.

Each clip was independently assessed against the CVI severity scale and assigned a ground truth tier. The same clips were processed through the Watson AI pipeline to obtain AI-predicted tiers. Results are recorded below.

**Full review notes:** https://docs.google.com/document/d/1yrYN4nwsAKqFvZ0jNdvzGshjKN4Z99_c147rHCETZtE/edit?tab=t.0

---

## Severity Scale Reference

| Tier | CVI Score | Description |
|------|-----------|-------------|
| S1 | 0–39 | No / minor violation — routine interaction, no policy concern |
| S2 | 40–64 | Minor / moderate force — proportionate but requires documentation |
| S3 | 65–84 | Significant force — clear physical violence, possible injury |
| S4 | 85–100 | Severe force — weapon use, serious injury, immediate review required |

> `weapon_use` tag automatically elevates score to minimum 65 (S3).

---

## Validation Results

| # | Ground Truth | AI Result | Match |
|---|-------------|-----------|-------|
| VAL-01 | S4 | S4 | ✅ |
| VAL-02 | S1 | S1 | ✅ |
| VAL-03 | S1 | S1 | ✅ |
| VAL-04 | S1 | S1 | ✅ |
| VAL-05 | S3 | S3 | ✅ |
| VAL-06 | S3 | S3 | ✅ |
| VAL-07 | S4 | S4 | ✅ |
| VAL-08 | S1 | S1 | ✅ |
| VAL-09 | S1 | S2 | ❌ AI over-predicted |
| VAL-10 | S1 | S3 | ❌ AI over-predicted |

**Match rate: 8 / 10 = 80%**

---

## Notes

- VAL-09 and VAL-10 were misclassified by the AI as higher severity than the human ground truth. Both involved contextual cues (crowd movement, posture) that the frame-level analysis interpreted as threat indicators without sustained evidence.
- Validation set is seeded into the demo database via `backend/scripts/seed_demo.py` and surfaced in the Manager Validation & Audit page under "AI vs Ground Truth".
- As requested by the client, the team manually reviewed approximately 10 clips of around 10 minutes each, independently assessed each clip against the severity scale, and compared results against the AI pipeline output. A production deployment would require a significantly larger labelled corpus to produce statistically meaningful accuracy metrics.
