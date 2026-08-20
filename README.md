# IBM RCS Infrastructure – Team 2

RMIT x IBM capstone project focused on building an AI-assisted content moderation platform with reviewer wellbeing controls.

## Project Overview

The platform will support a case lifecycle where submitted content is assigned to an auditor, processed through an AI pipeline, reviewed by the auditor, and submitted to a manager for final review.

The client-confirmed high-level flow is:

Submitted → Assigned → AI Processing → Under Review → Manager Review → Completed

## Core Project Goals

- AI-assisted analysis of uploaded content
- Auditor case assignment
- Exposure-time tracking
- Reviewer wellbeing controls
- Auditor override of AI classifications
- Manager review and escalation workflows
- Ground-truth accuracy reporting

## Assignment Logic

Case assignment will consider:

- Auditor accumulated exposure time
- Auditor case count
- Round-robin distribution

The current testing exposure limit is 120 minutes per auditor per day.

## Technology Direction

The client recommended:

- Frontend: React
- Backend: Python
- IBM watsonx services
- IBM Cloud Object Storage
- watsonx Orchestrate

These technology choices may evolve as the project progresses.

## Repository Structure

```text
frontend/     Frontend application
backend/      Backend services and assignment logic
docs/         Architecture, requirements and technical documentation
scripts/      Development and deployment utilities
.github/      GitHub Actions workflows