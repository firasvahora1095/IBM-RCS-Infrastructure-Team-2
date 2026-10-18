# Tag colour system

**Owner:** Aleeya Ahmad (UX) · **Code:** `frontend/src/design-tokens/statusTones.ts`, `frontend/src/index.scss` (`--rcs-tag-*`, `--rcs-sev-*`), `components/ui/StatusTag.tsx`, `components/severity/SeverityTag.tsx`
**Checked by:** `design-tokens/tagPalette.test.ts` (every pair is at least 4.5:1, every status family is distinct, severity never reuses a status colour).

## Why it changed

The same meaning showed up in different colours on different screens, and different meanings shared one colour. On an Auditor record, "Approaching Limit", "2 support requests waiting" and "Waiting for you" were all yellow, and the severity scale (yellow, orange, red) collided with the status colours. A tag is only useful if it tells one thing apart from the next.

## Rules

1. **One colour family, one meaning.** Colour is chosen by what the state means, never by the screen.
2. **Every colour is a Carbon palette value** from `@carbon/colors`. None is typed in by hand.
3. **Only the two outcomes that must stand out are solid:** critical (red) and done (green), both with white text. The rest are light tints, so a screen of tags stays calm and the solid ones are found at once.
4. **A tag appears only when it tells an item apart.** In a list where every row is already waiting for the Manager, a "Waiting" tag says nothing, so it is left off. In long tables only the states that need a person get a tag; the rest are plain text.
5. **Colour is never the only signal.** Every tag is written out, and the status tags carry an icon.
6. **Severity is its own scale.** S1 to S4 is ordered data, so it is one hue that darkens as it gets worse. No status uses purple.

## Status palette

| Family | Meaning | Fill and text | Icon | Used for |
|---|---|---|---|---|
| Red, solid | Critical: something failed or someone is at risk | Red 60, white | Error | Unacknowledged SOS, Failed, Timed out, Unavailable (delivery), Limit reached, Blocked |
| Yellow | Caution: a limit is near or something needs a look | Yellow 20, Gray 100 | Warning | Near limit, Needs Reassignment, Awaiting release, AI Override |
| Blue | In progress: someone or something is already on it | Blue 20, Blue 80 | In progress | Pending, Retrying, In Review, In progress (SOS), Cooldown, Seen |
| Green, solid | Done and good | Green 60, white | Check | Delivered, Released, Approved, Followed up, Connected, Answered, Available |
| Teal | A request that is waiting for a person | Teal 10, Teal 80 | none | Support requests, a new Client message |
| Gray | Routine, final or informational | Gray 20, Gray 100 | none | Draft, Complete, Within limit, Unavailable, Declined, Limit reached (queue), Pattern flagged, AI Match |

## Severity palette (separate scale)

| Tier | Fill and text |
|---|---|
| S1 Low | Gray 20, Gray 100 |
| S2 Moderate | Purple 30, Purple 90 |
| S3 High | Purple 60, white |
| S4 Critical | Purple 90, white |

Chart bars use the same ramp (`--rcs-sev-*-bar`). The "Demo data" badge in the header is cyan, so purple belongs to severity alone.

## Every tag, and where it sits

| Tag | Family | Where |
|---|---|---|
| Within limit / Near limit / Limit reached | Gray / Yellow / Red | Auditors table (Daily limit), Auditor record |
| Available / Cooldown / Unavailable (limit) / Unavailable (SOS) | Plain text / Blue / Gray / Gray | Auditors table |
| N support requests waiting | Teal | Auditor record header |
| Pattern flagged | Gray | Auditor record header |
| Break approved / Followed up | Green | Support request, once resolved (an open request has no tag: the button beside it is the signal) |
| Unacknowledged / In progress / Resolved | Red / Blue / Green | SOS alert, SOS history |
| Declined / Limit reached | Gray | Needs you (the Reassignment row) |
| Timed out / Unavailable / Failed | Red | Needs you (Delivery Failed row), Delivery Health |
| Blocked / Needs Reassignment / Awaiting release | Red / Yellow / Yellow | Cases, "Needs you" table |
| Delivered / Pending / Retrying / Failed | Green / Blue / Blue / Red | Deliveries |
| Draft / Released | Gray / Green | Reports |
| New / Seen / Answered | Teal / Blue / Green | Client messages |
| AI Override / AI Match | Yellow / Gray | Auditor overrides |
| Received / Failed / Legacy demo | Green / Red / Gray | AI call log |
| Connected / Needs attention | Green / Red | CommunityHub connection |
| S1 to S4 | Severity palette | Everywhere a severity is shown |

## Sizes

Small (`sm`) in tables and rows, medium (`md`) in page headers. Weight 600. All tags share Carbon's pill shape, and tags inside a row are centred on the row's text (`.rcs-align-row`), not pinned to the top.
