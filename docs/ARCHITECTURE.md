# Initial Architecture

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
    ├── original/
    │   └── video.mp4
    ├── processed/
    │   └── blur-greyscale-video.mp4
    ├── metadata/
    │   └── case.json
    ├── analysis/
    │   ├── transcript.json
    │   └── severity-rating.json
    └── review/
        ├── assessment.json
        └── decision.json

Note: caseId could be kept simple with iterative numbering (001, 002) or use generated ids.
```
Considerations:
- The original video should be kept seperate to processed versions
- Case Id's need to be unique
- The generated severity and transcriptis kept seperate, stored in analysis
- Auditor decisions and assessment are kept seperate, stored in review.
- case.json keeps track of all relevant details to the case, including its current status

### watsonx.ai
Responsible for:
- AI/ML processing and experimentation

### watsonx Orchestrate
Responsible for:
- Workflow orchestration
- Assignment workflow integration

## Open Items

- Exact AI failure fallback behaviour
- Final AI severity scoring format
- Final infrastructure deployment topology