import { useState } from "react";
import type { FormEvent } from "react";
import { Link as RouterLink, Navigate, useLocation } from "react-router-dom";
import { Button, InlineNotification, Link, PasswordInput, TextInput } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { clientHome, useClientAuth } from "../../hooks/useClientAuth";
import { SignInLayout } from "../../components/auth/SignInLayout";
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
    <SignInLayout
      audience="For organisations using RCS"
      statement="Every result RCS delivers to your platform, in one place."
      points={[
        "Case results and the action your team took",
        "Service reports to view or download",
        "Messages with the RCS team",
      ]}
    >
      <form onSubmit={handleSubmit} className="si-form">
        <div className="si-form-head">
          <p className="si-eyebrow">RCS — Client portal</p>
          <h1 className="si-title">Sign in</h1>
          <p className="si-sub">Enter your user ID and password to continue.</p>
        </div>

        {isMockData && (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Demo sign-in:"
            subtitle={`ch-user-17 (reports), ch-mod-04 (Trust & Safety) or ch-admin-01 (admin), password ${DEMO_PASSWORD}`}
          />
        )}

        {state?.expired && !error && (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Your session has ended."
            subtitle="Sign in again to continue."
          />
        )}

        {error && (
          <InlineNotification kind="error" lowContrast hideCloseButton role="alert" title="Error:" subtitle={error} />
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
          renderIcon={ArrowRight}
          disabled={isSubmitting || !userId.trim() || !password}
          className="si-submit"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
        <p className="si-note">Accounts are set up by RCS for your organisation. There&apos;s no self-sign-up.</p>
        <div className="si-links">
          <p>
            RCS staff?{" "}
            <Link as={RouterLink} to="/staff/login">
              Staff sign in
            </Link>
          </p>
          <Link as={RouterLink} to="/rcs">
            Back to RCS
          </Link>
        </div>
      </form>
    </SignInLayout>
  );
}
