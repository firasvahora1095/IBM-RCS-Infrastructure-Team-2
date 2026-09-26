# T49 — Tag-to-Tier Taxonomy Validation

## Objective

Confirm the final visual tag-to-tier mapping against real pipeline output, including the `weapon_use` minimum-tier floor required by `AR-WB-11`.

## Severity bands

| Tier | Effective score |
|---|---:|
| S1 | 0–39 |
| S2 | 40–64 |
| S3 | 65–84 |
| S4 | 85–100 |

## Tag treatment

| Tag | Severity treatment |
|---|---|
| `physical_violence` | Context-dependent evidence |
| `weapon_present` | Context-dependent evidence |
| `weapon_use` | Minimum S3 floor |
| `visible_injury` | Context-dependent evidence |
| `multi_person_conflict` | Context-dependent evidence |

`verbal_aggression` remains supporting STT/audio evidence rather than part of the automated visual CVI calculation.

## Real pipeline validation

A real test video was run through the current Watson frame-analysis pipeline using the configured local environment.

The pipeline produced multiple frames containing the `weapon_use` tag.

### Key evidence

#### Frame `frame-00034`

```text
timestamp: 170.17
tags: ["weapon_use", "visible_injury"]
watson_severity_score: 60
severity_tier: S3
```

A raw score of 60 falls within the normal S2 range of 40–64. Because the real pipeline returned `weapon_use`, the final classification was raised to S3, confirming the minimum-tier floor.

#### Frame `frame-00124`

```text
timestamp: 620.62
tags: ["weapon_present", "weapon_use", "multi_person_conflict"]
watson_severity_score: 60
severity_tier: S3
```

This provides a second real-pipeline example of the same rule. The raw score would normally map to S2, but `weapon_use` results in a final S3 classification.

### Additional pipeline examples

The same run also produced:

```text
frame-00019
watson_severity_score: 75
tags: ["weapon_present", "weapon_use", "multi_person_conflict"]
severity_tier: S3
```

```text
frame-00047
watson_severity_score: 75
tags: ["weapon_present", "weapon_use"]
severity_tier: S3
```

```text
frame-00069
watson_severity_score: 70
tags: ["weapon_present", "multi_person_conflict", "weapon_use"]
severity_tier: S3
```

```text
frame-00090
watson_severity_score: 70
tags: ["physical_violence", "weapon_present", "weapon_use", "multi_person_conflict"]
severity_tier: S3
```

## Result

The final tag-to-tier mapping is confirmed against real pipeline output.

The strongest evidence is the two real frames with `watson_severity_score: 60` and `weapon_use`, both classified as S3. Since a score of 60 would otherwise fall in S2, these results confirm that the implemented `weapon_use` minimum-S3 floor is being applied by the current pipeline.

This closes the remaining validation gap for the `weapon_use` tag-to-tier rule.
