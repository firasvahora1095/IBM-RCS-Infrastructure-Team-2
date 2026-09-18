import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { InlineNotification, Link, Modal, PasswordInput } from "@carbon/react";
import { useAuth } from "../../hooks/useAuth";
import { ApiError } from "../../services/types";

interface SessionExpiredModalProps {
  open: boolean;
  /** What the person will get back, e.g. "Your review — blur level, grayscale, and mute settings — will be exactly as you left it." */
  preservedWorkMessage: string;
  onReauthenticated: () => void;
}

/**
 * Session-expired re-authentication, in context (Auditor Figma 36:235,
 * Manager 1:1231). The page underneath stays mounted and paused, so signing
 * back in resumes exactly where the person left off instead of dropping them
 * on the login screen and losing their work.
 *
 * Closing the dialog signs out: there is no way to keep using the page with
 * an expired session.
 */
export function SessionExpiredModal({ open, preservedWorkMessage, onReauthenticated }: SessionExpiredModalProps) {
  const navigate = useNavigate();
  const { staffId, reauthenticate, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function signOut() {
    logout();
    navigate("/staff/login", { replace: true });
  }

  async function handleSubmit() {
    if (!password || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await reauthenticate(password);
      setPassword("");
      onReauthenticated();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Incorrect password."
          : err instanceof ApiError
            ? err.message
            : "We couldn't log you in right now. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      size="sm"
      modalHeading="Your session has timed out"
      primaryButtonText={isSubmitting ? "Logging in…" : "Log in to continue"}
      primaryButtonDisabled={!password || isSubmitting}
      onRequestSubmit={handleSubmit}
      onRequestClose={signOut}
      closeButtonLabel="Log out"
      preventCloseOnClickOutside
      shouldSubmitOnEnter
      selectorPrimaryFocus="#reauth-password"
    >
      <div className="flex flex-col gap-4">
        <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
          Please re-enter your password to continue as {staffId}. {preservedWorkMessage}
        </p>
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
        <PasswordInput
          id="reauth-password"
          labelText="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p style={{ fontSize: 14, textAlign: "center" }}>
          <Link
            href="/staff/login"
            onClick={(e) => {
              e.preventDefault();
              signOut();
            }}
          >
            Not you? Log out
          </Link>
        </p>
      </div>
    </Modal>
  );
}
