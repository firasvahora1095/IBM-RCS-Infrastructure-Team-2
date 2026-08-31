# Watsonx.ai Image Analysis

## Overview

`backend/app/watsonx_image.py` provides the reusable connection between the backend and IBM watsonx.ai for image analysis.
It:

* reads the watsonx.ai credentials, project ID and vision model from environment variables;
* creates an authenticated `ModelInference` client;
* validates that the uploaded file is a PNG or JPEG image and that its contents match the declared content type;
* base64 encodes the image;
* sends the image and analysis prompt to the configured watsonx.ai vision model; and
* returns the selected model, extracted analysis and original watsonx.ai response.

The script does not permanently save the image or analysis result. It returns a Python dictionary that another part of the backend can use.

## Configuration

The following variables must be configured in `.env`:

```dotenv
WATSONX_API_KEY=
WATSONX_URL=
WATSONX_VISION_MODEL_ID=
WATSONX_PROJECT_ID=
```

## Reuse

Import `analyse_image` wherever the backend needs to analyse an image:

```python
from app.watsonx_image import analyse_image

with open("test.jpg", "rb") as image_file:
    result = analyse_image(
        image_file,
        "image/jpeg",
        "Describe the visible content in this image."
    )

analysis = result["analysis"]
```

The function accepts an open image stream, its content type and an analysis prompt, so it can be reused with local or uploaded files.

Supported content types are:

* `image/jpeg`
* `image/png`

Before the image is sent to watsonx.ai, the function checks the file signature to confirm that its contents match the declared content type.

### Scalability

The current implementation uses the synchronous `ModelInference.chat()` method. This is appropriate for the initial implementation because each image can be sent to watsonx.ai and its analysis returned directly to the caller. However, the backend request remains blocked while the remote model performs inference.

For improved scalability, the watsonx.ai Python SDK also provides the asynchronous `achat()` method. The reusable image analysis function could therefore be converted to an asynchronous function and the model request changed from:

```python
response = client.chat(
    messages=messages,
    params=params
)
```

to:

```python
response = await client.achat(
    messages=messages,
    params=params
)
```

The calling FastAPI endpoint could then use `await analyse_image(...)`. This would allow the application to perform other work while waiting for the watsonx.ai network request rather than blocking the worker handling the request.

As the system expands to analyse multiple images or frames from multiple reported videos, asynchronous requests could also allow independent images to be processed concurrently. Concurrency should still be controlled to remain within watsonx.ai service limits rather than submitting an unrestricted number of model requests at once.

### Model Selection

The image analysis model is configured through `WATSONX_VISION_MODEL_ID`, allowing different multimodal models to be tested without changing the reusable image analysis code.

The current implementation uses **Meta Llama 4 Maverick**. Llama 4 Maverick is a multimodal model designed for both text and image input and is suited to general visual recognition, image reasoning, captioning and answering questions about image content. These capabilities make it a suitable initial model for analysing reported online content, where images may contain a combination of people, objects, scenes and visible text.

The current model can be configured as:

```dotenv
WATSONX_VISION_MODEL_ID=meta-llama/llama-4-maverick-17b-128e-instruct-fp8
```

IBM Granite Vision should also be evaluated during later development. Granite Vision supports general image analysis but is particularly focused on visual document understanding, including tables, charts, diagrams and structured visual information.

The project should therefore compare Llama 4 Maverick and the Granite Vision model using test images later in development. The comparison should evaluate how reliably each model identifies relevant visual information and produces the structured fields required by the moderation pipeline.

## Testing

`backend/scripts/watsonx_image_test.py` is a manual integration test that sends an image to the watsonx.ai service and prints the returned JSON. From the `backend` directory, run:

```bash
python scripts/watsonx_image_test.py <image.file>
```

Note: `backend/scripts/watsonx_image_test.jpg` is intended for testing purposes only.

The test requires the watsonx.ai environment variables, network access and a supported PNG or JPEG image. The included test prompt requests a concise JSON response containing `summary`, `visible_objects`, `visible_text`, `risk_indicators` and `requires_human_review`.

A successful result prints:

* the configured vision model;
* the extracted image analysis; and
* the original watsonx.ai response.
