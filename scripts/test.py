"""
Validate schemas/frame-analysis.example.json against
schemas/frame-analysis.schema.json.

Confirms the required fields and data types Aiden's watsonx.ai output
schema defines are actually satisfied by a real sample payload.
"""

import json
from pathlib import Path

import jsonschema

ROOT = Path(__file__).resolve().parent.parent

SCHEMA_PATH = ROOT / "backend" / "schemas" / "frame-analysis.schema.json"
EXAMPLE_PATH = ROOT / "backend" / "schemas" / "frame-analysis.example.json"


def test_schema():
    schema = json.loads(SCHEMA_PATH.read_text())
    example = json.loads(EXAMPLE_PATH.read_text())

    print("Schema:", SCHEMA_PATH)
    print("Sample data:", EXAMPLE_PATH)
    print()
    print("Sample data being validated:")
    print(json.dumps(example, indent=2))
    print()

    try:
        jsonschema.validate(example, schema)
    except jsonschema.exceptions.ValidationError as error:
        print("FAILED - sample data does not match schema")
        print(f"Reason: {error.message}")
        print(f"Path: {list(error.absolute_path)}")
        raise SystemExit(1) from error

    print("PASSED - sample data matches all required fields and types")


if __name__ == "__main__":
    test_schema()
