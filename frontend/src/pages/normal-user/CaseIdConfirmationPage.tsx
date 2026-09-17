import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, Navigate, useLocation } from "react-router-dom";
import { Button, InlineNotification, TextInput, Dropdown, Link } from "@carbon/react";
import { CheckmarkFilled } from "@carbon/icons-react";
import { PublicPage } from "../../components/layout/PublicPage";
import { loadCaseId } from "../../hooks/useCaseIdStorage";
import { requestStatusUpdates } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE, NotImplementedError } from "../../services/types";

const COUNTRY_CODES = [{ id: "+61", label: "+61" }];

/** How long the inline "Copied!" confirmation stays visible (Figma annotation: "~2s"). */
const COPIED_CONFIRMATION_MS = 2000;

type CopyState = "idle" | "copied" | "failed";
type UpdatesState = "idle" | "sending" | "enabled" | "unavailable" | "failed";

/**
 * Screen 2 — Case ID Confirmation (Normal User Figma node 6:2).
 *
 * The case ID comes from navigation state when arriving straight from the
 * Upload page, and from local storage after a refresh (UR-ID-07). Landing
 * here with neither (a bookmark, a different browser) redirects to Upload,
 * rather than showing a "Report received" screen with no case to receive.
 */
export function CaseIdConfirmationPage() {
  const location = useLocation();
  const stateCaseId = (location.state as { caseId?: string } | null)?.caseId;
  const caseId = stateCaseId ?? loadCaseId()?.caseId ?? null;

  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [updates, setUpdates] = useState<UpdatesState>("idle");
  const [updatesError, setUpdatesError] = useState<string | null>(null);
  const copyTimer = useRef<number | undefined>(undefined);

  // Clear a pending "Copied!" timer if the user leaves the page mid-countdown,
  // so it never tries to update state on an unmounted component.
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  if (!caseId) {
    return <Navigate to="/" replace />;
  }

  async function handleCopy() {
    window.clearTimeout(copyTimer.current);
    try {
      // The Clipboard API can reject (permissions, non-secure context) or
      // be missing entirely in older browsers — both must show a fallback
      // instead of falsely claiming the ID was copied.
      await navigator.clipboard.writeText(caseId!);
      setCopyState("copied");
      copyTimer.current = window.setTimeout(() => setCopyState("idle"), COPIED_CONFIRMATION_MS);
    } catch {
      setCopyState("failed");
    }
  }

  // UR-ID-05 / UR-ST-05/06 are Nice-to-Haves: the button only becomes
  // usable once at least one contact method is filled in.
  const hasContactDetail = email.trim() !== "" || phone.trim() !== "";

  async function handleSendUpdates() {
    setUpdates("sending");
    setUpdatesError(null);
    try {
      await requestStatusUpdates(caseId!, {
        email: email.trim() || undefined,
        phone: phone.trim() ? `+61 ${phone.trim()}` : undefined,
      });
      setUpdates("enabled");
    } catch (err) {
      if (err instanceof NotImplementedError) {
        setUpdates("unavailable");
      } else {
        setUpdatesError(err instanceof ApiError ? err.message : null);
        setUpdates("failed");
      }
    }
  }

  return (
    <PublicPage cardWidth={720}>
      <div className="flex items-center gap-2.5">
        <CheckmarkFilled size={32} style={{ fill: "var(--cds-support-success)" }} aria-hidden="true" />
        <h1 style={{ fontSize: 20, lineHeight: "28px", fontWeight: 600 }}>Report received</h1>
      </div>
      <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
        Save the case ID below — it&apos;s the only way to check your case later.
      </p>

      <div className="flex flex-col gap-3">
        <div
          className="flex flex-col gap-1 px-6 py-5"
          style={{
            backgroundColor: "var(--cds-layer-01)",
            borderLeft: "4px solid var(--cds-border-interactive)",
            borderRadius: 4,
          }}
        >
          <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>Your case ID</p>
          <p
            data-testid="case-id"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 28,
              lineHeight: "32px",
              letterSpacing: 1,
              color: "var(--cds-text-primary)",
              wordBreak: "break-all",
            }}
          >
            {caseId}
          </p>
        </div>

        <div>
          <Button onClick={handleCopy}>Copy case ID</Button>
        </div>

        {/* aria-live so screen-reader users hear the result of pressing Copy. */}
        <div aria-live="polite" style={{ minHeight: 18 }}>
          {copyState === "copied" && (
            <p className="flex items-center gap-1.5" style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
              <CheckmarkFilled size={16} style={{ fill: "var(--cds-support-success)" }} aria-hidden="true" /> Copied!
            </p>
          )}
          {copyState === "failed" && (
            <p style={{ fontSize: 12, color: "var(--cds-text-error)" }}>
              Couldn&apos;t copy automatically — select the case ID above and copy it manually.
            </p>
          )}
        </div>

        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title="If you lose this case ID and haven't added contact details, you won't be able to check this case again."
          style={{ maxWidth: "100%" }}
        />
      </div>

      <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
        This case ID has also been saved in this browser, on this device.
      </p>

      <hr style={{ border: 0, borderTop: "1px solid var(--cds-border-subtle-00)", margin: 0 }} />

      <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
        Want updates by email or SMS instead? (optional)
      </p>

      <TextInput
        id="email-updates"
        type="email"
        labelText="Email (optional)"
        placeholder="you@example.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div className="flex items-end gap-2">
        <div style={{ width: 96, flexShrink: 0 }}>
          <Dropdown
            id="country-code"
            titleText="Code"
            label="+61"
            items={COUNTRY_CODES}
            itemToString={(item) => item?.label ?? ""}
            initialSelectedItem={COUNTRY_CODES[0]}
          />
        </div>
        <div className="flex-1">
          <TextInput
            id="phone-updates"
            type="tel"
            labelText="Phone (optional)"
            placeholder="0400 000 000"
            autoComplete="tel-national"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      <p style={{ fontSize: 11, lineHeight: "15px", color: "var(--cds-text-secondary)", maxWidth: 320 }}>
        We&apos;ll text or email you a secure one-time link to this status page — no extra account or password needed.
      </p>

      <div className="flex flex-col gap-3">
        <div>
          <Button
            kind="tertiary"
            disabled={!hasContactDetail || updates === "sending" || updates === "enabled"}
            onClick={handleSendUpdates}
          >
            {updates === "sending" ? "Sending…" : "Send me updates"}
          </Button>
        </div>
        <div aria-live="polite">
          {/* Figma 102:80 success state, only once the request was really accepted. */}
          {updates === "enabled" && (
            <p className="flex gap-1.5" style={{ fontSize: 13, color: "var(--cds-text-primary)" }}>
              <CheckmarkFilled
                size={16}
                style={{ fill: "var(--cds-support-success)", flexShrink: 0, marginTop: 1 }}
                aria-hidden="true"
              />{" "}
              Updates enabled — you&apos;ll get a message when your case status changes.
            </p>
          )}
          {/* A backend without a notifications endpoint must not promise a
              message that never arrives, so this honest notice replaces the
              success state (copy pending UX sign-off). */}
          {updates === "unavailable" && (
            <InlineNotification
              kind="info"
              lowContrast
              hideCloseButton
              title="Email and SMS updates aren't available yet."
              subtitle="Your contact details haven't been saved. Keep your case ID to check this case."
              style={{ maxWidth: "100%" }}
            />
          )}
          {updates === "failed" && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              role="alert"
              title="We couldn't set up updates."
              subtitle={updatesError ?? NETWORK_ERROR_MESSAGE}
              style={{ maxWidth: "100%" }}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {/* Per the Figma annotation, these destinations are "to be
              confirmed by Dev — not a tracked design decision", so they are
              deliberately not wired to guessed URLs. */}
          <Link href="#" onClick={(e) => e.preventDefault()}>
            View requirements*
          </Link>
          <Link href="#" onClick={(e) => e.preventDefault()}>
            Contact support*
          </Link>
        </div>
        <p style={{ fontSize: 11, lineHeight: "15px", color: "var(--cds-text-secondary)" }}>
          *Destination to be confirmed by Dev — not a tracked design decision.
        </p>
      </div>

      <hr style={{ border: 0, borderTop: "1px solid var(--cds-border-subtle-00)", margin: 0 }} />

      <div className="flex flex-wrap gap-4">
        <Button kind="tertiary" as={RouterLink} to="/status">
          Check case status
        </Button>
        <Button kind="tertiary" as={RouterLink} to="/">
          Submit another report
        </Button>
      </div>
    </PublicPage>
  );
}
