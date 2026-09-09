Frame Extraction Research

For the MVP, the proposed approach is to use Python with OpenCV to extract frames from uploaded video files.

OpenCV is suitable because it can read common video formats, access video frames directly, and save selected frames as image files for later AI analysis.

For the MVP test, the script will extract one frame every 5 seconds for review and downstream AI analysis. This keeps the prototype simple while still producing enough visual samples for testing the AI pipeline.

The planned flow is:

Video file → OpenCV reads video → Frames extracted at fixed intervals → Frames saved to an output folder → Later passed to watsonx.ai for analysis.

For the current test, extracted frames will be saved locally using harmless synthetic/sample footage only. The script will not yet be integrated into the FastAPI backend, PostgreSQL database, IBM Cloud Object Storage, or watsonx.ai pipeline. In the full system, extracted frames are expected to be stored in IBM Cloud Object Storage and then passed to watsonx.ai for analysis.