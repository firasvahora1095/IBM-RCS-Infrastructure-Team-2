"""
 Ensure your watsonx.ai environment variables are configured before testing.
 This test requires a supported image file path.
 backend/scripts/watsonx_image_test.jpg

 The above image contains the following visible content:
  "A blue circle, yellow square, green triangle and benign test image text"
"""

import argparse
import json
from pathlib import Path

from ibm_watsonx_ai.wml_client_error import ApiRequestFailure
from dotenv import load_dotenv

from app.watsonx_image import analyse_image

REPO_PATH = Path(__file__).resolve().parents[2]

CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png"
}

TEST_PROMPT = """
Analyse this image and return a concise JSON object with the following fields:
summary, visible_objects, visible_text, risk_indicators and
requires_human_review. Use an empty list for risk_indicators when no obvious
safety concern is visible.
"""


def get_content_type(image_path):
    content_type = CONTENT_TYPES.get(image_path.suffix.lower())

    if not content_type:
        raise ValueError(
            f"Unsupported image extension: {image_path.suffix}"
        )

    return content_type


def test_watsonx_image():
    parser = argparse.ArgumentParser()
    parser.add_argument("image_file")
    arguments = parser.parse_args()

    image_path = Path(arguments.image_file)

    if not image_path.is_file():
        raise FileNotFoundError(
            f"Image file not found: {image_path}"
        )

    content_type = get_content_type(image_path)

    try:
        with image_path.open("rb") as image_file:
            result = analyse_image(
                image_file,
                content_type,
                TEST_PROMPT
            )
    except ApiRequestFailure as error:
        print(
            f"watsonx.ai image analysis failed with status "
            f"{error.response.status_code}: {error}"
        )
        raise SystemExit(1) from error

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    test_watsonx_image()
