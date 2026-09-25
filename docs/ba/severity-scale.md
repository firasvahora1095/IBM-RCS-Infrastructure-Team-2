# Severity Scale & Tag Taxonomy — Sprint 1 Week 3

**Deliverable:** [Severity Scale & Tag Taxonomy](https://docs.google.com/document/d/1EQ7YpDvFfqxOWtncI1r5vEsthtMFqOUxxO0hHtv9XMM/edit?usp=sharing)

Defines the Sprint 2 CVI severity framework, proposed visual tags and weapon-use severity floor, frame-level AI output fields, audio treatment and validation approach, including items requiring team or Dev confirmation.

**SEVERITY SCALE &**  
    **TAG TAXONOMY**

**IBM RCS Infrastructure — Team 2**

**Sprint 1 — Week 3**

| Owner | Janataarah Begum |
| :---- | :---- |
| **Task** | **Severity Scale — Week 3** |
| **Scope** | **CVI severity tiers, tag taxonomy, audio treatment, AI validation approach** |
| **Primary references** | **AR-WB-11 · AR-WB-15 · AR-AI-06 · MR-OV-08 · CV-10 · docs/WATSONX\_AI.md** |
| **Document status** | **Working draft — team confirmation pending** |

***Sprint 2 severity model***


**1\. Purpose**

To summarise the Sprint 2 severity model and the Week 3 decisions needed for implementation. The master Requirements document remains the source of truth for formal requirements; this document provides the working severity scale, proposed visual tags, audio treatment and validation approach.

**Baseline note**

The 0–100 CVI bands and worst-tier-wins calculation method are already part of the project baseline. The remaining Week 3 work focuses on tag handling, the narrow tag-floor proposal and audio-to-CVI treatment. The validation acceptance metric and pass/fail threshold are deferred to Sprint 3 after sufficient continuous pipeline testing.

**2\. Severity Scale**

The numerical CVI ranges are already approved. The plain-English descriptions below are proposed wording for consistent AI prompting and UX explanation.

| Tier | CVI range | Working definition |
| :---- | :---- | :---- |
| **S1 — Low** | **0–39** | **Minimal or negligible indicators of violence, threat or immediate harm.** |
| **S2 — Moderate** | **40–64** | **Aggressive or confrontational behaviour with some potential for harm, but no clear serious or immediate harm.** |
| **S3 — High** | **65–84** | **Clear violence, credible threat, visible injury or other strong indicators of plausible harm.** |
| **S4 — Critical** | **85–100** | **Serious violence or a clear/immediate risk of serious harm, including severe injury or serious weapon-related harm.** |
| **Severity calculation: the overall case severity uses the highest severity tier reached by any flagged incident rather than averaging severity across the full video.** |  |  |

**3\. Proposed Visual Tags**

The five visual tags below are proposed for Aiden’s Sprint 2 watsonx prompt/schema. verbal\_aggression is kept separate because it depends on STT/audio rather than visual analysis.

| Tag | Meaning |
| :---- | :---- |
| **physical\_violence** | **Hitting, punching, kicking, pushing, grappling or fighting.** |
| **weapon\_present** | **A visible object appears to be a weapon within the relevant incident.** |
| **weapon\_use** | **A weapon appears to be actively used, brandished or used to threaten.** |
| **visible\_injury** | **Visible signs of injury, wounds, blood or physical harm.** |
| **multi\_person\_conflict** | **Aggressive or violent conflict involving multiple people.** |

verbal\_aggression is not part of the visual CVI tag set. If STT/audio derives this signal, it may be shown as supporting Auditor evidence.

All five tags above are visual/frame-based only — none are derived from the transcript or audio track (see Section 4: automated CVI remains visual-only). Any reference to a “credible threat” means a visually credible threat specifically, since verbal\_aggression and other audio-only signals never factor into the automated score.

**How tags affect severity**

Tags provide evidence for the CVI assessment rather than being directly mapped to fixed CVI values.

| Proposed hybrid rule: most tags remain context-dependent. A qualifying weapon\_use detection applies a minimum S3 (High) floor. If watson\_severity\_score is below 65, effective\_severity\_score is raised to 65 so the tier and numeric score remain consistent; watson\_severity\_score itself is never altered. S4 still depends on the overall context and severity. |
| :---- |

 

* Staged, toy or misleading weapon-related detections should not automatically trigger the S3 floor.  
* **Qualification mechanism:** to be confirmed with Aiden against the implemented watsonx output/schema. No arbitrary confidence percentage is set in this draft.  
* **Known limitation** — single-frame severity risk: because case-level severity uses worst-tier-wins across independently-analysed frames (Section 2), a single frame that visually resembles a high-severity moment (e.g. a static pose mid-motion, an object that looks weapon-like out of context) could set the whole case’s automated severity, even without genuine sustained threat. This is a known tradeoff of frame-independent analysis, not something Sprint 2’s schema corrects for — no cross-frame motion/context reasoning is planned. Mitigation: the Auditor’s mandatory human review — including the per-frame reasoning field and CVI override (AR-AI-07) — is the safeguard against an isolated misleading frame, not an automated confidence check. Revisit only if real pipeline testing shows this happening often in practice.

**Proposed AI output fields**

| Field | Purpose |
| :---- | :---- |
| **tags** | **Detected visual harm categories used as evidence for the CVI assessment.** |
| **watson\_severity\_score** | **Raw CVI score (0–100) exactly as generated by the watsonx model, before any tag-floor adjustment. Never modified after generation — preserved for validation/testing traceability (CV-10/MR-OV-08).** |
| **effective\_severity\_score** | **CVI score (0–100) after the weapon\_use minimum-S3-floor rule (Section 3\) is applied. This is the score severity\_tier is derived from and the score shown to the Auditor as the AI’s suggestion.** |
| **severity\_tier** | **S1, S2, S3 or S4 derived from effective\_severity\_score.** |
| **reasoning** | **Short explanation of the evidence/context behind the score.** |
| **timestamp** | **Identifies the point in the source video corresponding to the analysed frame, supporting the timestamped incident timeline required by AR-AI-03/04.** |
| **frame\_num** | **Sequential index of the analysed frame within the case (e.g. frame-00003), independent of timestamp. Purpose: a stable, human-readable reference for QA/testing and cross-referencing frame-level output rows.** |
| **entities** | **Flagged entities detected in the frame, such as people, weapons or other objects of interest, associated with the frame timestamp. Exact structure remains to be confirmed with Aiden against the implemented output.** |

**Note:** auditor\_severity\_score is not part of this per-frame AI output schema — it’s the Auditor’s own case-level adjusted rating, captured separately per AR-AI-07/AR-AI-08 once a human has reviewed the case. Keep the two naming schemes distinct.

**Scope clarification**: For the frame-level Sprint 2 schema, the tags, watson\_severity\_score, effective\_severity\_score, severity\_tier, reasoning, timestamp, frame\_num and entities fields above are produced per analysed/extracted frame, not once per case. Case-level severity is derived separately by applying the worst-tier-wins rule in Section 2 across all per-frame results. Exact schema naming and structure remain subject to confirmation against Aiden’s implemented watsonx output.

**4\. Audio Treatment**

For Sprint 2, the proposed approach is:

• Automated CVI remains visual-only.

• STT transcripts and the timestamped audio-intensity graph remain available to the Auditor as supporting information.

• Audio/STT does not automatically change the CVI score, but the Auditor may consider it when deciding whether to override the AI-generated severity.

• Automated audio-to-CVI fusion is deferred as a future enhancement.

**5\. Validation**

The AI severity output will be compared against a manually labelled ground-truth set using the project’s synthetic/staged footage.

1\. Select representative validation footage.

2\. Manually assign the expected S1–S4 severity.

3\. Run the same footage through the Sprint 2 AI pipeline.

4\. Compare the AI prediction with the manual ground truth.

5\. Display the comparison graphically in the Manager validation view.

 

| The current suggestion of approximately 10–20 clips is an MVP/demo-scale starting point only. The validation acceptance metric and pass/fail threshold are deferred to Sprint 3, after sufficient continuous pipeline testing and real validation results are available. No preliminary figure, including 90% recall, is adopted for Sprint 2\. |
| :---- |

**Limitation:** the initial \~10–20 clip validation set is sufficient to demonstrate the pipeline functioning end-to-end, but represents a limited range of weapon types, actor appearances, lighting conditions and camera angles. A defensible accuracy figure at production scale would need a materially larger and more diverse ground-truth set. Future extension (post-MVP): expand the validation set’s environmental/scenario diversity once more synthetic/staged footage can be sourced or generated.  
 

   
