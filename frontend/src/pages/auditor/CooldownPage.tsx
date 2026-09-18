import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, InlineNotification, ProgressBar, SkeletonText } from "@carbon/react";
import { StaffHeader } from "../../components/shell/StaffHeader";
import { StaffPage } from "../../components/layout/StaffPage";
import { WellbeingCheckIn } from "../../components/wellbeing/WellbeingCheckIn";
import { useAuth } from "../../hooks/useAuth";
import { useMyWellbeing } from "../../hooks/useMyWellbeing";
import type { CooldownState } from "../../services/types";

/** AR-WB-12 standard lengths, used for the progress bar when the start time isn't provided. */
const STANDARD_MINUTES: Record<CooldownState["trigger"], number> = { S1: 0, S2: 5, S3: 15, S4: 30, SOS: 30 };

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function formatReviewed(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function introFor(trigger: CooldownState["trigger"]): string {
  if (trigger === "SOS") {
    return "You used SOS during a review. This cooldown is a built-in protection, not a penalty.";
  }
  if (trigger === "S2") {
    return "You've had sustained exposure to moderate-severity content. This cooldown is a built-in protection, not a penalty.";
  }
  return "You've just reviewed a high-severity case. This cooldown is a built-in protection, not a penalty.";
}

/**
 * Cooldown Screen (Figma 31:99), reached after a high-severity submission or
 * an SOS (AR-WB-04, AR-WB-12). The queue stays locked until the cooldown ends
 * and, for S4 and SOS, until the Manager or support has checked in. "Stop my
 * shift" is always available. The optional wellbeing check-in sits inline, as
 * the design intends for the shipped product.
 */
export function CooldownPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { wellbeing, error, refresh } = useMyWellbeing();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const cooldown = wellbeing?.cooldown ?? null;
  const endsAt = cooldown ? Date.parse(cooldown.ends_at) : 0;
  const remainingMs = Math.max(0, endsAt - now);
  const waitingForCheckIn = cooldown !== null && cooldown.requires_check_in && !cooldown.check_in_completed_at;

  // When the timer runs out, ask the data source whether the cooldown has really ended.
  const timerDone = cooldown !== null && remainingMs === 0;
  useEffect(() => {
    if (timerDone) refresh();
  }, [timerDone, refresh]);

  function stopShift() {
    logout();
    navigate("/staff/login", { replace: true });
  }

  const header = <StaffHeader role="auditor" />;

  if (!wellbeing && error) {
    // Without cooldown data the queue can't safely be offered, but stopping
    // the shift must always stay available.
    return (
      <>
        {header}
        <StaffPage maxWidth={600}>
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            role="alert"
            title="Couldn't load your cooldown."
            subtitle={error}
            style={{ maxWidth: "100%" }}
          />
          <div className="flex flex-wrap gap-4">
            <Button kind="tertiary" onClick={refresh}>
              Try again
            </Button>
            <Button kind="secondary" onClick={stopShift}>
              Stop my shift
            </Button>
          </div>
        </StaffPage>
      </>
    );
  }

  if (!wellbeing) {
    return (
      <>
        {header}
        <StaffPage maxWidth={600}>
          <SkeletonText heading />
          <SkeletonText paragraph lineCount={4} />
        </StaffPage>
      </>
    );
  }

  const canReturn = cooldown === null || (remainingMs === 0 && !waitingForCheckIn);
  const startedAt = cooldown?.started_at
    ? Date.parse(cooldown.started_at)
    : endsAt - STANDARD_MINUTES[cooldown?.trigger ?? "S3"] * 60_000;
  const progress = cooldown
    ? Math.min(100, Math.max(0, ((now - startedAt) / Math.max(1, endsAt - startedAt)) * 100))
    : 100;

  return (
    <>
      {header}
      <StaffPage maxWidth={600}>
        <h1 style={{ fontSize: 28, lineHeight: "36px", fontWeight: 600 }}>
          {cooldown ? "Cooldown in progress" : "Your cooldown has ended"}
        </h1>

        {cooldown ? (
          <>
            <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
              {introFor(cooldown.trigger)}
            </p>
            <ProgressBar
              label={`Cooldown ends at ${formatClock(cooldown.ends_at)}`}
              value={progress}
              max={100}
              helperText={remainingMs > 0 ? `${formatCountdown(remainingMs)} remaining` : "Cooldown time complete"}
            />
          </>
        ) : (
          <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
            You can return to your queue whenever you&apos;re ready.
          </p>
        )}

        <p
          className="px-4 py-3"
          style={{ fontSize: 14, color: "var(--cds-text-secondary)", backgroundColor: "var(--cds-layer-01)" }}
        >
          {formatReviewed(wellbeing.exposure_minutes_today)} reviewed today
          {wellbeing.cases_reviewed_today !== undefined ? ` across ${wellbeing.cases_reviewed_today} cases` : ""}
        </p>

        {waitingForCheckIn && (
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title="Your manager will check in before this ends"
            subtitle="This isn't something you need to trigger — this cooldown includes a mandatory check-in that your manager or support initiates."
            style={{ maxWidth: "100%" }}
          />
        )}

        <WellbeingCheckIn />

        <div className="flex flex-wrap gap-3">
          <Button disabled={!canReturn} onClick={() => navigate("/auditor")}>
            {canReturn
              ? "Return to queue"
              : remainingMs > 0
                ? `Return to queue (available in ${formatCountdown(remainingMs)})`
                : "Return to queue (after your manager's check-in)"}
          </Button>
          <Button kind="tertiary" onClick={stopShift}>
            Stop my shift
          </Button>
        </div>
      </StaffPage>
    </>
  );
}
