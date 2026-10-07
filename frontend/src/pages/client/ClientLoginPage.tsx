import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Button, InlineNotification, PasswordInput, TextInput } from "@carbon/react";
import { clientHome, useClientAuth } from "../../hooks/useClientAuth";
import { ApiError } from "../../services/types";
import { isMockData } from "../../services";
import { DEMO_PASSWORD } from "../../services/mock/seed";

/**
 * CommunityHub client sign-in (B2B spec S11). The same card as the staff
 * login, on its own route and session, so the two surfaces look like one
 * product but never share access. Neutral copy: an unauthenticated page
 * doesn't describe what's behind it. No self-sign-up: RCS creates accounts
 * for the organisation.
 */
export function ClientLoginPage() {
  const location = useLocation();
  const { login, isLoggedIn, session } = useClientAuth();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const state = location.state as { from?: string; expired?: boolean } | null;
  // Each role lands on the first section it can see.
  const target = state?.from?.startsWith("/client/") ? state.from : clientHome(session?.role);

  if (isLoggedIn) return <Navigate to={target} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      // Signing in re-renders with the session, and the redirect above uses its role.
      await login(userId.trim(), password);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Incorrect user ID or password."
          : err instanceof ApiError && (err.status === 429 || err.status === 501)
            ? err.message
            : "We couldn't sign you in right now. Please try again.",
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
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)",
        }}
      >
        <div className="flex flex-col gap-2">
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--cds-text-secondary)" }}>RCS — Client reports</p>
          <h1 style={{ fontSize: 28, lineHeight: "36px", fontWeight: 600 }}>Sign in</h1>
          <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
            Enter your user ID and password to continue.
          </p>
        </div>

        {isMockData && (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Demo sign-in:"
            subtitle={`ch-user-17 (reports), ch-mod-04 (Trust & Safety), ch-admin-01 (admin) — password ${DEMO_PASSWORD}`}
            style={{ maxWidth: "100%" }}
          />
        )}

        {state?.expired && !error && (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Your session has ended."
            subtitle="Sign in again to continue."
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
          id="client-user-id"
          labelText="User ID"
          placeholder="e.g. ch-user-17"
          autoComplete="username"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <PasswordInput
          id="client-password"
          labelText="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          type="submit"
          disabled={isSubmitting || !userId.trim() || !password}
          className="w-full"
          style={{ maxWidth: "100%" }}
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
        <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
          Accounts are set up by RCS for your organisation. There&apos;s no self-sign-up.
        </p>
      </form>
    </main>
  );
}
