-- IBM RCS Infrastructure - Team 2
-- Sprint 2 Week 1 database schema
-- Field names cross-checked against backend/schemas/frame-analysis.schema.json
-- and sprint2_plan_final_updated.md's "Database schema" table.

CREATE TABLE IF NOT EXISTS auditors (
    auditor_id VARCHAR(50) PRIMARY KEY,
    login_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'auditor',
    active_case_count INTEGER NOT NULL DEFAULT 0,  -- used by T17's case_ratio
    exposure_minutes INTEGER NOT NULL DEFAULT 0,   -- pinned to 0 in Sprint 2 per AR-AS-02
    last_assigned_at TIMESTAMPTZ,                  -- round-robin tie-break (T17)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cases (
    case_id VARCHAR(20) PRIMARY KEY,               -- non-sequential/non-guessable, UR-ID-08
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    -- SUBMITTED -> AI_PROCESSING -> READY_FOR_REVIEW -> AUDITOR_REVIEW -> COMPLETE
    assigned_auditor VARCHAR(50) REFERENCES auditors(auditor_id),
    video_storage_path TEXT,

    -- Case-level aggregated AI output (worst-tier-wins across frame_analyses)
    watson_severity_score INTEGER,                  -- raw score from the highest-severity frame
    effective_severity_score INTEGER,               -- after weapon_use floor rule
    severity_tier VARCHAR(2),                        -- S1 / S2 / S3 / S4
    narrative_summary TEXT,
    incident_timeline JSONB,                         -- [{start, end, severity_tier}, ...]

    -- Auditor resolution
    auditor_severity_score INTEGER,                  -- Auditor's adjusted score, if overridden
    auditor_comment TEXT,
    final_outcome VARCHAR(50),                        -- locked value set from Jana's T6

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- One row per analysed frame, mirrors frame-analysis.schema.json exactly
CREATE TABLE IF NOT EXISTS frame_analyses (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(20) NOT NULL REFERENCES cases(case_id),
    frame_num VARCHAR(20) NOT NULL,                  -- e.g. "frame-00003"
    timestamp DOUBLE PRECISION NOT NULL,              -- seconds from video start
    tags TEXT[] NOT NULL DEFAULT '{}',                -- physical_violence, weapon_present, etc.
    watson_severity_score INTEGER NOT NULL,
    effective_severity_score INTEGER NOT NULL,
    severity_tier VARCHAR(2) NOT NULL,
    reasoning TEXT NOT NULL,
    entities TEXT[] NOT NULL DEFAULT '{}',

    -- audit sub-object fields, flattened
    model_id VARCHAR(100) NOT NULL,
    model_version VARCHAR(50),
    prompt_version VARCHAR(20) NOT NULL,
    decision_timestamp TIMESTAMPTZ NOT NULL,

    UNIQUE (case_id, frame_num)
);

-- AR-AI-12: timestamped audit history of changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(20) NOT NULL REFERENCES cases(case_id),
    actor VARCHAR(50) NOT NULL,                       -- 'system' or an auditor_id
    action VARCHAR(50) NOT NULL,                       -- ASSIGNED, AI_DECISION, OVERRIDE, RESOLVED
    before_value JSONB,
    after_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cases_assigned_auditor ON cases(assigned_auditor);
CREATE INDEX IF NOT EXISTS idx_frame_analyses_case_id ON frame_analyses(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON audit_logs(case_id);
