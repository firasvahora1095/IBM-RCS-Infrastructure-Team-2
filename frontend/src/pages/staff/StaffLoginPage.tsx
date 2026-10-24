import { useState } from "react";
import type { FormEvent } from "react";
import { Link as RouterLink, Navigate, useLocation, useNavigate } from "react-router-dom";
import { TextInput, PasswordInput, Button, InlineNotification, Link } from "@carbon/react";
import { ArrowLeft, ArrowRight } from "@carbon/icons-react";
import { useAuth, ROLE_HOME } from "../../hooks/useAuth";
import { SignInLayout } from "../../components/auth/SignInLayout";
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
 * login, so it reads "RCS — Staff". "Sign in", not "Log in", matching every
 * other sign-in label in the product.
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
      // 429 is the lockout after repeated failures (Figma 36:129), whose
      // message already says when to try again.
      setError(
        err instanceof ApiError && err.status === 401
          ? "Incorrect staff ID or password."
          : err instanceof ApiError && err.status === 429
            ? err.message
            : "We couldn't log you in right now. Please try again.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <SignInLayout
      audience="For RCS Auditors and Managers"
      statement="Review harmful video with protection built into every case."
      points={[
        "Content warnings and blur on every case",
        "A daily viewing limit the system keeps",
        "Support and SOS, one click away",
      ]}
    >
      <form onSubmit={handleSubmit} className="si-form">
        <RouterLink to="/rcs" className="si-back">
          <ArrowLeft aria-hidden="true" />
          Back to RCS
        </RouterLink>
        <div className="si-form-head">
          <p className="si-eyebrow">RCS — Staff</p>
          <h1 className="si-title">Sign in</h1>
          <p className="si-sub">Enter your staff ID and password to continue.</p>
        </div>

        {/* Mock mode only: the demo has no real accounts, so say how to get in. */}
        {isMockData && (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Demo sign-in:"
            subtitle={`auditor-1 to auditor-5, superauditor-1 (Super Auditor) or manager-1, password ${DEMO_PASSWORD}`}
          />
        )}

        {sessionEnded && !error && (
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
          renderIcon={ArrowRight}
          disabled={isSubmitting || !staffId.trim() || !password}
          className="si-submit"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
        <div className="si-links">
          <p>
            Signing in for your organisation?{" "}
            <Link as={RouterLink} to="/client/login">
              Client sign in
            </Link>
          </p>
        </div>
      </form>
    </SignInLayout>
  );
}
