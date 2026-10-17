# Handoff: Aleeya Ahmad, Sprint 3 Week 2 (UX)

**Git URL:** https://github.com/firasvahora1095/IBM-RCS-Infrastructure-Team-2
**Deployed site:** https://rcs-frontend.2emp87e5l3yh.ca-tor.codeengine.appdomain.cloud

## Done
Built the AI Buddy panel, the Super Admin Auditor, the Week 2 B2B click-through and accessibility pass, and a full redesign of the Manager UI that cuts clicks on the main tasks and makes the screens consistent.

## Deliverable

| What | Where |
|---|---|
| AI Buddy backend and panel | Merged PRs #87 and #88. Notes: `docs/ux/ai-buddy-handoff.md` |
| Super Admin Auditor, with automatic placement of cases | Merged PR #89. Rights and access: `docs/ux/super-admin-rights-and-access.md` |
| CI repair | Merged PR #90 |
| Week 2 B2B click-through, accessibility pass, Emily's landing page and CommunityHub asks | Merged PR #91. Notes: `docs/ux/week2-b2b-click-through-and-accessibility.md`. Link test: `frontend/src/test/linkIntegrity.test.tsx` |
| Manager UX audit, ideal design and build record (research, findings, before and after clicks, wording, placement rules, decisions) | Branch `feat/manager-ux-flow`. Doc: `docs/ux/manager-ux-audit-and-redesign.md` |
| S4 Manager check-in restored (AR-WB-12) | Branch `fix/s4-manager-checkin` |

## Note for next role

**Merge status**
- `feat/manager-ux-flow` and `fix/s4-manager-checkin` are pushed but not merged, and no PRs are open for them. The GitHub token available to me cannot create or merge PRs, so someone with access needs to do it.
- `feat/manager-ux-flow` may have later local changes than the remote at the time you read this. Check `git status` on it before merging.

**Manager redesign: what to know**
- The Manager has 6 tabs: Overview, Cases, Deliveries, Reports, Insights, Validation. Routes are unchanged; `/manager/insights` is new.
- The Overview is an inbox called "Needs you".
  - Approve a break request, Follow up a talk request and Retry a delivery happen in the row.
  - SOS opens the SOS Inbox. Acknowledging stays a deliberate second step so the Manager sees the context first (Figma 103:151).
  - Reassignment is Review, then one confirm. A reassignment is never done from the list, because it puts a case on a named person.
- The SOS Inbox, Reassignment Queue and Client messages are no longer tabs. They are reached from the "Go to" links under the inbox, from Client messages on the Deliveries header, and from inbox rows.
- Break and talk requests stay clearly visible to the Manager (team decision D2).
- One primary button per screen. On the Overview it is Generate Report; row actions are outline.
- Clicks, before and after: approve a break 2 to 1, retry a delivery 3 to 1, reassign a declined case 5 to 2.
- Case-status wording on the Manager screens follows the BA's UI wording standard (§11.1 in `docs/ba/extra-features.md`). The signed-off RT-01 and RT-02 labels are not changed. The reasoning is in section 8 of the redesign doc; the BA should confirm it.
- Left as they are on purpose: severity colours stay as in Figma (green for S1 would read as "safe" on harmful content), and the AI Buddy input stays at the bottom with its "can't change anything" boundary.

**S4 check-in**
- AR-WB-12 is mandatory and requires a Manager check-in after S4 as well as after an SOS. A recent change limited it to SOS with no requirement behind it. `fix/s4-manager-checkin` restores it, and reverts the matching test change.
- Not verified: my one test run on that branch reported failures in `ManagerTopNav.test.tsx` and elsewhere. I believe the cause is that the branch is based on main without the Manager work, and my working folder carried uncommitted Manager changes across the checkout. I have not re-run it cleanly, and the backend tests have not run (`pytest` is not installed here). Run both test suites on that branch before merging, and have the team confirm the decision.

**Not done or not covered**
- The deployed site has not been hand-crawled. I do not type passwords into hosted sites, so a teammate with the demo accounts needs to do it.
- No NVDA screen-reader pass.
- The two demo videos for Emily, and cited research for the cooldown puzzle.
- The "screen not fitting my laptop" report was never resolved: I did not get the page or screen size.
- All checks were run on localhost against the mock data source, not the deployed site.

**Tips and open questions**
- Run the frontend tests one file at a time: `npx vitest run --no-file-parallelism`. In parallel, a few timing-sensitive keyboard and accessibility tests fail on slow machines.
- Open for the team or BA: whether "Unavailable (SOS)" should stay on the Auditors table (it repeats the SOS signal but is the only place that shows which Auditors are protected), and whether the "Processing (queued)" and "Processing (AI)" split in the case flow chart is what the BA wants.
