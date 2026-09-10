# WastonX.AI Analysis JSON Schema

This schema follows the revised severity scale and explains the expected JSON for a single frame.  

- `watsonx-analysis.schema.json` contains the validation rules.
- `watsonx-analysis.example.json` shows an example result that follows the rules.
The jsons are located in the backend/schemas directory.  

## Schema Fields

| Field | Meaning | Supplied by |
| --- | --- | --- |
| `case_id` | The case this frame belongs to. | Backend |
| `frame_num` | Assigned frame id in sequential order eg. `frame-00003`. | Frame extraction |
| `timestamp` | Position in the video in seconds. | Frame extraction |
| `tags` | Zero or more specified visual content tags. | watsonx |
| `watson_severity_score` | Original number score, 0–100. | watsonx |
| `effective_severity_score` | Score after adjusting for severe tags. | Backend |
| `severity_tier` | S1–S4, calculated from the effective score. | Backend |
| `reasoning` | Short description of the visual evidence justifying the model score. | watsonx |
| `entities` | Simple descriptions of relevant people or objects in the scene. | watsonx |
| `audit.model_id` | Exact model id used in the request. | Backend |
| `audit.model_version` | Model revision, if available. | Backend |
| `audit.prompt_version` | Version of the prompt instructions sent to watsonx. | Backend |
| `audit.decision_timestamp` | Date and time when the backend received the model decision | Backend |

The current visual tags are `physical_violence`, `weapon_present`, `weapon_use`, `visible_injury` and `multi_person_conflict`. Audio is not currently involved in the automated reasoning.  

## Severity calculation

| Effective score | Tier |
| --- | --- |
| 0–39 | S1 |
| 40–64 | S2 |
| 65–84 | S3 |
| 85–100 | S4 |

Start with `effective_severity_score = watson_severity_score`. TO BE CONFIRMED: If a weapon-use detection tag is present and the original score is below 65, set the effective score to 65. Then calculate the tier from the table. For example, a qualifying result of 52 becomes 65/S3, while the original 52 remains stored.  

Frames are analysed independently. The case cvi calculation separately selects the maximum effective frame score and its tier. As single frames can be misleading, auditors will be in charge of reviewing whether the highest severity frames are actually problematic. The auditor's own case decision is stored separately to this schema.  

## Governance audit fields

The four `audit` fields record which model, model version, our designed prompt version and when the model decision was received. Together with the case and frame references, they can be used to keep an audit record of the project.  

[IBM AI Factsheet samples](https://github.com/IBM/ai-governance-factsheet-samples) 

## Using the schema

Example validation with Python's `jsonschema` package, run from the repository root with the JSON files under `backend/schemas`:

```python
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

schema = json.loads(Path("schemas/frame-analysis.schema.json").read_text())
result = json.loads(Path("schemas/frame-analysis.example.json").read_text())

validator = Draft202012Validator(schema, format_checker=FormatChecker())
validator.validate(result)
```

Validation raises an error for missing fields, unknown tags, invalid types or scores outside 0–100. Additional validation may be performed by the backend.