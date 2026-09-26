# Plain-Language Audit of User-Facing Copy

## Objective

Review warnings, consent notices, error/limitation messages, public status labels and Auditor-facing labels for plain language and avoidance of internal API or database terminology.

## Reviewed public copy

| Copy | Result |
|---|---|
| Report content for review | Pass |
| You don't need an account. Tell us what happened and we'll take it from here. | Pass |
| Your report is reviewed carefully and confidentially | Pass |
| View content policy / View privacy notice | Pass |
| Upload video / Paste a link instead / Add a screenshot | Pass |
| Add more detail (optional) | Pass |
| Report anonymously / Include my name & email | Pass |
| Submit report | Pass |
| Already have a case ID? Check your case status | Pass |
| Report received | Pass |
| Save the case ID below — it's the only way to check your case later. | Pass |
| Copy case ID | Pass |
| Check your case status | Pass |
| Received / Being Reviewed / Complete | Pass |
| A reviewer is currently assessing your report against our content policy. | Pass |

## Reviewed Auditor copy

| Copy | Result |
|---|---|
| Case queue | Pass |
| AI analysis in progress | Pass |
| Ready for review | Pass |
| AI analysis unavailable | Pass |
| Severity score and incident timeline are unavailable for this case. Review with extra caution. | Pass |
| Severity unknown — AI analysis unavailable for this case | Pass |
| Would you like to proceed? | Pass |
| Proceed / Decline | Pass |

## Internal-status check

The public flow uses **Received**, **Being Reviewed** and **Complete** instead of internal values such as `AI_PROCESSING`, `READY_FOR_REVIEW` or `AUDITOR_REVIEW`.

## Finding

No blocking plain-language mismatch was identified in the reviewed core flow.

One minor issue remains outside the core status/review wording: the upload screen still contains provisional text describing some file-size values as placeholders. Those values should be replaced with confirmed limits before a final production-style release.
