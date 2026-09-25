# Mid-Sprint E2E Smoke Test — Sprint 2 Week 2 (Real AI Pipeline)

**Date:** 2026-09-25  
**Tester:** Hyuna Bae  
**Branch:** `feature/manager-api` (rebased onto main with watsonx-ai-integration)  
**Objective:** Upload a real video and confirm it reaches `READY_FOR_REVIEW` / `AUDITOR_REVIEW` with zero manual technical intervention, and that AI output (severity, narrative summary, flagged entities) is stored in DB and displayed in frontend.

---

## Test Case

| Field | Value |
|-------|-------|
| Case ID | `QKK9ZI58UEL6DF0V` |
| Final status | `AUDITOR_REVIEW` |
| Severity tier | S4 |
| Effective severity score | 85 / 100 |
| Manual intervention required | None |

---

## Pass / Fail

| # | Check | Result |
|---|-------|--------|
| 1 | Video uploaded via public form → Case ID returned | ✅ Pass |
| 2 | Case moved to `AI_PROCESSING` automatically after upload | ✅ Pass |
| 3 | AI pipeline ran in background (no manual trigger) | ✅ Pass |
| 4 | Case moved to `READY_FOR_REVIEW` / `AUDITOR_REVIEW` automatically | ✅ Pass |
| 5 | `severity_tier` and `effective_severity_score` written to DB | ✅ Pass — S4 / 85 |
| 6 | `narrative_summary` written to DB | ✅ Pass |
| 7 | `flagged_entities` written to DB | ✅ Pass — 37 entities |
| 8 | AI results visible in Auditor case-detail frontend | ✅ Pass |
| 9 | Video streams immediately in frontend (no full-download wait) | ✅ Pass |
| 10 | Manager case review shows `EntityPills` and narrative summary | ✅ Pass |

---

## AI Output

### Narrative Summary

> AI flagged an S4 visual indicator between 40.04s and 50.05s.
>
> **At 0s:** Three individuals in historical military uniforms are walking along a dirt path in a rural setting. Two of the individuals are carrying rifles over their shoulders, and one appears to be holding a horse's reins.
>
> **At 50.05s:** The image depicts multiple individuals in historical military attire engaged in a conflict. Smoke and debris are visible, suggesting active combat. Several individuals appear to be injured and lying on the ground. Others are actively using firearms.
>
> **At 135.135s:** Several individuals are riding on what appears to be large creatures, possibly elephants, in a misty environment. They are holding long objects that resemble weapons, such as spears or rifles. The scene suggests a group conflict or battle scenario.

### Flagged Entities (37 total)

| Label | Start (s) | End (s) |
|-------|-----------|---------|
| soldiers | 0.0 | 100.1 |
| rifles | 0.0 | 115.115 |
| horse | 0.0 | 0.0 |
| musket | 10.01 | 125.125 |
| military uniform | 10.01 | 125.125 |
| trees | 10.01 | 130.13 |
| grass | 10.01 | 10.01 |
| firearms | 15.015 | 100.1 |
| people | 15.015 | 135.135 |
| forest | 15.015 | 85.085 |
| horses | 20.02 | 120.12 |
| uniforms | 20.02 | 20.02 |
| wooded area | 20.02 | 20.02 |
| bayonets | 40.04 | 40.04 |
| military uniforms | 40.04 | 100.1 |
| man | 45.045 | 45.045 |
| firearm | 45.045 | 45.045 |
| group of people | 45.045 | 125.125 |
| smoke | 50.05 | 85.085 |
| injured individuals | 50.05 | 50.05 |
| historical military attire | 50.05 | 50.05 |
| riders | 55.055 | 120.12 |
| person | 75.075 | 110.11 |
| blood | 75.075 | 75.075 |
| bayoneted rifles | 80.08 | 80.08 |
| weapon | 85.085 | 85.085 |
| long object | 90.09 | 90.09 |
| animal1 | 95.095 | 95.095 |
| animal2 | 95.095 | 95.095 |
| rifle | 105.105 | 105.105 |
| sword | 105.105 | 105.105 |
| historical clothing | 105.105 | 105.105 |
| spear_or_stick | 110.11 | 110.11 |
| stone bridge | 115.115 | 115.115 |
| animals | 130.13 | 130.13 |
| water | 130.13 | 130.13 |
| elephants | 135.135 | 135.135 |
| weapons | 135.135 | 135.135 |
| mist | 135.135 | 135.135 |

### Incident Timeline (21 events)

| Start (s) | End (s) | Tag | Severity |
|-----------|---------|-----|----------|
| 0.0 | 0.0 | weapon_present | S1 |
| 10.01 | 15.015 | weapon_present | S1 |
| 15.015 | 20.02 | multi_person_conflict | S1 |
| 40.04 | 40.04 | multi_person_conflict | S1 |
| 40.04 | 50.05 | weapon_present | **S4** |
| 50.05 | 65.065 | multi_person_conflict | **S4** |
| 50.05 | 50.05 | physical_violence | **S4** |
| 50.05 | 50.05 | visible_injury | **S4** |
| 50.05 | 50.05 | weapon_use | **S4** |
| 60.06 | 65.065 | weapon_present | S3 |
| 60.06 | 65.065 | weapon_use | S3 |
| 75.075 | 75.075 | physical_violence | S2 |
| 75.075 | 75.075 | visible_injury | S2 |
| 80.08 | 90.09 | multi_person_conflict | S1 |
| 80.08 | 90.09 | weapon_present | S1 |
| 95.095 | 95.095 | physical_violence | S2 |
| 100.1 | 105.105 | multi_person_conflict | S1 |
| 100.1 | 115.115 | weapon_present | S1 |
| 115.115 | 135.135 | multi_person_conflict | S2 |
| 125.125 | 125.125 | weapon_present | S1 |
| 135.135 | 135.135 | weapon_present | S2 |

**Video duration:** 135.335s  
**Auditor review:** Not yet submitted (status: `AUDITOR_REVIEW`)  
**AI failure:** None

---

## Outcome

**All 10 checks passed.** The real watsonx.ai pipeline processes a video end-to-end without manual intervention, correctly persists all AI output fields to the database, and the frontend displays the results (severity tier, narrative summary, flagged entities via EntityPills).

**Task [TEST] Mid-sprint E2E smoke test (real AI) — ✅ COMPLETE**
