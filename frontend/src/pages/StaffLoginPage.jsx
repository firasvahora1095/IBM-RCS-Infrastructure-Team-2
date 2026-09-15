import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { staffLogin } from "../lib/api";

export default function StaffLoginPage() {
  const [auditorId, setAuditorId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const result = await staffLogin(auditorId, password);
      localStorage.setItem("rcs_staff_token", result.token);
      localStorage.setItem("rcs_staff_role", result.role);

      // Role-scoped redirect (AR-AS-06). Manager role not built yet.
      navigate(result.role === "manager" ? "/manager" : "/auditor");
    } catch {
      setError("Invalid credentials.");
    }
  }

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-semibold">Staff sign in</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Auditor ID"
          value={auditorId}
          onChange={(e) => setAuditorId(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <button
          type="submit"
          className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Sign in
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
