import { describe, expect, it } from "vitest";
import { ATTENTION, availabilityOf, OPEN_BUCKET_LABEL } from "./intelligenceLabels";
import type { AttentionKind, AuditorOverviewRow, CooldownState } from "../services/types";

const base: AuditorOverviewRow = {
  auditor_id: "auditor-1",
  display_name: "Reese Patel",
  exposure_minutes_today: 10,
  exposure_limit_minutes: 120,
  exposure_state: "UNDER",
  cooldown: null,
  cases_today: 0,
  active_case_count: 0,
};
const now = Date.parse("2026-10-07T10:00:00Z");
const cooldown = (endsAt: string): CooldownState => ({ ends_at: endsAt, trigger: "S3", requires_check_in: false });

describe("availabilityOf", () => {
  it("is Available when nothing blocks new cases", () => {
    expect(availabilityOf(base, now)).toBe("AVAILABLE");
  });

  it("is In cooldown while a cooldown runs", () => {
    expect(availabilityOf({ ...base, cooldown: cooldown("2026-10-07T10:12:00Z") }, now)).toBe("COOLDOWN");
  });

  it("ignores a cooldown that has ended (clock skew included)", () => {
    expect(availabilityOf({ ...base, cooldown: cooldown("2026-10-07T09:00:00Z") }, now)).toBe("AVAILABLE");
  });

  it("an S4 cooldown waiting for the Manager's check-in still blocks new cases", () => {
    const waiting = { ...cooldown("2026-10-07T09:00:00Z"), trigger: "S4" as const, requires_check_in: true, check_in_completed_at: null };
    expect(availabilityOf({ ...base, cooldown: waiting }, now)).toBe("COOLDOWN");
  });

  it("the daily limit outranks a cooldown: no new cases for the rest of the day", () => {
    expect(
      availabilityOf({ ...base, exposure_state: "AT_LIMIT", cooldown: cooldown("2026-10-07T10:12:00Z") }, now),
    ).toBe("NO_NEW_CASES");
  });

  it("an open SOS outranks everything", () => {
    expect(availabilityOf({ ...base, open_sos: true, exposure_state: "AT_LIMIT" }, now)).toBe("SOS_PROTECTION");
  });
});

describe("attention wording", () => {
  it("covers every kind", () => {
    const kinds: AttentionKind[] = ["SOS", "SUPPORT_REQUEST", "REASSIGNMENT", "CAP_INTERRUPTED", "FAILED_HANDOFF"];
    for (const kind of kinds) expect(ATTENTION[kind].label).toBeTruthy();
  });

  it("every open bucket has a label", () => {
    expect(Object.keys(OPEN_BUCKET_LABEL)).toHaveLength(5);
  });
});
