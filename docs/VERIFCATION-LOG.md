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