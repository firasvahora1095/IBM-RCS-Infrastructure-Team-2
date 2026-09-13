# watsonx.governance Audit Logging

## Overview

`backend/app/governance.py` sends each frame analysis result to a watsonx.governance OpenScale payload logging data set. It records the frame result together with the four audit fields defined in the analysis schema.

It does not calculate severity. It receives an analysis result that has already been validated and scored by the backend.

## Configuration

Add these variables to `.env`:

```dotenv
IBM_CLOUD_API_KEY=
WATSONX_GOVERNANCE_URL=
WATSONX_GOVERNANCE_SERVICE_INSTANCE_ID=
WATSONX_GOVERNANCE_DATA_SET_ID=
```

## Reuse

Use `build_frame_analysis` to convert the structured watsonx.ai output into the complete frame schema, then send it with `log_analysis_result`:

```python
from app.governance import log_analysis_result
from app.severity import build_frame_analysis

frame_analysis = build_frame_analysis(
    model_output=watson_result["analysis"],
    case_id=case_id,
    frame_num=frame_num,
    timestamp=timestamp,
    model_id=watson_result["model"],
    model_version=None,
    prompt_version="1.0"
)

audit_result = log_analysis_result(frame_analysis)
```

The watsonx.ai prompt must request valid JSON containing `tags`, `watson_severity_score`, `reasoning` and `entities`. `build_frame_analysis` parses that JSON, copies the original score to the effective score, calculates the tier and adds the audit fields controlled by the backend.

The function:

1. authenticates using IBM Cloud IAM;
2. converts the frame result into an OpenScale `PayloadRecord`;
3. sends the record to the configured payload logging data set;  
4. returns the case and frame references that were logged.

## Testing

Configure the Governance environment variables, then run the integration test from the `backend` directory:

```bash
python scripts/GOVERNANCE_TEST.py
```

The script creates a synthetic frame result with a score of 72. The scoring function maps it to S3, adds the audit fields and sends it to Governance. A successful call prints:

```json
{
  "status": "logged",
  "service": "watsonx-governance",
  "case_id": "governance-test-case",
  "frame_num": "frame-00001"
}
```

## Case-Level Severity Pseudocode

```text
FUNCTION calculate_case_severity(frame_results):
    IF frame_results is empty:
        FAIL because the case has no analysed frames

    FOR EACH frame IN frame_results:
        frame.effective_severity_score = frame.watson_severity_score
        frame.severity_tier = tier_for(frame.effective_severity_score)

    highest_frame = frame with the highest effective_severity_score
        if scores are equal, select the earliest frame

    RETURN {
        case_id: highest_frame.case_id,
        severity_score: highest_frame.effective_severity_score,
        severity_tier: highest_frame.severity_tier,
        highest_frame: highest_frame.frame_num
    }

FUNCTION tier_for(score):
    IF score <= 39: RETURN S1
    IF score <= 64: RETURN S2
    IF score <= 84: RETURN S3
    RETURN S4
```

The case score is the maximum frame score rather than an average. This prevents a serious frame from being hidden by a larger number of low-severity frames. The auditor still reviews the selected frame and makes the final human decision.

`effective_severity_score` initialy is equal to `watson_severity_score`. If the validated tags array contains weapon_use, the backend applies a minimum effective score of 65. The original Watson score remains unchanged for auditing.  

## Logged Audit Fields

| Field | Purpose |
| --- | --- |
| `model_id` | Exact model used to analyse the frame |
| `model_version` | Model revision, when IBM provides one |
| `prompt_version` | Version of the analysis prompt |
| `decision_timestamp` | When the backend received the model result |

The case ID and frame number connect each Governance record to the full analysis stored by the backend.

## IBM References

- [IBM Watson OpenScale Python SDK client configuration](https://client-docs.aiopenscale.cloud.ibm.com/html/index.html#api)
- [IBM Watson OpenScale `store_records` documentation](https://client-docs.aiopenscale.cloud.ibm.com/html/index.html#ibm_watson_openscale.data_sets.DataSets.store_records)
- [IBM Watson OpenScale `PayloadRecord` documentation](https://client-docs.aiopenscale.cloud.ibm.com/html/index.html#ibm_watson_openscale.supporting_classes.payload_record.PayloadRecord)
