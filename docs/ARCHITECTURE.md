# Architecture

## High-Level Flow

1. User submits media/content.
2. A case record is created.
3. Assignment logic selects an available auditor.
4. AI processing is triggered automatically.
5. Auditor reviews the processed case.
6. Auditor may accept or override the AI assessment.
7. Auditor submits comments and rating to the manager.
8. Manager reviews and completes or reassigns the case.

## Assignment Logic

The initial assignment approach will use:

- Current auditor exposure time
- Current auditor case count
- Round-robin distribution

Testing exposure limit:

120 minutes per auditor per day.

Reviewer wellbeing takes priority over moderation speed.

## Planned Components

### Frontend
Responsible for:
- User interface
- Auditor interface
- Manager interface

### Backend
Responsible for:
- Case lifecycle
- Assignment logic
- Exposure tracking
- AI pipeline orchestration
- Manager escalation

### IBM Cloud Object Storage
Responsible for:
- Uploaded media
- Processed artefacts

Folder Structure:
```
cases/
└── {caseId}/
    ├── source.mp4
    ├── processed/
    │   └── blur-greyscale-video.mp4
    ├── metadata/
    │   └── case.json
    ├── analysis-output/
    │   ├── frame-00000.raw.json
    │   ├── frame-00000.analysis.json
    │   ├── ...
    │   ├── case-analysis.json
    │   └── manifest.json
    ├── analysis/
    │   └── transcript.json
    └── review/
        ├── assessment.json
        └── decision.json

Note: caseId will use generated ids rather than iterative numbering.
```
Considerations:
- The original video is kept separate from processed versions.
- Case IDs are unique and non-sequential.
- Each raw watsonx response is preserved separately from the backend-normalized result.
- Generated analysis remains separate from Auditor decisions and assessments.
- Database case state points to the internal analysis-output path; the raw response is not returned by public APIs.

### watsonx.ai
Responsible for:
- Per-frame visual tags, raw CVI score, reasoning and entities
- AI/ML processing and experimentation

### watsonx Orchestrate
Responsible for:
- Workflow orchestration
- Assignment workflow integration

## Open Items

- Final infrastructure deployment topology