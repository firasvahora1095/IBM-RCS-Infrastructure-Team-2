# Verification Log

This document records the verification history of our infrastructure.

## Backend Connection  
### 28th August 2026  

**Tester:** Dev 2 Aiden Brundell  
**Tested endpoint:** https://ibm-rcs-backend.2e2pxih6g5a9.ca-tor.codeengine.appdomain.cloud/health  

Test | Expected Result | Result | Pass/Fail
- Backend Health Endpoint | HTTP 200 with service status | HTTP 200 with {"status":"ok","service":"ibm-rcs-backend"} | Passed

### 29th August 2026  

**Tester:** Dev 2 Aiden Brundell  
**Tested endpoint:** http://127.0.0.1:8000/storage-check

Test | Expected Result | Result | Pass/Fail
- (Local) Backend COS object write | Backend uploads a testing object | Testing object uploaded | Passed
- (Local) Backend COS object read | Backend reads a testing object | Testing object read | Passed
- (Local) Backend COS object remove | Backend deletes a testing object | Testing object deleted | Passed

## Watson STT
### 31st August 2026
**Tester:** Dev 2 Aiden Brundell  
**Tested file(s):** backend/app/speech_to_text.py, using backend/scripts/stt_test.wav

Test | Expected Result | Result | Pass/Fail
- Audio file transcription | Uploads audio file to Watson STT and receives transcription | stt_test.wav successfully uploaded and transcribed | Passed
- Transcription accuracy | Transcription retains the meaning of "This is a recording to test the watson speech to text service" | Transcription largely retained meaning | Passed

Snippet of connection log:
```
{
  "model": "en-AU",
  "transcript": "this is a recording to test the watson's speech to text service",
  "results": [
    {
      "final": true,
      "alternatives": [
        {
          "transcript": "this is a recording to test the watson's speech to text service ",
          "confidence": 0.91,
          "timestamps": [
            [
              "this",
              1.08,
              1.28
            ],
            [
              "is",
              1.28,
              1.46
            ],
```

## Watsonx AI
### 1st September 2026

**Tester:** Dev 2 Aiden Brundell  
**Tested file(s):** backend/app/watsonx_image.py, using backend/scripts/watsonx_image_test.jpg

Test | Expected Result | Result | Pass/Fail
- Image file reasoning | Uploads image file to watsonx and receives output | watsonx_image_test.jpg successfully uploaded and received output | Passed
- Reasoning accuracy | Model reasoning clearly understands there is a blue circle, green triangle and yellow square as a benign test image | Model reasoning largely accurate to the image | Passed
- Correct model | The model supplied in the environment file is used | LLama 4 Maverick used | Passed

Snippet of connection log:

```
"model": "meta-llama/llama-4-maverick-17b-128e-instruct-fp8",
    "choices": [
      {
        "index": 0,
        "message": {
          "role": "assistant",
          "content": "```json\n{\n  \"summary\": \"A simple graphic with three shapes: a blue circle, a yellow square, and a green triangle.\",\n  \"visible_objects\": [\"blue circle\", \"yellow square\", \"green triangle\"],\n  \"visible_text\": [\"BENIGN TEST IMAGE\", \"blue circle - yellow square - green triangle\"],\n  \"risk_indicators\": [],\n  \"requires_human_review\": false\n}\n```"
        },
        "finish_reason": "stop"
      }
    ],
    "created": 1788193263,
    "model_version": "4.0.0",
    "created_at": "2026-08-31T16:21:04.728Z",
    "usage": {
      "completion_tokens": 87,
      "prompt_tokens": 858,
      "total_tokens": 945
```