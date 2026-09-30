"""
Demo seed script — populates the DB with realistic cases for demo/UAT.

Covers every major flow:
  - Normal review → Complete (S1, S2)
  - Decline → Manager reassign
  - SOS → Manager acknowledge + follow-up
  - S3/S4 auto-cooldown after case complete
  - Exposure APPROACHING limit
  - Exposure AT_LIMIT (excluded from assignment)
  - Wellbeing check-in flow

Run from backend/:
    source .venv/bin/activate
    python scripts/seed_demo.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from app.models import Auditor, Case, AuditLog, Base
from app.db import engine, SessionLocal
from app.auth import hash_password
from app.case_ids import generate_case_id

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ── Wipe existing demo data ──────────────────────────────────────────────────
try:
    db.execute(text("DELETE FROM frame_analyses"))
except Exception:
    pass
db.query(AuditLog).delete()
db.query(Case).delete()
db.query(Auditor).delete()
db.commit()

now = datetime.now(timezone.utc)

# ── Auditors ─────────────────────────────────────────────────────────────────

a1 = Auditor(
    auditor_id="auditor-01",
    login_hash=hash_password("test123"),
    role="auditor",
    exposure_minutes=45.0,
    active_case_count=2,
)

a2 = Auditor(
    auditor_id="auditor-02",
    login_hash=hash_password("test123"),
    role="auditor",
    exposure_minutes=30.0,
    active_case_count=1,
)

a3 = Auditor(
    auditor_id="auditor-03",
    login_hash=hash_password("test123"),
    role="auditor",
    exposure_minutes=110.0,
    active_case_count=1,
)

a4 = Auditor(
    auditor_id="auditor-04",
    login_hash=hash_password("test123"),
    role="auditor",
    exposure_minutes=120.0,
    active_case_count=0,
)

m1 = Auditor(
    auditor_id="manager-01",
    login_hash=hash_password("test123"),
    role="manager",
)

db.add_all([a1, a2, a3, a4, m1])
db.commit()

# ── Helpers ───────────────────────────────────────────────────────────────────

def timeline(entries):
    return [{"start": s, "end": e, "severity_tier": tier, "tag": tag} for s, e, tier, tag in entries]

def entities(items):
    return [{"label": l, "start": s, "end": e} for l, s, e in items]

transcript_sample = [
    {"time": 0.0, "text": "Stop, you need to calm down."},
    {"time": 4.1, "text": "I said stop! Back away now."},
    {"time": 8.0, "text": "Get on the ground! Now!"},
    {"time": 15.0, "text": "Do not resist. Stay on the ground."},
    {"time": 22.0, "text": "Backup is on the way. Stay calm."},
]

audio_sample = [0.2, 0.3, 0.5, 0.7, 0.9, 0.85, 0.6, 0.4, 0.3, 0.2]

# ── Cases ─────────────────────────────────────────────────────────────────────

# FLOW 1: auditor-01 — S1 No Violation
c1 = Case(
    case_id=generate_case_id(),
    status="READY_FOR_REVIEW",
    assigned_auditor_id="auditor-01",
    watson_severity_score=10,
    effective_severity_score=10,
    severity_tier="S1",
    narrative_summary=(
        "The footage shows a routine traffic stop with no significant use of force. "
        "The officer maintained professional conduct throughout. No policy violations identified."
    ),
    incident_timeline=timeline([
        (0, 0, "S1", "Officer approaches vehicle"),
        (30, 30, "S1", "Driver complies"),
        (90, 90, "S1", "Traffic stop concluded"),
    ]),
    flagged_entities=entities([("Vehicle", 0.0, 90.0)]),
    transcript=transcript_sample,
    audio_intensity=audio_sample,
    video_duration_seconds=95.0,
    video_storage_path="/tmp/ibm-rcs-uploads/demo-s1.mp4",
)

# FLOW 2: auditor-01 — S2 Minor Violation with override
c2 = Case(
    case_id=generate_case_id(),
    status="READY_FOR_REVIEW",
    assigned_auditor_id="auditor-01",
    watson_severity_score=35,
    effective_severity_score=35,
    severity_tier="S2",
    narrative_summary=(
        "Minor use of force observed. Officer used a firm grip to restrain the subject "
        "who was resisting. The force level appears proportionate but warrants documentation."
    ),
    incident_timeline=timeline([
        (0, 0, "S2", "Verbal confrontation begins"),
        (45, 45, "S2", "Subject resists"),
        (60, 75, "S2", "Physical restraint applied"),
        (120, 120, "S1", "Situation de-escalates"),
    ]),
    flagged_entities=entities([
        ("Physical restraint", 60.0, 90.0),
        ("Verbal resistance", 45.0, 60.0),
    ]),
    transcript=transcript_sample,
    audio_intensity=audio_sample,
    video_duration_seconds=130.0,
    video_storage_path="/tmp/ibm-rcs-uploads/demo-s2.mp4",
)

# FLOW 3: auditor-01 — S3 Decline → manager reassign
c3 = Case(
    case_id=generate_case_id(),
    status="READY_FOR_REVIEW",
    assigned_auditor_id="auditor-01",
    watson_severity_score=65,
    effective_severity_score=65,
    severity_tier="S3",
    narrative_summary=(
        "Significant use of force observed. Officer deployed pepper spray following "
        "prolonged struggle. Subject sustained minor injuries. Review required."
    ),
    incident_timeline=timeline([
        (0, 0, "S2", "Officer responds to disturbance"),
        (20, 20, "S3", "Subject becomes aggressive"),
        (55, 58, "S3", "Pepper spray deployed"),
        (75, 75, "S2", "Backup arrives"),
        (110, 110, "S2", "Subject detained"),
    ]),
    flagged_entities=entities([
        ("Pepper spray deployment", 55.0, 60.0),
        ("Aggressive subject", 20.0, 55.0),
    ]),
    transcript=transcript_sample,
    audio_intensity=audio_sample,
    video_duration_seconds=120.0,
    video_storage_path="/tmp/ibm-rcs-uploads/demo-s3-decline.mp4",
)

# FLOW 4: auditor-02 — S4 SOS demo
c4 = Case(
    case_id=generate_case_id(),
    status="READY_FOR_REVIEW",
    assigned_auditor_id="auditor-02",
    watson_severity_score=85,
    effective_severity_score=85,
    severity_tier="S4",
    narrative_summary=(
        "Severe use of force. Multiple officers involved in subduing an unarmed subject. "
        "Baton strikes observed. Subject required medical attention. Immediate review warranted."
    ),
    incident_timeline=timeline([
        (0, 0, "S2", "Officers respond to call"),
        (15, 15, "S2", "Subject flees on foot"),
        (30, 30, "S3", "Takedown initiated"),
        (45, 65, "S4", "Baton strikes observed"),
        (70, 70, "S3", "Subject restrained, medical called"),
    ]),
    flagged_entities=entities([
        ("Baton strikes", 45.0, 65.0),
        ("Takedown", 30.0, 45.0),
        ("Unarmed subject", 0.0, 70.0),
    ]),
    transcript=transcript_sample,
    audio_intensity=audio_sample,
    video_duration_seconds=80.0,
    video_storage_path="/tmp/ibm-rcs-uploads/demo-s4-sos.mp4",
)

# FLOW 5: auditor-03 — S3, APPROACHING limit
c5 = Case(
    case_id=generate_case_id(),
    status="READY_FOR_REVIEW",
    assigned_auditor_id="auditor-03",
    watson_severity_score=60,
    effective_severity_score=60,
    severity_tier="S3",
    narrative_summary=(
        "Use of force incident during arrest. Officer used a chokehold briefly before "
        "transitioning to approved restraint technique. Borderline compliance with policy."
    ),
    incident_timeline=timeline([
        (0, 0, "S2", "Arrest attempt begins"),
        (25, 25, "S3", "Subject resists"),
        (40, 50, "S4", "Chokehold applied briefly"),
        (50, 60, "S2", "Transition to approved restraint"),
        (90, 90, "S1", "Subject detained"),
    ]),
    flagged_entities=entities([
        ("Chokehold", 40.0, 50.0),
        ("Resistance", 25.0, 40.0),
    ]),
    transcript=transcript_sample,
    audio_intensity=audio_sample,
    video_duration_seconds=95.0,
    video_storage_path="/tmp/ibm-rcs-uploads/demo-s3-approaching.mp4",
)

# FLOW 6: auditor-01 — already COMPLETED
c6 = Case(
    case_id=generate_case_id(),
    status="COMPLETE",
    assigned_auditor_id="auditor-01",
    watson_severity_score=30,
    effective_severity_score=30,
    severity_tier="S2",
    auditor_severity_score=25,
    auditor_comment="Officer acted within policy. Minor force proportionate to situation.",
    final_outcome="NO_VIOLATION_FOUND",
    narrative_summary="Completed case — minor restraint, no violation found.",
    incident_timeline=timeline([(0, 0, "S2", "Incident begins"), (60, 60, "S1", "Resolved")]),
    flagged_entities=[],
    transcript=transcript_sample,
    audio_intensity=audio_sample,
    video_duration_seconds=70.0,
    video_storage_path="/tmp/ibm-rcs-uploads/demo-completed.mp4",
    completed_at=now - timedelta(hours=2),
)

# FLOW 7: DECLINED → manager reassignment queue
c7 = Case(
    case_id=generate_case_id(),
    status="DECLINED",
    assigned_auditor_id=None,
    watson_severity_score=70,
    effective_severity_score=70,
    severity_tier="S3",
    manager_flag="DECLINED",
    narrative_summary=(
        "Case was declined by original auditor due to personal trigger. "
        "Awaiting reassignment by manager."
    ),
    incident_timeline=timeline([
        (0, 0, "S3", "Incident begins"),
        (30, 45, "S3", "Force applied"),
        (60, 60, "S2", "Scene secured"),
    ]),
    flagged_entities=entities([("Use of force", 30.0, 60.0)]),
    transcript=transcript_sample,
    audio_intensity=audio_sample,
    video_duration_seconds=75.0,
    video_storage_path="/tmp/ibm-rcs-uploads/demo-declined.mp4",
)

db.add_all([c1, c2, c3, c4, c5, c6, c7])
db.commit()

print()
print("Demo seed complete.")
print()
print("Accounts:")
print("  auditor-01 / test123  — 2 active cases (S1, S2, S3), 45 min exposure")
print("  auditor-02 / test123  — 1 active case (S4 SOS demo), 30 min exposure")
print("  auditor-03 / test123  — 1 active case (S3), 110 min exposure (APPROACHING)")
print("  auditor-04 / test123  — 0 cases, 120 min (AT_LIMIT, excluded from assignment)")
print("  manager-01 / test123  — manager dashboard")
print()
print("Cases:")
print(f"  {c1.case_id}  auditor-01  S1 READY_FOR_REVIEW  → demo: Complete (no violation)")
print(f"  {c2.case_id}  auditor-01  S2 READY_FOR_REVIEW  → demo: Complete with override")
print(f"  {c3.case_id}  auditor-01  S3 READY_FOR_REVIEW  → demo: Decline → manager reassign")
print(f"  {c4.case_id}  auditor-02  S4 READY_FOR_REVIEW  → demo: SOS → manager banner")
print(f"  {c5.case_id}  auditor-03  S3 READY_FOR_REVIEW  → demo: exposure APPROACHING")
print(f"  {c6.case_id}  auditor-01  S2 COMPLETE          → demo: completed case history")
print(f"  {c7.case_id}  (unassigned) S3 DECLINED         → demo: manager reassignment queue")
