import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { TextInput, PasswordInput, Button, InlineNotification } from "@carbon/react";
import { useAuth, ROLE_HOME } from "../../hooks/useAuth";
import { ApiError } from "../../services/types";
import { isMockData } from "../../services";
import { DEMO_PASSWORD } from "../../services/mock/seed";

/** Set in navigation state by staff pages when the backend rejects their token. */
export interface StaffLoginLocationState {
  sessionEnded?: boolean;
}

/**
 * Staff Login — shared by Auditors and Managers (Auditor Figma 8:2 default /
 * 8:22 error; the Manager file's copy is 1:342). No signup path, by design.
 * Like the Figma frames, it has no app header.
 *
 * The two Figma files label the eyebrow "RCS — Auditor" and "RCS — Manager"
 * respectively. This single shared route can't know the role until after
 * login, so it reads "RCS — Staff" (pending UX sign-off).
 */
export function StaffLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoggedIn, role } = useAuth();
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionEnded = (location.state as StaffLoginLocationState | null)?.sessionEnded === true;

  // Someone already logged in who opens this page goes straight to their view.
  if (isLoggedIn && role) {
    return <Navigate to={ROLE_HOME[role]} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const loggedInRole = await login(staffId.trim(), password);
      // Task 60 AC: "Logging in redirects to the correct role's view."
      navigate(ROLE_HOME[loggedInRole], { replace: true });
    } catch (err) {
      // The backend answers wrong ID and wrong password identically (401),
      // so the message never reveals which one was wrong (Figma 8:22 copy).
      setError(
        err instanceof ApiError && err.status === 401
          ? "Incorrect staff ID or password."
          : "We couldn't log you in right now. Please try again.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className="flex items-center justify-center px-4 py-10"
      style={{ backgroundColor: "var(--cds-layer-01)", minHeight: "100vh" }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-6 p-8"
        style={{
          maxWidth: 480,
          backgroundColor: "var(--cds-background)",
          borderTop: "4px solid var(--cds-border-interactive)",
          borderRadius: 8,
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)",
        }}
      >
        <div className="flex flex-col gap-2">
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--cds-text-secondary)" }}>RCS — Staff</p>
          <h1 style={{ fontSize: 28, lineHeight: "36px", fontWeight: 600 }}>Log in</h1>
          <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
            Enter your staff ID and password to continue.
          </p>
        </div>

        {/* Mock mode only: the demo has no real accounts, so say how to get in. */}
        {isMockData && (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Demo sign-in:"
            subtitle={`auditor-1, auditor-2 or manager-1 — password ${DEMO_PASSWORD}`}
            style={{ maxWidth: "100%" }}
          />
        )}

        {sessionEnded && !error && (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Your session has ended."
            subtitle="Log in again to continue."
            style={{ maxWidth: "100%" }}
          />
        )}

        {error && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            role="alert"
            title="Error:"
            subtitle={error}
            style={{ maxWidth: "100%" }}
          />
        )}

        <TextInput
          id="staff-id"
          labelText="Staff ID"
          placeholder="e.g. auditor-1"
          autoComplete="username"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
        />
        <PasswordInput
          id="staff-password"
          labelText="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          type="submit"
          disabled={isSubmitting || !staffId.trim() || !password}
          className="w-full"
          style={{ maxWidth: "100%" }}
        >
          {isSubmitting ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </main>
  );
}
