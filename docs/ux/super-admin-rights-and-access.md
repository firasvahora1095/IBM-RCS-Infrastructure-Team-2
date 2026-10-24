# Super Auditor: rights, access and how cases move

**Track:** Design / Product · **Owner:** Aleeya Ahmad (UX) · **Branch:** `feat/super-admin-auditor`
**Asked for by:** Emily, 8 Oct demo feedback (`meeting-with-emily-sprint-3-demo.md`, section 3): "a super auditor auditor who always receives all cases, a fallback, plus something that can make cases visible to low level auditors."
**How we word it:** the Super Auditor has **visibility of all cases and acts as the fallback reviewer**. Visibility is kept separate from ownership and assignment, so "always receives" never means "owns everything".
**Team decisions (confirmed):** no hold (0 minutes); the Super Auditor may claim a released case; a Manager may reassign to the Super Auditor, listed last; Super Auditor is a flag on an Auditor account, with every extra permission enforced server-side and no Manager powers.
**Rules from:** [`docs/ba/extra-features.md`](../ba/extra-features.md), section 1.6 (Case Assignment Fallback)

## What a Super Auditor can and can't do, in plain words

**Can:** see every open case (queue details only, never footage); take a case nobody owns, when it can't wait; set **Auditors can claim** to Yes on a case nobody owns, and back to No; review the cases they own, like any Auditor; be chosen by a Manager as the last-listed option when reassigning.

**Can't:** reassign a case an Auditor is already working on, set an Auditor's exposure limit, or open Manager screens. Moving an owned case is the Manager's job (AR-DF-02), so one person can never both review and supervise the same work. The server answers a Super Auditor who tries to take an owned case with "This case already has an Auditor. A Manager can reassign it."

**Doesn't need to:** place parked cases. The system does that itself, using the normal weighted rule, the moment an Auditor is free (section 3). The fallback queue says so on screen, and so does the demo guide.

**Why there is no Reassign button for a Super Auditor.** It is a deliberate, tested decision (the access matrix below), not a missing feature. If a client ever wants the Super Auditor to choose who takes a parked case, that is a new right for `fallback_queue` plus a button; it would reverse decision 4 below, so it needs the client's agreement first.

## Releasing a case for claiming: who decides, and why we keep it

**What it is.** For a case nobody owns, a **Manager** (Cases page, "Waiting for an Auditor") or the **Super Auditor** (fallback queue) can set **Auditors can claim** to **Yes** (a switch on each row, confirmed in a dialog). Every eligible Auditor then sees the case's severity and how long it has waited (never the footage) under **Available to claim**, and can claim it. A claim adds it to their queue; it still opens on a content warning and can be declined. Setting it back to **No** hands the case back to the system, which assigns it by the usual rule.

**Who decides.** The Manager or the Super Auditor, by hand. Nothing releases a case automatically, and an Auditor can never release one. The Manager is the natural owner (a supervisory decision about who may pick up work), and the Super Auditor can do it from the queue where they already see these cases. Both are in the access matrix.

**Do we need it?** Yes, but as a deliberate option, not a step in the flow.
- It is the second half of Emily's 8 Oct request: "a way to make cases visible to lower-level Auditors" (BA 1.6, "Make Available to Auditors").
- It is the one place a *person* rather than the algorithm chooses who takes a case: an Auditor volunteers instead of being assigned. That is a real wellbeing lever for severe work, and it can be shown live.
- It is not the normal path. In normal running the system places every case by itself, so most days nobody releases anything.

**What was wrong before.** The Release button had been removed from both screens in the redesign, but the claim list, the API and the seeded demo case stayed. So "Available to claim" appeared with nobody able to create an entry, and a released case that nobody claimed had no way back, because automatic placement leaves released cases alone. Both are fixed here: an **Auditors can claim** switch (No by default) sits on each waiting case, Yes is confirmed in a dialog that says the system will stop assigning it, and No is the way back (it assigns the case straight away if an Auditor is free). The switch replaced two wordier buttons after a design review: one control, one state, readable without context.

**Where an unclaimed case ends up.** It stays visible to the Super Auditor and the Manager, who can take it, take the release back, or reassign it. A case is never lost.

## 1. The idea in four lines

1. **Normal assignment stays the default.** Weighted by exposure and case count, as Naresh specified. The Super Auditor is never part of that pool.
2. **A case is never lost.** Before this work, a report made while every standard Auditor was in cooldown or at their limit failed with a 503 and its upload was deleted. Now it is kept, unowned, and visible to the Super Auditor.
3. **Nobody has to click to move it.** The system places a parked case by itself, using the same weighted rule and the same wellbeing checks, **the moment** a standard Auditor is eligible, unless the Super Auditor has already taken it.
4. **Seeing is not owning, and owning is the only way in.** Visibility lives in `cases.case_visibility`; ownership in `cases.assigned_auditor_id`. Only the owner can open the full review, so the Super Auditor seeing a case never exposes its footage.

## 2. Rights matrix

"Super Auditor" is a normal Auditor account with `is_super_admin = true`. Its session role stays `auditor`. Every row is checked against the running API by `backend/tests/test_access_matrix.py` (16 rights × 4 roles = 64 checks), so this table cannot drift from the code.

| Right | Super Auditor | Standard Auditor | Manager | Why | Enforced in | Proof |
|---|---|---|---|---|---|---|
| See every open case (queue metadata only) | **Yes** | No (403) | No (403) | Emily: "always receives all cases". BA 1.6: visible to the Super Auditor | `fallback_queue.list_all_open_cases` | `test_access_matrix` row 1; `test_super_admin_sees_every_open_case...` |
| Take a case nobody owns | **Yes** | No (403) | No (403) | BA 1.6: "can take over / be assigned a case as a fallback" | `fallback_queue.take_case` | row 2; `test_super_admin_takes_an_unowned_case` |
| Take a case a standard Auditor already owns | **No** (409) | n/a | n/a | Avoids two owners and yanking a case mid-review. Moving an owned case is the Manager's reassignment (AR-DF-02) | `take_case` | `test_take_does_not_steal_a_case_a_standard_auditor_owns` |
| Take, claim or release a case that is with the Manager (declined, SOS, cap reached) | **No** (409/404) | No | Manager only | Declined cases go "directly to the manager" (Naresh Q17, AR-DF-02); a hand-off must not be bypassed | `take_case`, `claim_case`, `make_available` | `test_a_case_with_the_manager_cannot_be_taken...` |
| Make an unowned case available for claiming ("Auditors can claim": Yes) | **Yes** (fallback queue) | No (403) | **Yes** (Cases, Waiting for an Auditor) | BA 1.6: "Super Auditor or authorised Manager selects Make Available" | `fallback_queue.make_available` | row 3; `test_super_admin_and_manager_can_make_a_case_available` |
| Take a released case back to automatic placement ("Auditors can claim": No) | **Yes** (fallback queue) | No (403) | **Yes** (Cases, Waiting for an Auditor) | The way back: automatic placement leaves a released case alone, so without it a case nobody claims would wait for ever | `fallback_queue.withdraw_release` | row 16; `test_a_released_case_is_left_alone_until_someone_takes_it_back` |
| Open the full review of a case | Only if they own it | Only if they own it | Exceptional access only, logged (MR-CR-08) | AR-AS-01: Auditors see only assigned cases. BA 1.6: "Only the assigned Auditor can open the full review" | `_get_owned_case` | rows 5–6; `test_seeing_a_case_does_not_let_the_super_admin_open_it` |
| Own queue | Yes | Yes | No (403) | They are an Auditor | `list_auditor_cases` | row 4 |
| Claim a case released for claiming | Yes | Yes, if eligible | No (403) | Same rule for every Auditor: wellbeing first | `claim_case` | row 8; `test_an_eligible_auditor_claims_and_the_second_claim_fails` |
| **Be given a case while in cooldown, at the exposure limit, or with an open SOS** | **No** (409) | **No** (409) | n/a | Naresh Q14: "wellbeing always takes precedence over moderation speed". AR-WB-02/03/04/08 | `unavailable_reason` | `test_super_admin_is_protected_too`; `test_wellbeing_blocks_a_claim`; `test_an_open_sos_blocks_a_claim` |
| **Be chosen by weighted assignment** | **Never** | Yes | n/a | BA 1.6: the fallback must not make the weighted rule "meaningless" | `list_assignment_candidates` | `test_super_admin_is_never_in_the_weighted_pool`; `test_the_super_admin_is_never_chosen_even_when...` |
| See who declined a case | **No** | No | Yes (queue shows "Unknown" by design, MR-CR-04) | No per-Auditor decline scrutiny (MR-CR-04, AR-DF-03) | `queue_row` blanks the owner when `manager_flag` is set | `test_a_case_with_the_manager_cannot_be_taken...` |
| Manager screens (oversight, SOS inbox, deliveries, reports) | **No** (403) | No (403) | Yes | The Super Auditor is a reviewer, not a supervisor. Granting both would let one person review and supervise their own work | `get_current_manager` | rows 10–13 |
| Set an Auditor's exposure limit; reassign a case | **No** (403) | No (403) | Yes (MR-OV-04, MR-CR-03) | Same reason | `get_current_manager` | rows 14–15 |
| Be flagged as Super Auditor by changing a Manager account | **No** | n/a | n/a | The flag only counts on an `auditor` role | `staff_login` | `test_the_super_admin_flag_cannot_be_claimed_by_a_manager...` |

## 3. How a case moves, with no clicking

```text
New report
   │
   ├─ a standard Auditor is eligible ──► weighted assignment (unchanged) ──► ASSIGNED_ONLY
   │
   └─ nobody is eligible ──► kept, unowned, SUPER_ADMIN_ONLY, queued time recorded
                                  │
                                  ├─ Super Auditor takes it (optional, any time, if they are eligible)
                                  │
                                  ├─ a Manager or the Super Auditor sets "Auditors can claim" to Yes (optional) ──► AVAILABLE_TO_AUDITORS
                                  │        an eligible Auditor claims it ──► ASSIGNED_ONLY
                                  │        or setting it back to No ──► back to waiting, placed by the system
                                  │
                                  └─ the moment a standard Auditor is eligible (no hold):
                                         the system assigns it by the same weighted rule ──► ASSIGNED_ONLY
```

**Who is eligible** is exactly what normal assignment already means, plus the one extra block Manager reassignment uses: not in cooldown, under the daily exposure limit, no open SOS. The Super Auditor is never chosen.

**When it runs.** A scheduler job every 30 seconds, and also when an Auditor opens their queue or the Super Auditor opens the fallback queue, so a waiting case is placed at the first moment someone could take it.

**Why there is no hold.** An earlier draft held a case for 5 minutes so the Super Auditor had a first look. The team removed it: the number was never specified, and with 30-second polling the Super Auditor would need a separate notification to act within it, so the delay protected nothing. A case waits safely and is visible to the Super Auditor straight away; if they get there first they take it, otherwise the weighted rule places it. `FALLBACK_HOLD_MINUTES` still exists and defaults to 0, in case a client ever specifies a first-look window.

**Why this and not the claim list.** Letting Auditors claim a case would ask a person to do the placement the system already knows how to do, and would favour whoever clicks fastest over whoever is lightest loaded. Placement by the weighted rule is fairer and needs no one. "Auditors can claim" (the API's make-available) remains for the one case where a Manager or the Super Auditor wants Auditors to choose for themselves; it is an option, not a step, and it has a visible way back.

**What the system never touches:** a case with the Manager, a case already released for claiming (until it is taken back), a case that has an owner, and any case without a recorded queued time (hand-seeded demo data stays put).

**The Super Auditor sees it coming.** A parked case reads "Being placed automatically when an Auditor is free" (or "Placed automatically from 2:32 pm" if a hold is configured), so there is nothing to watch and nothing to chase.

## 4. Decisions

| # | Decision | Status |
|---|---|---|
| 1 | **No hold (0 minutes).** A case is placed the moment a standard Auditor is eligible, unless the Super Auditor has already taken it. | Confirmed by the team |
| 2 | The Super Auditor can claim a released or unowned case, as long as they are eligible themselves and the case is not waiting on a Manager exception (decline, SOS, cap reached). | Confirmed |
| 3 | A Manager can reassign a case to the Super Auditor. They are listed last, and the same wellbeing rules apply. | Confirmed |
| 4 | "Super Auditor" is a flag on an Auditor account, not a new role, provided the extra permissions are enforced server-side and give no Manager powers. | Confirmed. Enforced server-side and proved by `test_access_matrix.py` |
| 5 | Wording: "visibility of all cases, and the fallback reviewer", not "always receives cases". | Confirmed |
| 6 | The mock data source follows the same rule (no hold). | Aleeya |
| 7 | **Releasing a case for claiming stays**, as a deliberate option for a Manager or the Super Auditor, with a confirmation and a way back (set it to **No**). It is the second half of Emily's 8 Oct request, and the only place an Auditor chooses a case rather than being assigned. | 24 Oct 2026, for the team to confirm |

## 5. What changed

| Where | What |
|---|---|
| `backend/app/fallback_queue.py` | The rules, the automatic placement, and five endpoints |
| `backend/app/assignment.py` | `pick_best`: one ordering rule shared by normal assignment and automatic placement; Super Auditor excluded from the pool |
| `backend/app/main.py` | A kept (not rejected) report when nobody is eligible; `is_super_admin` at login; scheduler job; migrations for `auditors.is_super_admin`, `cases.case_visibility`, `cases.fallback_queued_at`; Manager's case list carries visibility |
| `backend/app/orchestrate.py` | "No eligible Auditor" now reaches the fallback instead of being turned into a 503 |
| `backend/scripts/seed_demo.py` | `superauditor-01`, one parked case, one released case |
| Frontend | Fallback queue on the Auditor dashboard for the Super Auditor (opens on "Needs a reviewer", All open cases one tab away); "Available to claim" for standard Auditors only when something has been released; an "Auditors can claim" switch on the fallback queue and on the Manager's Cases page ("Waiting for an Auditor"); mock data source with the same rules |

Demo accounts (password `test123`): deployed `superauditor-01`; local mock `superauditor-1`.

## 6. How to check it yourself

```text
cd backend
python -m pytest tests/test_access_matrix.py tests/test_fallback_queue.py tests/test_fallback_release.py -q
cd ../frontend
npx vitest run src/components/fallback src/services/mock/fallbackQueue.test.ts
```
