-- Test-only seed data, applied automatically on fresh container init
-- (see Dockerfile.testcombined). Not for real deployment.

INSERT INTO auditors (auditor_id, login_hash, role)
VALUES ('auditor-1', '$2b$12$F.pgzdJviaXubIjODAhBje7/kUu9gS1h0e3P1OnKfAFMNKo0B1ey2', 'auditor')
ON CONFLICT (auditor_id) DO NOTHING;
