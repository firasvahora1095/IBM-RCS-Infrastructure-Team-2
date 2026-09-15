"""
Ensure the local Postgres container is running (see docker run command in
backend/schemas/db_schema.sql's usage notes) and DATABASE_URL is set in
.env before testing.

Confirms the backend can connect to Postgres and that the expected tables
exist.
"""

from sqlalchemy import text

from app.db import engine

EXPECTED_TABLES = {"auditors", "cases", "frame_analyses", "audit_logs"}


def main():
    with engine.connect() as connection:
        result = connection.execute(
            text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public'"
            )
        )
        found_tables = {row[0] for row in result}

    print("Tables found:", found_tables)

    missing = EXPECTED_TABLES - found_tables
    if missing:
        print(f"FAILED - missing tables: {missing}")
        raise SystemExit(1)

    print("PASSED - connected and all expected tables exist")


if __name__ == "__main__":
    main()
