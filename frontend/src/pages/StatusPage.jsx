import { useState } from "react";
import { getStatus } from "../lib/api";

export default function StatusPage() {
  const [caseId, setCaseId] = useState(
    () => localStorage.getItem("rcs_case_id") || ""
  );
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  async function handleLookup(event) {
    event.preventDefault();
    setError("");
    setStatus(null);

    try {
      const result = await getStatus(caseId);
      setStatus(result);
    } catch {
      // UR-ST-08: generic message regardless of why it failed.
      setError("We couldn't find a case with that ID.");
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-semibold">Check case status</h1>

      <form onSubmit={handleLookup} className="flex gap-2">
        <input
          type="text"
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
          placeholder="Enter your case ID"
          className="flex-1 rounded border px-3 py-2 font-mono"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Check
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {status && (
        <div className="mt-6 rounded border bg-gray-50 p-4">
          <p className="text-sm text-gray-600">Status</p>
          <p className="text-xl font-medium">{status.status}</p>
          {status.final_outcome && (
            <p className="mt-2 text-sm text-gray-700">
              Outcome: {status.final_outcome}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
