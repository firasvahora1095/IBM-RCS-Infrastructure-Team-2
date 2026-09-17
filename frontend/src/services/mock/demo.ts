import type { SeverityTier } from "../types";
import { resetDb, updateDb, type MockDb, type MockStaff } from "./store";

/**
 * Demo scenario controls (mock mode only). They force the edge states the
 * Figma prototypes design for but a short demo rarely produces on its own:
 * a failed submission, an expired session, an exposure limit, a cooldown.
 * Nothing here exists in the `api` data source.
 */

/** Fired when a demo scenario changes state the current page should re-read. */
export const DEMO_SCENARIO_EVENT = "rcs:demo-scenario";

/** Fired to simulate the network dropping for `detail.seconds` (Figma 42:352). */
export const DEMO_CONNECTION_LOST_EVENT = "rcs:demo-connection-lost";

function staffForToken(db: MockDb, token: string): MockStaff | undefined {
  const session = db.sessions[token];
  return session ? db.staff.find((s) => s.staff_id === session.staffId) : undefined;
}

export const demoScenarios = {
  /** Figma 42:405 / Manager 197:309: the next submission or save fails as if the connection dropped. */
  failNextSubmission(): void {
    updateDb((db) => {
      db.demo.failNextSubmission = true;
    });
  },

  /** Manager Figma 197:321: the next reassignment target turns out to be unavailable on confirm. */
  makeNextReassignTargetUnavailable(): void {
    updateDb((db) => {
      db.demo.nextReassignTargetUnavailable = true;
    });
  },

  /** Figma 36:235 / Manager 1:1231: the server forgets this session; the next request gets a 401. */
  expireSession(token: string): void {
    updateDb((db) => {
      delete db.sessions[token];
    });
  },

  /** Figma 34:121: puts the signed-in Auditor at their daily exposure limit. */
  reachExposureLimit(token: string): void {
    updateDb((db) => {
      const me = staffForToken(db, token);
      if (me) me.exposure_seconds_today = me.exposure_limit_minutes * 60;
    });
  },

  /** Figma 31:99 / 36:189: starts a cooldown for the signed-in Auditor. */
  startCooldown(token: string, trigger: SeverityTier, minutes: number): void {
    updateDb((db) => {
      const me = staffForToken(db, token);
      if (!me) return;
      const now = Date.now();
      me.cooldown = {
        started_at: new Date(now).toISOString(),
        ends_at: new Date(now + minutes * 60_000).toISOString(),
        trigger,
        requires_check_in: trigger === "S4",
        check_in_completed_at: null,
      };
    });
  },

  /** Ends the signed-in Auditor's cooldown now, recording the Manager check-in if one was required. */
  finishCooldown(token: string): void {
    updateDb((db) => {
      const me = staffForToken(db, token);
      if (!me?.cooldown) return;
      const now = new Date().toISOString();
      me.cooldown = { ...me.cooldown, ends_at: now, check_in_completed_at: now };
    });
  },

  /** Restores the original demo data. Staff are signed out, since their sessions are gone. */
  reset(): void {
    resetDb();
  },
};
