from fastapi import FastAPI

app = FastAPI(title="IBM RCS Backend")


@app.get("/")
def root():
    return {
        "service": "IBM RCS Backend",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ibm-rcs-backend"
    }


@app.get("/api/reports/{case_id}")
def get_report(case_id: str):
    return {
        "case_id": case_id,
        "status": "Being Reviewed"
    }


@app.post("/api/auditor/cases/{case_id}/decline")
def decline_case(case_id: str):
    return {
        "case_id": case_id,
        "status": "Declined",
        "routed_to": "Manager Queue"
    }


@app.get("/api/manager/dashboard")
def manager_dashboard():
    return {
        "auditors": [],
        "pending_declined_cases": 0
    }