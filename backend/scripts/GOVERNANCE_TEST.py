"""
Ensure the watsonx.governance environment variables are configured before
testing. This test sends a synthetic frame analysis record to the configured
OpenScale payload logging data set.
"""

import json

from app.governance import log_analysis_result
from app.severity import build_frame_analysis


def main():
    model_output = {
        "tags": ["physical_violence"],
        "watson_severity_score": 72,
        "reasoning": "Two people appear to be physically fighting.",
        "entities": ["person", "person"],
    }

    analysis_result = build_frame_analysis(
        model_output=model_output,
        case_id="governance-test-case",
        frame_num="frame-00001",
        timestamp=1.5,
        model_id="test-model",
        model_version="test-version",
        prompt_version="1.0",
    )

    print("Record being sent:")
    print(json.dumps(analysis_result, indent=2))

    result = log_analysis_result(analysis_result)

    print("\nGovernance response:")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
