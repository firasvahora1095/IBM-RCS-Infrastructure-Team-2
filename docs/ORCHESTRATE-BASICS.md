# watsonx Orchestrate – Basic Workflow Concepts

## Purpose

This document records the basic watsonx Orchestrate workflow concepts required for designing the Team 2 case-assignment workflow.

## Core Workflow Concepts

### Trigger

A trigger starts the workflow when a defined event occurs.

For the proposed case-assignment workflow:

- A new case is submitted.
- The case becomes ready for assignment.
- The assignment workflow begins automatically.

### Conditions

Conditions determine which path the workflow should follow.

Possible assignment conditions include:

- Is the auditor available?
- Is the auditor below the daily exposure limit?
- What is the auditor's current accumulated exposure time?
- How many cases are currently assigned to the auditor?
- Is another auditor more suitable based on the assignment weighting?

The current testing exposure limit is:

120 minutes per auditor per day.

### Actions

Actions are operations performed by the workflow after conditions are evaluated.

Planned actions include:

1. Retrieve available auditors.
2. Check each auditor's exposure time.
3. Check current case count.
4. Apply the assignment weighting.
5. Select an auditor using round-robin distribution.
6. Assign the case.
7. Update the case status.
8. Trigger the AI-processing pipeline automatically.
9. Record the assignment result.

## Proposed Assignment Flow

New Case Submitted
        ↓
Retrieve Available Auditors
        ↓
Check Exposure + Case Count
        ↓
Remove Auditors Above Exposure Limit
        ↓
Apply Weighted Round-Robin Selection
        ↓
Assign Case to Auditor
        ↓
Update Case Status
        ↓
Trigger AI Processing

## Client-Confirmed Assignment Rules

- Exposure is measured primarily by viewing/exposure time.
- Testing exposure limit is 120 minutes per auditor per day.
- Assignment considers exposure level and case count.
- Cases should be distributed using a round-robin style approach.
- Reviewer wellbeing takes priority over moderation speed.
- AI processing should automatically begin after assignment.

## Current Scope

This task documents the workflow concepts only.

The complete assignment workflow and production integration will be implemented in later development tasks.