import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuditorCaseDetail, getAuditorCases, resolveCase } from "../lib/api";

const SEVERITY_COLORS = {
  S1: "bg-green-100 text-green-800",
  S2: "bg-yellow-100 text-yellow-800",
  S3: "bg-orange-100 text-orange-800",
  S4: "bg-red-100 text-red-800",
};

export default function AuditorPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("rcs_staff_token");

  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [outcome, setOutcome] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [resolvedMessage, setResolvedMessage] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/staff/login");
      return;
    }
    loadCases();
  }, [token]);

  async function loadCases() {
    try {
      const result = await getAuditorCases(token);
      setCases(result);
    } catch {
      navigate("/staff/login");
    }
  }

  async function openCase(caseId) {
    setError("");
    setResolvedMessage("");
    const detail = await getAuditorCaseDetail(token, caseId);
    setSelectedCase(detail);
  }

  async function handleResolve(event) {
    event.preventDefault();
    setError("");

    try {
      const result = await resolveCase(token, selectedCase.case_id, {
        finalOutcome: outcome,
        auditorComment: comment,
      });
      setResolvedMessage(`Case ${result.case_id} marked ${result.status}.`);
      setSelectedCase(null);
      setOutcome("");
      setComment("");
      loadCases();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem("rcs_staff_token");
    localStorage.removeItem("rcs_staff_role");
    navigate("/staff/login", { replace: true });
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Auditor queue</h1>
        <button onClick={handleLogout} className="text-sm text-blue-600 underline">
          Sign out
        </button>
      </div>

      {resolvedMessage && (
        <p className="mb-4 rounded bg-green-50 p-3 text-sm text-green-800">
          {resolvedMessage}
        </p>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="mb-2 font-medium">Assigned cases</h2>
          <ul className="space-y-2">
            {cases.map((c) => (
              <li key={c.case_id}>
                <button
                  onClick={() => openCase(c.case_id)}
                  className="flex w-full items-center justify-between rounded border px-3 py-2 text-left hover:bg-gray-50"
                >
                  <span className="font-mono text-sm">{c.case_id}</span>
                  {c.severity_tier && (
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${SEVERITY_COLORS[c.severity_tier] || "bg-gray-100"}`}
                    >
                      {c.severity_tier}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {cases.length === 0 && (
              <p className="text-sm text-gray-500">No assigned cases.</p>
            )}
          </ul>
        </div>

        <div>
          {selectedCase && (
            <div className="rounded border p-4">
              <h2 className="mb-2 font-medium">{selectedCase.case_id}</h2>
              <p className="text-sm">
                Severity:{" "}
                <span className="font-semibold">{selectedCase.severity_tier}</span> (
                {selectedCase.effective_severity_score})
              </p>
              <p className="mt-2 text-sm text-gray-700">
                {selectedCase.narrative_summary}
              </p>

              <form onSubmit={handleResolve} className="mt-4 space-y-2">
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  required
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="">Select final outcome...</option>
                  <option value="No Violation Found">No Violation Found</option>
                  <option value="Violation Confirmed">Violation Confirmed</option>
                </select>
                <textarea
                  placeholder="Comment (required if overriding AI severity)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                />
                <button
                  type="submit"
                  className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Submit resolution
                </button>
              </form>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
