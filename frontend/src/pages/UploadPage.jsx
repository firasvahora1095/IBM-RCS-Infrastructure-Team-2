import { useState } from "react";
import { Link } from "react-router-dom";
import { uploadReport } from "../lib/api";

const CASE_ID_STORAGE_KEY = "rcs_case_id";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [caseId, setCaseId] = useState(
    () => localStorage.getItem(CASE_ID_STORAGE_KEY) || ""
  );
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!file) {
      setError("Please choose a video file.");
      return;
    }

    try {
      const result = await uploadReport(file);
      setCaseId(result.case_id);
      localStorage.setItem(CASE_ID_STORAGE_KEY, result.case_id);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(caseId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-semibold">Report content for review</h1>

      <p className="mb-4 text-sm text-gray-600">
        No account needed. Accepted formats: MP4, MOV, WEBM, AVI. By
        submitting, you agree this report will be reviewed by trained staff.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="file"
          accept=".mp4,.mov,.webm,.avi"
          onChange={(e) => setFile(e.target.files[0] || null)}
          className="block w-full rounded border border-gray-300 p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-blue-700"
        />
        {file && (
          <p className="text-xs text-gray-500">Selected: {file.name}</p>
        )}
        <button
          type="submit"
          className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Submit report
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {caseId && (
        <div className="mt-6 rounded border border-green-300 bg-green-50 p-4">
          <p className="text-sm font-medium">Your case ID:</p>
          <p className="font-mono text-lg">{caseId}</p>
          <button
            onClick={handleCopy}
            className="mt-2 rounded border px-3 py-1 text-sm hover:bg-white"
          >
            {copied ? "Copied!" : "Copy Case ID"}
          </button>
          <p className="mt-3 text-sm text-gray-700">
            Save this ID now — you'll need it to track your case later. It's
            also saved in this browser.
          </p>
        </div>
      )}

      <Link to="/status" className="mt-6 block text-sm text-blue-600 underline">
        Check an existing case status &rarr;
      </Link>
    </div>
  );
}
