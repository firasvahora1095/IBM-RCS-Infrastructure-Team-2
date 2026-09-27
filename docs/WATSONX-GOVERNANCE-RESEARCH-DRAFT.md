# watsonx.governance Research Draft

## Goal

Every real AI frame decision should create:

1. A transaction in watsonx.governance.
2. A matching row in the application's `audit_logs` table.

Both records need the model version, decision timestamp, case ID, and a shared decision ID.

## Main finding

The current `backend/app/governance.py` is an older prototype. It was based on writing directly to an OpenScale dataset, is not called by the production case-processing path, and is not the desired governance pathway set out by the client.

The preferred design is to deploy and monitor the watsonx.ai prompt/model through watsonx.governance with prompt templates. Code Engine calls that deployment, governance records the scoring transaction, and the application writes the matching database audit row.

No application code has been changed as part of this research task.

## Current repository flow

The application currently stores the video, analyses sampled frames with watsonx.ai, saves the results to COS, and writes one case-level `AI_ANALYSIS_COMPLETED` audit event.

The missing part is a matching audit record for each frame decision. The existing audit table can store the new fields in `after_value`, so a database migration is not initially required.

## Target flow

```text
Video in COS -> Code Engine -> watsonx.ai deployment
                       |              |
                       |              +-> watsonx.governance transaction
                       +-> PostgreSQL audit_logs row
```

Each frame inference should use one shared `decision_id`. The application should also store:

| Field | Purpose |
| --- | --- |
| `case_id` | Links the decision to the case. |
| `analysis_run_id` | Groups all frames from one video-processing run. | OPTIONAL
| `decision_id` | Matches the governance and database records. | OPTIONAL
| `frame_num` | Identifies the analysed frame. |
| `model_id` / `model_version` | Identifies the model. |
| `prompt_version` | Identifies the prompt. |
| `decision_timestamp` | Records when the decision occurred. |
| `deployment_id` | Identifies the deployed asset. | OPTIONAL

## IBM Cloud work required

We need to speak to Naresh about:

1. Selecting one canonical `RCS Harmful Video Analysis` AI use case and give the project team access.
2. Associating `IBM-RCS-Infrastructure-Team2` with its Development phase.
3. Tracking the frame analysis prompt in that use case.
4. Deploy the prompt/model and enable governance monitoring.
5. Run a test request and confirm that its transaction is visible in governance.
6. Create a service ID for Code Engine and keep credentials in Code Engine secrets.

Without adequate permissions, we will also be unable to check the records in governance. This must be clearly discussed with Naresh.

### Prompt deployment question

The current prompt uses Chat mode because it accepts an image. IBM documentation says Chat prompts do not support variables, while the normal promotion process expects one.

Before coding, use the deployment's **API Reference** and **Test** pages to prove that it can accept a different image on every request. If it cannot, the fallback is a deployed AI service wrapping the watsonx.ai Chat API.

## Repository changes required

- `watsonx_image.py`: call the deployed endpoint and return its model, prompt, timestamp, deployment, and transaction details.
- `video_analysis.py`: generate one analysis-run ID and one decision ID per frame.
- `analysis_service.py`: create one `AI_FRAME_ANALYSIS_RECORDED` audit row per successful real frame decision and retain the existing case summary event.
- `governance.py`: retire the direct OpenScale writer if monitored deployments log automatically. Rewrite it only if IBM confirms explicit payload logging is required.
- `main.py` and deployment configuration: preferably submit a durable Code Engine Job instead of running long analysis inside a FastAPI background task.
- `audit_logs`: initially store the new fields in the existing `after_value` JSON field.
- Documentation and dependencies: remove old OpenScale setup/dependencies

## Failure and retry behavior

- Failed model calls must not create successful decision records.
- Save successful raw responses to COS so an audit write can be retried without calling the model again.
- Reuse stable run and decision IDs during persistence retries to avoid duplicate logical decisions.
- Allow for a short delay before deciding that a governance transaction is missing.

## Testing after implementation

Automated tests should run the real case-processing service with the IBM request mocked and prove that each successful frame produces a matching audit row with the correct IDs, model version, and timestamp.

A live IBM smoke test must then submit one real case, find its `decision_id` in both `audit_logs` and watsonx.governance, and compare the two records. This live check is necessary because mocks cannot prove IBM created the governance transaction.

## Confirmed implementation blockers

- **AI use case permissions:** creation returned `ASTSV3108E`, but still created entries owned by the client. We do not have permissions for these assets.
- **Project association:** the project says it is not associated with an AI use case, while the association screen shows no project resource to select.
- **Governance provisioning:** the data mart and production monitoring configuration have not been confirmed.

Implementation can begin after an administrator provides access, associates the project, produces a working monitored deployment, and confirms the fields visible in a real governance transaction.

## Essential sources

- [watsonx.governance and OpenScale overview](https://dataplatform.cloud.ibm.com/docs/content/svc-welcome/aiopenscale.html?context=wx)
- [Setting up watsonx.governance](https://dataplatform.cloud.ibm.com/docs/content/wsj/model/wos-setup-wos.html?context=wx)
- [Evaluate and track a prompt template](https://www.ibm.com/docs/en/watsonx/saas?topic=ai-evaluate-track-prompt-template#step04)
- [Associating workspaces with an AI use case](https://www.ibm.com/docs/en/watsonx/saas?topic=case-associating-workspaces-ai-use)
- [IBM Code Engine jobs](https://cloud.ibm.com/docs/codeengine?topic=codeengine-job-plan)

## Conclusion

The immediate next step is to correctely associate an AI use case with the project.
