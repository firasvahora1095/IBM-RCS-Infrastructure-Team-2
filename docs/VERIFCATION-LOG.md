# Verification Log

This document records the verification history of our infrastructure.

## Backend Connection  
### 28th August 2026  

**Tester:** Dev 2 Aiden Brundell  
**Tested endpoint:** https://ibm-rcs-backend.2e2pxih6g5a9.ca-tor.codeengine.appdomain.cloud/health  

Test | Expected Result | Result | Pass/Fail
- Backend Health Endpoint | HTTP 200 with service status | HTTP 200 with {"status":"ok","service":"ibm-rcs-backend"} | Passed

### 29th Agusut 2026  

**Tester:** Dev 2 Aiden Brundell  
**Tested endpoint:** http://127.0.0.1:8000/

Test | Expected Result | Result | Pass/Fail
- (Local) Backend COS object write | Backend uploads a testing object | Testing object uploaded | Passed
- (Local) Backend COS object read | Backend reads a testing object | Testing object read | Passed
- (Local) Backend COS object remove | Backend deletes a testing object | Testing object deleted | Passed


