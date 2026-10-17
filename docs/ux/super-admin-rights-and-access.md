# Super Admin Auditor: rights, access and how cases move

**Track:** Design / Product · **Owner:** Aleeya Ahmad (UX) · **Branch:** `feat/super-admin-auditor`
**Asked for by:** Emily, 8 Oct demo feedback (`meeting-with-emily-sprint-3-demo.md`, section 3): "a super admin auditor who always receives all cases, a fallback, plus something that can make cases visible to low level auditors."
**Rules from:** [`docs/ba/extra-features.md`](../ba/extra-features.md), section 1.6 (Case Assignment Fallback)

## 1. The idea in four lines

1. **Normal assignment stays the default.** Weighted by exposure and case count, as Naresh specified. The Super Admin is never part of that pool.
2. **A case is never lost.** Before this work, a report made while every standard Auditor was in cooldown or at their limit failed with a 503 and its upload was deleted. Now it is kept, unowned, and visible to the Super Admin.
3. **Nobody has to click to move it.** The system places a parked case by itself, using the same weighted rule and the same wellbeing checks, as soon as a standard Auditor is eligible.
4. **Seeing is not owning, and owning is the only way in.** Visibility lives in `cases.case_visibility`; ownership in `cases.assigned_auditor_id`. Only the owner can open the full review, so the Super Admin seeing a case never exposes its footage.

## 2. Rights matrix

"Super Admin" is a normal Auditor account with `is_super_admin = true`. Its session role stays `auditor`. Every row is checked against the running API by `backend/tests/test_access_matrix.py` (15 rights × 4 roles = 60 checks), so this table cannot drift from the code.

| Right | Super Admin | Standard Auditor | Manager | Why | Enforced in | Proof |
|---|---|---|---|---|---|---|
| See every open case (queue metadata only) | **Yes** | No (403) | No (403) | Emily: "always receives all cases". BA 1.6: visible to the Super Admin | `fallback_queue.list_all_open_cases` | `test_access_matrix` row 1; `test_super_admin_sees_every_open_case...` |
| Take a case nobody owns | **Yes** | No (403) | No (403) | BA 1.6: "can take over / be assigned a case as a fallback" | `fallback_queue.take_case` | row 2; `test_super_admin_takes_an_unowned_case` |
| Take a case a standard Auditor already owns | **No** (409) | n/a | n/a | Avoids two owners and yanking a case mid-review. Moving an owned case is the Manager's reassignment (AR-DF-02) | `take_case` | `test_take_does_not_steal_a_case_a_standard_auditor_owns` |
| Take, claim or release a case that is with the Manager (declined, SOS, cap reached) | **No** (409/404) | No | Manager only | Declined cases go "directly to the manager" (Naresh Q17, AR-DF-02); a hand-off must not be bypassed | `take_case`, `claim_case`, `make_available` | `test_a_case_with_the_manager_cannot_be_taken...` |
| Make an unowned case available for claiming | **Yes** | No (403) | **Yes** | BA 1.6: "Super Admin or authorised Manager selects Make Available" | `fallback_queue.make_available` | row 3; `test_super_admin_and_manager_can_make_a_case_available` |
| Open the full review of a case | Only if they own it | Only if they own it | Exceptional access only, logged (MR-CR-08) | AR-AS-01: Auditors see only assigned cases. BA 1.6: "Only the assigned Auditor can open the full review" | `_get_owned_case` | rows 5–6; `test_seeing_a_case_does_not_let_the_super_admin_open_it` |
| Own queue | Yes | Yes | No (403) | They are an Auditor | `list_auditor_cases` | row 4 |
| Claim a case released for claiming | Yes | Yes, if eligible | No (403) | Same rule for every Auditor: wellbeing first | `claim_case` | row 8; `test_an_eligible_auditor_claims_and_the_second_claim_fails` |
| **Be given a case while in cooldown, at the exposure limit, or with an open SOS** | **No** (409) | **No** (409) | n/a | Naresh Q14: "wellbeing always takes precedence over moderation speed". AR-WB-02/03/04/08 | `unavailable_reason` | `test_super_admin_is_protected_too`; `test_wellbeing_blocks_a_claim`; `test_an_open_sos_blocks_a_claim` |
| **Be chosen by weighted assignment** | **Never** | Yes | n/a | BA 1.6: the fallback must not make the weighted rule "meaningless" | `list_assignment_candidates` | `test_super_admin_is_never_in_the_weighted_pool`; `test_the_super_admin_is_never_chosen_even_when...` |
| See who declined a case | **No** | No | Yes (queue shows "Unknown" by design, MR-CR-04) | No per-Auditor decline scrutiny (MR-CR-04, AR-DF-03) | `queue_row` blanks the owner when `manager_flag` is set | `test_a_case_with_the_manager_cannot_be_taken...` |
| Manager screens (oversight, SOS inbox, deliveries, reports) | **No** (403) | No (403) | Yes | The Super Admin is a reviewer, not a supervisor. Granting both would let one person review and supervise their own work | `get_current_manager` | rows 10–13 |
| Set an Auditor's exposure limit; reassign a case | **No** (403) | No (403) | Yes (MR-OV-04, MR-CR-03) | Same reason | `get_current_manager` | rows 14–15 |
| Be flagged as Super Admin by changing a Manager account | **No** | n/a | n/a | The flag only counts on an `auditor` role | `staff_login` | `test_the_super_admin_flag_cannot_be_claimed_by_a_manager...` |

## 3. How a case moves, with no clicking

```text
New report
   │
   ├─ a standard Auditor is eligible ──► weighted assignment (unchanged) ──► ASSIGNED_ONLY
   │
   └─ nobody is eligible ──► kept, unowned, SUPER_ADMIN_ONLY, queued time recorded
                                  │
                                  ├─ Super Admin takes it (optional, any time, if they are eligible)
                                  │
                                  └─ after the hold, and once a standard Auditor is eligible:
                                         the system assigns it by the same weighted rule ──► ASSIGNED_ONLY
```

**Who is eligible** is exactly what normal assignment already means, plus the one extra block Manager reassignment uses: not in cooldown, under the daily exposure limit, no open SOS. The Super Admin is never chosen.

**When it runs.** A scheduler job every 30 seconds, and also when an Auditor opens their queue or the Super Admin opens the fallback queue, so a due case is placed at the first moment someone could take it.

**Why this and not the claim list.** Letting Auditors claim a case would ask a person to do the placement the system already knows how to do, and would favour whoever clicks fastest over whoever is lightest loaded. Placement by the weighted rule is fairer and needs no one. "Make available" remains for the one case where a Manager or the Super Admin wants Auditors to choose for themselves; it is an option, not a step.

**What the system never touches:** a case with the Manager, a case already released for claiming, a case that has an owner, and any case without a recorded queued time (hand-seeded demo data stays put).

**The Super Admin sees it coming.** Each parked case shows "Placed automatically from 2:32 pm", so there is nothing to watch and nothing to chase.

## 4. Assumptions to confirm (not client rulings)

| # | Assumption | Why it was chosen | Who confirms |
|---|---|---|---|
| 1 | **Hold of 5 minutes** before the system places a parked case (`FALLBACK_HOLD_MINUTES`; 0 places it as soon as someone is eligible). | A cooldown ending seconds later shouldn't snatch a case the Super Admin is about to take; five minutes is short enough that no case sits unreviewed. No source gives this number. | Jana (BA) / Naresh |
| 2 | The Super Admin may also claim a case released for claiming. | They can already take any unowned case, so blocking it protects nothing. | Jana |
| 3 | The Super Admin appears last in the Manager's reassignment list and in the Manager's Auditor overview. | A Manager may reassign to them (BA 1.6: "be assigned a case as a fallback"); wellbeing limits apply to them as to anyone. | Jana |
| 4 | The mock data source uses a 60-second hold so the behaviour is visible in a demo. | A real 5-minute wait is too long to show. | Aleeya |
| 5 | "Super Admin" is a flag on an Auditor account, not a new role. | Keeps the session role model unchanged and makes it impossible for a Manager account to be one. | Hyuna / Firas |

## 5. What changed

| Where | What |
|---|---|
| `backend/app/fallback_queue.py` | The rules, the automatic placement, and five endpoints |
| `backend/app/assignment.py` | `pick_best`: one ordering rule shared by normal assignment and automatic placement; Super Admin excluded from the pool |
| `backend/app/main.py` | A kept (not rejected) report when nobody is eligible; `is_super_admin` at login; scheduler job; migrations for `auditors.is_super_admin`, `cases.case_visibility`, `cases.fallback_queued_at`; Manager's case list carries visibility |
| `backend/app/orchestrate.py` | "No eligible Auditor" now reaches the fallback instead of being turned into a 503 |
| `backend/scripts/seed_demo.py` | `superadmin-01`, one parked case, one released case |
| Frontend | Fallback queue on the Auditor dashboard for the Super Admin (opens on "Needs a reviewer", All open cases one tab away); "Available to claim" for standard Auditors only when something has been released; "Make available" action in Manager Case Oversight; mock data source with the same rules |

Demo accounts (password `test123`): deployed `superadmin-01`; local mock `superadmin-1`.

## 6. How to check it yourself

```text
cd backend
python -m pytest tests/test_access_matrix.py tests/test_fallback_queue.py tests/test_fallback_release.py -q
cd ../frontend
npx vitest run src/components/fallback src/services/mock/fallbackQueue.test.ts
```

Known failures that predate this work and are not caused by it: 9 backend tests in `test_storage.py` and `test_video_analysis.py`; 3 frontend tests about the S4 cooldown check-in (`CooldownPage.test.tsx` twice, `mockDataService.test.ts` once).
