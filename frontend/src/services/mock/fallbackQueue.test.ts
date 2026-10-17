import { beforeEach, describe, expect, it } from "vitest";
import { FALLBACK_HOLD_MS, mockDataService as mock } from "./index";
import { readDb, resetDb, updateDb } from "./store";
import { DEMO_PASSWORD } from "./seed";

const video = () => new File(["synthetic bytes"], "clip.mp4", { type: "video/mp4" });

async function login(staffId: string) {
  const result = await mock.staffLogin(staffId, DEMO_PASSWORD);
  return { token: result.token, isSuperAdmin: result.is_super_admin };
}

/** Puts every standard Auditor at their exposure limit, so no one can take a new case. */
function nobodyEligible() {
  updateDb((db) =>
    db.staff
      .filter((s) => s.role === "auditor" && !s.is_super_admin)
      .forEach((s) => (s.exposure_seconds_today = s.exposure_limit_minutes * 60)),
  );
}

describe("fallback queue (mock data source, extra-features 1.6)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetDb();
  });

  it("says who the Super Admin is at login, and no one else", async () => {
    expect((await login("superadmin-1")).isSuperAdmin).toBe(true);
    expect((await login("auditor-1")).isSuperAdmin).toBe(false);
    expect((await login("manager-1")).isSuperAdmin).toBe(false);
  });

  it("never gives the Super Admin a case through weighted assignment", async () => {
    updateDb((db) => db.staff.forEach((s) => (s.cooldown = null)));
    for (let i = 0; i < 6; i++) {
      const created = await mock.createReport(video());
      expect(created.assigned_auditor).not.toBe("superadmin-1");
    }
  });

  it("keeps a report when no standard Auditor is eligible, unowned and visible to the Super Admin only", async () => {
    nobodyEligible();
    const created = await mock.createReport(video());
    expect(created.assigned_auditor).toBeNull();
    const stored = readDb().cases.find((c) => c.case_id === created.case_id)!;
    expect(stored.case_visibility).toBe("SUPER_ADMIN_ONLY");
    // ...and it is still analysed, so it can be reviewed once someone takes it.
    expect(stored.status).toBe("AI_PROCESSING");
    expect(stored.ai_ready_at).not.toBeNull();

    const admin = await login("superadmin-1");
    const rows = await mock.getAllOpenCases(admin.token);
    expect(rows.find((r) => r.case_id === created.case_id)).toMatchObject({
      assigned_auditor_id: null,
      case_visibility: "SUPER_ADMIN_ONLY",
    });
  });

  it("shows the Super Admin every open case but only lets standard roles be refused", async () => {
    const admin = await login("superadmin-1");
    const rows = await mock.getAllOpenCases(admin.token);
    expect(rows.length).toBe(readDb().cases.filter((c) => c.status !== "COMPLETE").length);
    expect(rows.every((r) => r.case_id)).toBe(true);

    const auditor = await login("auditor-1");
    await expect(mock.getAllOpenCases(auditor.token)).rejects.toMatchObject({ status: 403 });
    const manager = await login("manager-1");
    await expect(mock.getAllOpenCases(manager.token)).rejects.toMatchObject({ status: 403 });
  });

  it("keeps a case that is with the Manager out of reach and never says who declined it", async () => {
    const admin = await login("superadmin-1");
    const flagged = readDb().cases.find((c) => c.manager_flag === "DECLINED")!;
    const row = (await mock.getAllOpenCases(admin.token)).find((r) => r.case_id === flagged.case_id)!;
    expect(row.assigned_auditor_id).toBeNull();
    expect(row.manager_flag).toBe("DECLINED");
    await expect(mock.takeCase(flagged.case_id, admin.token)).rejects.toMatchObject({ status: 409 });
    const manager = await login("manager-1");
    await expect(mock.makeCaseAvailable(flagged.case_id, manager.token)).rejects.toMatchObject({ status: 409 });
  });

  it("lets the Super Admin see a case without being able to open it", async () => {
    const admin = await login("superadmin-1");
    // AR-2026-00417 belongs to auditor-1.
    await expect(mock.getAuditorCaseDetail("AR-2026-00417", admin.token)).rejects.toMatchObject({ status: 404 });
  });

  it("lets the Super Admin take an unowned case, and not one an Auditor already owns", async () => {
    const admin = await login("superadmin-1");
    await expect(mock.takeCase("AR-2026-00433", admin.token)).resolves.toEqual({ taken: true });
    const taken = readDb().cases.find((c) => c.case_id === "AR-2026-00433")!;
    expect(taken.assigned_auditor).toBe("superadmin-1");
    expect(taken.case_visibility).toBe("ASSIGNED_ONLY");
    expect((await mock.getAuditorCases(admin.token)).map((c) => c.case_id)).toContain("AR-2026-00433");

    await expect(mock.takeCase("AR-2026-00417", admin.token)).rejects.toMatchObject({ status: 409 });
    expect(readDb().cases.find((c) => c.case_id === "AR-2026-00417")!.assigned_auditor).toBe("auditor-1");
  });

  it("protects the Super Admin like any Auditor: no take at the exposure limit", async () => {
    updateDb((db) => {
      const sa = db.staff.find((s) => s.staff_id === "superadmin-1")!;
      sa.exposure_seconds_today = sa.exposure_limit_minutes * 60;
    });
    const admin = await login("superadmin-1");
    await expect(mock.takeCase("AR-2026-00433", admin.token)).rejects.toMatchObject({ status: 409 });
    expect(readDb().cases.find((c) => c.case_id === "AR-2026-00433")!.assigned_auditor).toBeNull();
  });

  it("only the Super Admin or a Manager can make a case available, and only an unowned one", async () => {
    const auditor = await login("auditor-2");
    await expect(mock.makeCaseAvailable("AR-2026-00433", auditor.token)).rejects.toMatchObject({ status: 403 });

    const manager = await login("manager-1");
    await expect(mock.makeCaseAvailable("AR-2026-00433", manager.token)).resolves.toEqual({ available: true });
    expect(readDb().cases.find((c) => c.case_id === "AR-2026-00433")!.case_visibility).toBe("AVAILABLE_TO_AUDITORS");

    const admin = await login("superadmin-1");
    await expect(mock.makeCaseAvailable("AR-2026-00417", admin.token)).rejects.toMatchObject({ status: 409 });
  });

  it("shows released cases as metadata only", async () => {
    const auditor = await login("auditor-1");
    const available = await mock.getAvailableCases(auditor.token);
    expect(available.cases.map((c) => c.case_id)).toEqual(["AR-2026-00434"]);
    expect(Object.keys(available.cases[0]).sort()).toEqual(["case_id", "ready", "severity_tier", "status"]);
  });

  it("lets an eligible Auditor claim once; a second claim finds nothing", async () => {
    updateDb((db) => db.staff.forEach((s) => (s.cooldown = null)));
    const first = await login("auditor-1");
    const second = await login("auditor-2");
    await expect(mock.claimCase("AR-2026-00434", first.token)).resolves.toEqual({ claimed: true });
    await expect(mock.claimCase("AR-2026-00434", second.token)).rejects.toMatchObject({ status: 404 });
    expect(readDb().cases.find((c) => c.case_id === "AR-2026-00434")!.assigned_auditor).toBe("auditor-1");
  });

  it("will not let a case that was never released be claimed", async () => {
    updateDb((db) => db.staff.forEach((s) => (s.cooldown = null)));
    const auditor = await login("auditor-1");
    await expect(mock.claimCase("AR-2026-00433", auditor.token)).rejects.toMatchObject({ status: 404 });
  });

  it("blocks a claim during a cooldown and says why", async () => {
    // Seed: auditor-2 is in an S3 cooldown.
    const auditor = await login("auditor-2");
    const available = await mock.getAvailableCases(auditor.token);
    expect(available.can_claim).toBe(false);
    expect(available.reason).toMatch(/cooldown/i);
    await expect(mock.claimCase("AR-2026-00434", auditor.token)).rejects.toMatchObject({ status: 409 });
    expect(readDb().cases.find((c) => c.case_id === "AR-2026-00434")!.assigned_auditor).toBeNull();
  });

  describe("automatic placement (nobody has to click Make available)", () => {
    /** Parks a report, then makes one standard Auditor free again and ages the case past its hold. */
    async function parkedCase() {
      nobodyEligible();
      const created = await mock.createReport(video());
      return created.case_id;
    }
    const age = (caseId: string, ms: number) =>
      updateDb((db) => {
        const c = db.cases.find((x) => x.case_id === caseId)!;
        c.fallback_queued_at = new Date(Date.now() - ms).toISOString();
      });
    const freeUp = (staffId: string) =>
      updateDb((db) => {
        const st = db.staff.find((s) => s.staff_id === staffId)!;
        st.exposure_seconds_today = 0;
        st.cooldown = null;
      });

    it("a parked case says when it will be placed", async () => {
      const id = await parkedCase();
      const admin = await login("superadmin-1");
      const row = (await mock.getAllOpenCases(admin.token)).find((r) => r.case_id === id)!;
      expect(Date.parse(row.auto_release_at!) - Date.now()).toBeGreaterThan(FALLBACK_HOLD_MS - 5_000);
    });

    it("is not placed before its hold ends, even when an Auditor is free", async () => {
      const id = await parkedCase();
      freeUp("auditor-1");
      const admin = await login("superadmin-1");
      await mock.getAllOpenCases(admin.token);
      expect(readDb().cases.find((c) => c.case_id === id)!.assigned_auditor).toBeNull();
    });

    it("is placed by itself once the hold ends and a standard Auditor is eligible", async () => {
      const id = await parkedCase();
      freeUp("auditor-1");
      age(id, FALLBACK_HOLD_MS + 1_000);
      const admin = await login("superadmin-1");
      await mock.getAllOpenCases(admin.token); // any read places it; no click
      const placed = readDb().cases.find((c) => c.case_id === id)!;
      expect(placed.assigned_auditor).toBe("auditor-1");
      expect(placed.case_visibility).toBe("ASSIGNED_ONLY");
    });

    it("keeps waiting while nobody is eligible", async () => {
      const id = await parkedCase();
      age(id, FALLBACK_HOLD_MS + 1_000);
      const admin = await login("superadmin-1");
      await mock.getAllOpenCases(admin.token);
      expect(readDb().cases.find((c) => c.case_id === id)!.assigned_auditor).toBeNull();
    });

    it("never places a case on the Super Admin", async () => {
      const id = await parkedCase();
      age(id, FALLBACK_HOLD_MS + 1_000);
      const admin = await login("superadmin-1");
      await mock.getAllOpenCases(admin.token);
      expect(readDb().cases.find((c) => c.case_id === id)!.assigned_auditor).not.toBe("superadmin-1");
    });

    it("leaves hand-seeded demo cases where they are", async () => {
      freeUp("auditor-1");
      const admin = await login("superadmin-1");
      await mock.getAllOpenCases(admin.token);
      expect(readDb().cases.find((c) => c.case_id === "AR-2026-00433")!.assigned_auditor).toBeNull();
    });

    it("spreads several waiting cases across the eligible Auditors", async () => {
      nobodyEligible();
      const ids = [await mock.createReport(video()), await mock.createReport(video())].map((r) => r.case_id);
      ids.forEach((id) => age(id, FALLBACK_HOLD_MS + 1_000));
      freeUp("auditor-1");
      freeUp("auditor-2");
      const admin = await login("superadmin-1");
      await mock.getAllOpenCases(admin.token);
      const owners = ids.map((id) => readDb().cases.find((c) => c.case_id === id)!.assigned_auditor);
      expect(new Set(owners).size).toBe(2);
    });
  });
});
