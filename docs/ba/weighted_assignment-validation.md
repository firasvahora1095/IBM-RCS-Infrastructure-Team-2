# Validate Weighted-Assignment Behaviour Against Simulated Cases

## Objective

Run several simulated cases through the current backend assignment logic and confirm that the outcome matches the agreed Sprint 2 weighting behaviour.

## Test approach

A 10-case simulation was run against the project's existing backend assignment logic using an isolated in-memory SQLite database.

The simulation used three Auditors with different starting active-case workloads:

| Auditor | Starting active cases | Starting score |
|---|---:|---:|
| auditor-1 | 0 | 0.00 |
| auditor-2 | 1 | 0.04 |
| auditor-3 | 2 | 0.08 |

For the current Sprint 2 implementation, `exposure_minutes` is treated as `0`, so the assignment score is driven by the active case-ratio component.

The simulation used the project's existing assignment/orchestration flow rather than recreating the weighting formula separately.

## Command used

```bash
PYTHONPATH=. python scripts/T30_ASSIGNMENT_SIMULATION.py
```

## Observed results

| Simulated case | Assigned Auditor | Active cases before assignment | Score before assignment |
|---:|---|---:|---:|
| 1 | auditor-1 | 0 | 0.00 |
| 2 | auditor-2 | 1 | 0.04 |
| 3 | auditor-1 | 1 | 0.04 |
| 4 | auditor-3 | 2 | 0.08 |
| 5 | auditor-2 | 2 | 0.08 |
| 6 | auditor-1 | 2 | 0.08 |
| 7 | auditor-3 | 3 | 0.12 |
| 8 | auditor-2 | 3 | 0.12 |
| 9 | auditor-1 | 3 | 0.12 |
| 10 | auditor-3 | 4 | 0.16 |

### Assignment sequence

```text
auditor-1 -> auditor-2 -> auditor-1 -> auditor-3 -> auditor-2
-> auditor-1 -> auditor-3 -> auditor-2 -> auditor-1 -> auditor-3
```

### Final active-case counts

| Auditor | Final active cases | Final score |
|---|---:|---:|
| auditor-1 | 4 | 0.16 |
| auditor-2 | 4 | 0.16 |
| auditor-3 | 5 | 0.20 |

## Validation result

**PASS**

The simulation confirmed that the Auditor with the lower current case-ratio score is selected first. After each assignment, workload changes are reflected in subsequent decisions. Where candidates have equal scores, the current tie-break behaviour distributes assignments rather than repeatedly selecting the same Auditor.

The observed behaviour matches the agreed Sprint 2 weighted-assignment requirement.


## Evidence

Terminal output from the local simulation run on 26 September 2026 can be retained as supporting evidence.
