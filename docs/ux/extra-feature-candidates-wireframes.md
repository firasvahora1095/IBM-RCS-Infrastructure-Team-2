# Extra Feature Candidates: Wireframes and Decision Pack

**Track:** Design / Product · **Owner:** Aleeya Ahmad (UX) · **Status:** 10 Oct 2026
**Sources:** [`docs/ba/extra-features.md`](../ba/extra-features.md) (the BA's research and shortlist), the client meeting on 8 Oct 2026 (`meeting-with-emily-sprint-3-demo.md`), the live build.

Seven candidates were shortlisted. Each has one low-fidelity wireframe below, then one table to compare them, so the team can see the options side by side and check the decision that was taken.

## The decision, as it stands

| Candidate | Outcome | Why |
|---|---|---|
| **C1 AI Buddy** | **Chosen as the HD feature** | Client feedback on 8 Oct: the dashboards are what was expected, so the extra for HD is a generic AI chatbot, framed as preliminary. |
| C2 Manager Insights Dashboard | Core (built) | "The current dashboard is what was expected of us." |
| C3 Auditor My Work & Protection | Core (built) | Same. |
| **C4 Super Admin Auditor + case visibility** | **Required, not built** | Client asked for a fallback that always receives all cases, plus a way to make cases visible to lower-level Auditors. |
| C5 Cooldown block puzzle | Kept (built) | Small and research-informed; low risk. |
| C6 CommunityHub handoff + Admin "Remove post" | Core (built; labelled as a simulation) | Closes the loop with the Client. |
| C7 Client Service Report + portal | Core (built) | Same. |

## How to read the wireframes

Boxes show layout and hierarchy only, not final styling. `[ ]` is a button, `( )` a tag, `▼` a menu, `▌` a status accent. Wording is the BA's standard labels (extra-features §11.1) where they exist. Every wireframe notes **what question the screen answers**, so nothing is on it without a reason.

---

## C1. AI Buddy (HD feature)

**Answers:** "How does this work, and where do I do it?" without leaving the screen. **Guides; authorised humans decide.**

```text
┌─ Any Auditor or Manager screen ───────────────────────────────┐ ┌─ AI Buddy ─ preliminary ──── ✕ ┐
│                                                               │ │ How can I help?                 │
│   (the screen the person is working on, unchanged)            │ │ ( What happens at my limit? )   │
│                                                               │ │ ( Break request vs SOS? )       │
│                                                               │ │ ( What is Delivery Failed? )    │
│                                                               │ │                                 │
│                                                               │ │ You: What happens if I hit      │
│                                                               │ │      120 minutes?               │
│                                                               │ │ Buddy: You stop receiving new   │
│                                                               │ │  cases for the rest of the day. │
│                                                               │ │  If it happens mid-case, the    │
│                                                               │ │  case goes to your Manager.     │
│                                                               │ │  [Open my exposure]             │
│                                                           [AI]│ │ ┌─────────────────────────┐ [↑] │
│                                                               │ │ │ Ask a question          │     │
└───────────────────────────────────────────────────────────────┘ │ └─────────────────────────┘     │
                                                                  │ AI Buddy guides. People decide. │
                                                                  └─────────────────────────────────┘
Not enough verified information:
  "I don't have enough verified information to answer that case-specific question.
   Open Case Oversight or contact your Manager."          [Open Case Oversight]
```

| | |
|---|---|
| State | Built by Dev on `feature/ai-chatbot` (PR #71, on `test`, **not on `main` yet**): floating button, 360px panel, role-based suggested questions, watsonx.ai backed |
| Must not (BA §11) | Decide outcomes or severity, diagnose wellbeing, replace SOS, reassign, approve breaks, change limits, remove posts, release reports |
| Gaps between this wireframe and the built widget | (1) the system prompt has no "must not" rules or safe-fallback wording; (2) no action links such as "Open my exposure"; (3) built with hard-coded colours and plain elements, not Carbon components; (4) no focus management, keyboard close or `aria-live` for new answers; (5) the BA wants a side panel or drawer, the build is a floating window |
| Risk | Wrong or invented answers. Mitigation: grounded context only, safe fallback, and the "preliminary" label |

---

## C2. Manager Insights Dashboard

**Answers:** How are operations going, what needs me, who is protected, is anything not reaching the Client?

```text
Manager Intelligence Dashboard                      (DEMO / PLACEHOLDER DATA)
Organisation ▼ CommunityHub   Period ▼ This week        [Generate Client Service Report]
┌────────────┬────────────┬────────────┬────────────────────┐
│ Total      │ Completed  │ Open       │ Needs manager ▌    │
│ 186        │ 142        │ 44         │ action  4          │
└────────────┴────────────┴────────────┴────────────────────┘
┌─ Needs attention ───────────────┐ ┌─ Case flow and timing ───────────────┐
│ ▌ SOS Alert                  1 >│ │ [Submitted|AI|Ready|Review|Manager]  │
│ ▌ Support requests  1 break·1 talk│ │ Median decision time   42 min        │
│ ▌ Reassignment               3 >│ │ Oldest unresolved      3 h  RCS-184  │
│   Exposure Limit             0 >│ └──────────────────────────────────────┘
│ ▌ Delivery Failed            2 >│
└─────────────────────────────────┘
┌─ Auditor protection & availability ──────────────────────────────────────┐
│ Auditor   Exposure        State      Cooldown   Active   Availability    │
│ A         94/120 ████░    (Approaching)  —         1      (Available)     │
│ B        120/120 █████    (At Limit)     —         0      (Unavailable)   │
└──────────────────────────────────────────────────────────────────────────┘
┌─ AI vs Auditor ───────────────┐ ┌─ Client outcomes ─┐ ┌─ Delivery Health ──┐
│ Override rate 13.4%  4x4 grid │ │ outcome + S1–S4   │ │ Delivered Pending  │
│ (not model accuracy)          │ │                   │ │ Retrying  Failed   │
└───────────────────────────────┘ └───────────────────┘ └────────────────────┘
Every figure: [View evidence] → definition, source fields, contributing cases.
```

| | |
|---|---|
| State | **Built and live** at `/manager` (PRs #61, #62, #64, #67, #68) |
| Wording | The BA's standard labels (SOS Alert, Reassignment, Exposure Limit, Delivery Failed, Delivery Health, AI Match / AI Override) are being applied in the separate "rewrite all tags" task |
| Open | The BA standard keeps routine "talk" requests out of the dashboard (in Auditor View Details); the product owner asked for break **and** talk requests to be visible. Needs a BA decision |

---

## C3. Auditor My Work & Protection

**Answers:** What work do I have, what can I start, and am I allowed to carry on?

```text
Case queue                                  [Wellbeing check-in] [Open next case]
┌──────────┬──────────┬──────────┬───────────────┬───────────────────────┐
│ My open  │ Ready to │ Completed│ Exposure left │ Status                │
│ cases  3 │ review 2 │ today  4 │ 75 min        │ (Available)           │
└──────────┴──────────┴──────────┴───────────────┴───────────────────────┘
In review (1)        RCS-177   (S2)   In review ............ [Resume]
Ready for review (2) RCS-184   (S3)   Ready for review ..... [Open]
                     RCS-191   (S2)   Ready for review ..... [Open]
Processing (1)       RCS-205          AI analysis in progress
Status tile in cooldown:  (Cooldown) 12:34   [Play block puzzle]
Status tile at the limit: (At Limit)  "No new cases will be assigned today."
No quotas, targets, rankings or speed pressure anywhere on this screen.
```

| | |
|---|---|
| State | **Built and live** at `/auditor` (PR #65) |
| Risk | Low. Fully tested, including accessibility in the cooldown and limit states |

---

## C4. Super Admin Auditor and case visibility (to build)

**Answers:** If no normal Auditor can take a case safely, where does it go, and how do I release it to the others?

```text
SUPER ADMIN AUDITOR: Case queue                       (sees every case)
Case ID   Severity  Status          Visibility               Assigned to   Action
RCS-184   (S3)      Ready for Review (Super Admin only)       —            [Take case]
                                                                           [Make Available to Auditors]
RCS-191   (S2)      Ready for Review (Available to Auditors)  Auditor B    —
RCS-177   (S4)      In Review        (Assigned only)          Auditor A    —

Make Available to Auditors  (confirm)
 ┌──────────────────────────────────────────────────────────────┐
 │ RCS-184 will show to eligible Auditors as:                   │
 │   Case ID · severity · status · availability only            │
 │ Not shown: footage, thumbnail, Reporter details, notes.      │
 │ Auditors in cooldown or at their limit are skipped.          │
 │                              [Cancel]  [Make Available]      │
 └──────────────────────────────────────────────────────────────┘

STANDARD AUDITOR: queue shows an "Available" case as metadata only; only the
Auditor it is assigned to can open the full review.
```

| | |
|---|---|
| State | **Not built.** Specified in extras §1.6 |
| Rules from the BA | Normal weighted assignment stays the default. Visibility is separate from the primary assigned Auditor, so a case never has two owners. Never silently assign to someone in cooldown or at the cap |
| Needs | A visibility field on cases (`SUPER_ADMIN_ONLY` / `AVAILABLE_TO_AUDITORS` / `ASSIGNED_ONLY`), a Super Admin role, one Manager/Super Admin action, an Auditor queue change, tests |
| Risk | Medium: touches assignment and role access. The privacy rule (metadata only) must be tested |

---

## C5. Cooldown block puzzle

**Answers:** What can I do during a cooldown that is calm and optional?

```text
Cooldown in progress                      12:34 remaining
┌────────────────────┐   [Play block puzzle]        optional, never shortens the cooldown
│ ▒▒                 │   [Optional Wellbeing check-in]
│ ▒▒   ▒▒▒           │   [Stop my shift]
│ ▒▒▒▒ ▒▒▒▒▒▒        │   No score. No timer on the game. No claim of treatment.
└────────────────────┘
```

| | |
|---|---|
| State | **Built and live** (`/auditor/cooldown`) |
| Wording rule | Described only as an optional, research-informed visuospatial activity (Iyadurai et al., 2018), never as therapy |
| Risk | Low |

---

## C6. CommunityHub handoff and Admin "Remove post"

**Answers:** (RCS side) did the result reach the Client? (CommunityHub side) what did RCS find, and what do I do about the post?

```text
COMMUNITYHUB ADMIN: Moderation queue         (simulated Client platform)
Needs action (6)  |  Done (102)
┌──────────────────────────────────────────────────────────────┐
│ Post CH-4721            RCS Case RCS-184                      │
│ RCS Outcome: Policy Violation Found      Severity: (S3)       │
│                                   [Remove Post]  [Keep Post]  │
└──────────────────────────────────────────────────────────────┘
RCS decides the outcome. CommunityHub decides the action. RCS never removes a post.

RCS Manager: Deliveries     Pending → Retrying → Delivered | Failed [Retry] [Escalate]
Delivery is separate from moderation: a failed delivery never reopens a case.
```

| | |
|---|---|
| State | **Built and live**: automatic handoff with retries, the Manager exception queue, and CommunityHub's moderation queue with Remove / Keep |
| Needs | The "simulated Client platform" statement the client asked for, shown clearly and professionally on `/communityhub` and in the demo (extras §4: "a simulation of platforms like Reddit; live API access was not available") |
| Risk | Low for the build; the framing is a wording task |

---

## C7. Client Service Report and portal

**Answers:** (Manager) can I send the Client an accurate, reviewed summary? (Client) what did RCS do for us this period?

```text
MANAGER: Report preview            RPT-CH-2026-09 · v1 · (Draft)       [Approve and release]
 Cases · Moderation outcomes · Final severity · Timeliness · AI and human review
 · Workflow · Delivery Health · Service notes (no names, no wellbeing detail)
 Each section: [View evidence] (definition, fields, contributing cases), frozen at generation

CLIENT: Service reports → September 2026 → view / [Download PDF]
 Same figures and definitions, no case IDs, access logged.  Draft or other-Client report = "not found"
```

| | |
|---|---|
| State | **Built and live** (`/manager/reports`, `/client/reports`; PRs #64, #67) |
| Risk | Low. Figures are frozen at generation; released versions never change |

---

## Comparison

Effort is for what **remains**, not what has been built. "Demo impact" is the BA's reading of the client feedback.

| | C1 AI Buddy | C2 Manager dashboard | C3 Auditor dashboard | C4 Super Admin | C5 Puzzle | C6 Handoff + Admin | C7 Report + portal |
|---|---|---|---|---|---|---|---|
| Answers the client's feedback | **Yes (HD)** | Expected | Expected | **Yes (fallback)** | n/a | Yes (framing) | Expected |
| State | On `test`, not `main` | Live | Live | Not built | Live | Live | Live |
| Remaining effort | Medium: merge, harden, Carbon | None | None | Medium | None | Small (wording) | None |
| Risk | Medium (wrong answers) | Low | Low | Medium (roles, assignment) | Low | Low | Low |
| Needs the BA | Prompt rules and wording | Tag wording | None | Visibility rules (done) | None | Simulated-platform wording | None |
| Reduces clicking | Yes | Yes (evidence in one place) | Yes | Neutral | n/a | Yes (outcome and action together) | Neutral |

## Recommended order

1. **C1 AI Buddy:** merge `feature/ai-chatbot` to `main`, add the BA's "must not" rules and fallback wording, add a keyboard-and-screen-reader pass, replace hard-coded styling with Carbon. It is the HD feature, so it is the one that must be solid.
2. **C4 Super Admin Auditor:** the client's explicit fallback requirement and the only feature not yet built.
3. **C6 wording:** the "simulated Client platform" statement, a small change with high effect on how the demo is read.
4. Apply the BA's tag standard across C2, C3, C6 and C7 (separate task).

## Questions for the team

1. Is the AI Buddy a floating window (built) or a side panel (BA wording)? A side panel keeps it clear of the page's own actions.
2. Should the Manager dashboard show routine "talk" requests (product owner) or leave them in Auditor View Details (BA standard)?
3. Does the Super Admin Auditor take cases by default, or only when no Auditor is eligible?

## Not shortlisted

Copilot over dashboard data (extras §11 in the earlier draft) is folded into the AI Buddy's future direction ("what needs my attention today?"). It needs retrieval, permissions and audit controls that are out of scope for Sprint 3.
