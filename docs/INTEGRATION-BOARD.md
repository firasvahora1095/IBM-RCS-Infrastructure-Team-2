# Integration Board — Sprint 2 & 3

**Last updated:** 2026-09-25

---

## Sprint 2 — Core Pipeline

| Component | Owner | Status | Notes |
|-----------|-------|--------|-------|
| Public upload form → Case ID returned | Firas | ✅ Done | Week 1 |
| Case record creation + auditor assignment | Firas | ✅ Done | Week 1 |
| Mock AI result injection (internal endpoint) | Hyuna | ✅ Done | Week 1 — `POST /api/internal/cases/{id}/mock-ai-result` |
| Auditor case queue + case detail (mock AI) | Hyuna | ✅ Done | Week 1 |
| Auditor confirm / override + final outcome | Hyuna | ✅ Done | Week 1 |
| Case → COMPLETE flow | Hyuna | ✅ Done | Week 1 |
| Public status lookup | Firas | ✅ Done | Week 1 |
| OpenCV frame extraction | Aiden | ✅ Done | Week 2 |
| watsonx.ai per-frame scoring | Aiden | ✅ Done | Week 2 — LLaMA 4 Maverick |
| `flagged_entities` aggregation | Aiden | ✅ Done | Week 2 — entity labels with time spans |
| Narrative summary (per-frame reasoning) | Aiden | ✅ Done | Week 2 |
| AI background pipeline trigger (no manual step) | Hyuna | ✅ Done | Week 2 — `BackgroundTasks` after upload |
| Auditor API — real AI fields in response | Hyuna | ✅ Done | Week 2 — severity, summary, entities, timeline |
| COS video proxy streaming | Hyuna | ✅ Done | Week 2 — no credential exposure |
| Video immediate playback (frontend) | Hyuna | ✅ Done | Week 2 — `?token=` query param, no blob wait |
| Watsonx Governance | — | ❌ Pending | Not yet implemented |

---

## Sprint 3 — Auditor Wellbeing + Manager Oversight

| Component | Owner | Status | Notes |
|-----------|-------|--------|-------|
| Exposure tracking | Hyuna | ✅ Done | Accepts `{active_seconds, replay_seconds}` or legacy `{seconds}` |
| SOS alert + cooldown persistence | Hyuna | ✅ Done | `cooldown_ends_at`, `cooldown_trigger` written to DB |
| Wellbeing check-in (talk to manager / take a break) | Hyuna | ✅ Done | Fixed NULL FK crash — works with or without active case |
| Manager follow-up (mark check-in done) | Hyuna | ✅ Done | `cooldown_check_in_done` flips in DB |
| Manager dashboard (live auditor list + declined count) | Hyuna | ✅ Done | |
| Manager case review (AI output + auditor assessment) | Hyuna | ✅ Done | Shows `EntityPills`, narrative summary, decline reason |
| Decline → reassign flow | Hyuna | ✅ Done | |
| Decline → close flow | Hyuna | ✅ Done | |
| Session timeout | Aiden/Hyuna | ✅ Done | `session_store` has `expires_at` — sessions expire automatically |
| Login lockout (N failed attempts) | — | ⚠️ Partial | `rate_limit.py` exists and works for status lookup; not yet wired into the login endpoint |
| Watson STT pipeline integration | — | ❌ Pending | `speech_to_text.py` works standalone; not wired into AI pipeline |
| Code Engine redeployment (Week 2 build) | — | ❌ Pending | Dockerfile exists; prod still runs Week 1 build |

---

## Integration Flow (as-built)

```
Public upload form
  └─► COS storage                         ✅
  └─► BackgroundTasks trigger             ✅
        └─► OpenCV frame extraction       ✅
        └─► watsonx.ai per-frame scoring  ✅
              └─► severity_tier           ✅
              └─► narrative_summary       ✅
              └─► flagged_entities        ✅
              └─► incident_timeline       ✅
        └─► Watson STT                    ❌ not wired
        └─► Case → READY_FOR_REVIEW       ✅
              └─► Auditor case detail     ✅
              └─► Manager case review     ✅
```

---

## Known Blockers

| Blocker | Impact |
|---------|--------|
| Watson STT not wired into pipeline | Audio transcript not stored or displayed |
| Code Engine not redeployed | Production still runs Week 1 build |
| No session timeout | Sessions valid indefinitely after login |

---


