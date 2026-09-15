const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = data?.detail;
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }

  return data;
}

export function uploadReport(file) {
  const formData = new FormData();
  formData.append("video", file);
  return request("/api/reports", { method: "POST", body: formData });
}

export function getStatus(caseId) {
  return request(`/api/status/${caseId}`);
}

export function staffLogin(auditorId, password) {
  const params = new URLSearchParams({ auditor_id: auditorId, password });
  return request(`/api/staff/login?${params}`, { method: "POST" });
}

export function getAuditorCases(token) {
  return request("/api/auditor/cases", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getAuditorCaseDetail(token, caseId) {
  return request(`/api/auditor/cases/${caseId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function resolveCase(token, caseId, { finalOutcome, auditorSeverityScore, auditorComment }) {
  const params = new URLSearchParams({ final_outcome: finalOutcome });
  if (auditorSeverityScore !== undefined && auditorSeverityScore !== "") {
    params.set("auditor_severity_score", auditorSeverityScore);
  }
  if (auditorComment) {
    params.set("auditor_comment", auditorComment);
  }

  return request(`/api/auditor/cases/${caseId}/resolve?${params}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}
