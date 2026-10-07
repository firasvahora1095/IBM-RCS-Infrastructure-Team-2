import { beforeEach, describe, expect, it } from "vitest";
import { mockDataService as mock } from "./index";
import { readDb, resetDb, updateDb } from "./store";
import { DEMO_PASSWORD } from "./seed";

const client = async (id: string) => (await mock.clientLogin(id, DEMO_PASSWORD)).token;
const staff = async (id: string) => (await mock.staffLogin(id, DEMO_PASSWORD)).token;

describe("Per-case results for CommunityHub (mock)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetDb();
  });

  it("gives each CommunityHub account only what its role needs", async () => {
    expect((await mock.clientLogin("ch-user-17", DEMO_PASSWORD)).role).toBe("REPORTS");
    expect((await mock.clientLogin("ch-mod-04", DEMO_PASSWORD)).role).toBe("TRUST_SAFETY");

    const reports = await client("ch-user-17");
    await expect(mock.clientListCaseResults(reports)).rejects.toMatchObject({ status: 403 });
    expect((await mock.clientListReports(reports)).length).toBeGreaterThan(0);

    const moderator = await client("ch-mod-04");
    await expect(mock.clientListReports(moderator)).rejects.toMatchObject({ status: 403 });
    expect((await mock.clientListCaseResults(moderator)).length).toBeGreaterThan(0);

    const admin = await client("ch-admin-01");
    expect((await mock.clientListReports(admin)).length).toBeGreaterThan(0);
    expect((await mock.clientListCaseResults(admin)).length).toBeGreaterThan(0);

    // Every client user can still contact RCS.
    expect(await mock.clientListMessages(reports)).toBeDefined();
    expect(await mock.clientListMessages(moderator)).toBeDefined();
  });

  it("shares agreed facts only, and never delivery errors", async () => {
    const results = await mock.clientListCaseResults(await client("ch-mod-04"));
    for (const r of results) {
      expect(Object.keys(r).sort()).toEqual(
        [
          "case_id",
          "completed_at",
          "delivered_at",
          "delivery_id",
          "final_severity",
          "outcome",
          "platform_action",
          "post_url",
          "status",
        ].sort(),
      );
      expect(["DELIVERED", "ON_ITS_WAY"]).toContain(r.status);
    }
  });

  it("records the moderator's action and shows it to the Manager", async () => {
    const moderator = await client("ch-mod-04");
    const waiting = (await mock.clientListCaseResults(moderator)).find(
      (r) => r.status === "DELIVERED" && !r.platform_action,
    )!;
    const after = await mock.clientRecordPlatformAction(waiting.delivery_id, moderator, "REMOVED", "Mock: removed.");
    expect(after.platform_action).toMatchObject({ action: "REMOVED", by: "ch-mod-04", note: "Mock: removed." });

    const delivery = await mock.getDelivery(waiting.delivery_id, await staff("manager-1"));
    expect(delivery.platform_action?.action).toBe("REMOVED");

    // A second action replaces the first.
    const changed = await mock.clientRecordPlatformAction(waiting.delivery_id, moderator, "KEPT");
    expect(changed.platform_action?.action).toBe("KEPT");
  });

  it("refuses an action on a result that hasn't arrived, or from a Reports account", async () => {
    const moderator = await client("ch-mod-04");
    const pending = readDb().deliveries.find((d) => d.delivery_status !== "SUCCESS")!;
    await expect(mock.clientRecordPlatformAction(pending.delivery_id, moderator, "REMOVED")).rejects.toMatchObject({
      status: 409,
    });
    const any = readDb().deliveries.find((d) => d.delivery_status === "SUCCESS")!;
    await expect(mock.clientRecordPlatformAction(any.delivery_id, await client("ch-user-17"), "KEPT")).rejects.toMatchObject({
      status: 403,
    });
    await expect(mock.clientRecordPlatformAction("DEL-NOPE", moderator, "KEPT")).rejects.toMatchObject({ status: 404 });
  });

  it("delivers 'closed without a decision' when a Manager closes a case, with no severity", async () => {
    const declined = readDb().cases.find((c) => c.manager_flag === "DECLINED")!;
    await mock.closeWithoutReassignment(declined.case_id, await staff("manager-1"), "Mock: duplicate report.");
    const delivery = readDb().deliveries.find((d) => d.case_id === declined.case_id)!;
    expect(delivery.outcome).toBe("CLOSED_NO_REASSIGNMENT");
    expect(delivery.final_severity).toBeNull();
  });

  it("only shows the client their own organisation's results", async () => {
    updateDb((db) => {
      db.deliveries[0].organisation_id = "OTHERORG";
    });
    const id = readDb().deliveries[0].delivery_id;
    const results = await mock.clientListCaseResults(await client("ch-admin-01"));
    expect(results.some((r) => r.delivery_id === id)).toBe(false);
  });

  it("lists the client accounts and their roles for the Manager", async () => {
    const accounts = await mock.listClientAccounts("COMMUNITYHUB", await staff("manager-1"));
    expect(accounts.map((a) => a.role).sort()).toEqual(["ADMIN", "REPORTS", "TRUST_SAFETY"]);
  });
});
