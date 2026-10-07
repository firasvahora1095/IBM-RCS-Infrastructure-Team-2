import { beforeEach, describe, expect, it } from "vitest";
import { mockDataService as mock } from "./index";
import { readDb, resetDb } from "./store";
import { DEMO_PASSWORD } from "./seed";

const staff = async (id: string) => (await mock.staffLogin(id, DEMO_PASSWORD)).token;
const client = async () => (await mock.clientLogin("ch-user-17", DEMO_PASSWORD)).token;

describe("Contact RCS (mock)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetDb();
  });

  it("goes Sent → Seen by RCS → Answered, and the client never sees the Manager's name", async () => {
    const c = await client();
    const sent = await mock.clientSendMessage(c, {
      topic: "ACCOUNT_ACCESS",
      subject: "A colleague needs access",
      body: "Mock: how do we add a second user?",
    });
    expect(sent.status).toBe("SENT");

    const m = await staff("manager-1");
    expect((await mock.listClientMessages(m))[0].message_id).toBe(sent.message_id); // waiting first
    expect((await mock.getClientMessage(sent.message_id, m)).status).toBe("SEEN");
    expect((await mock.clientGetMessage(sent.message_id, c)).status).toBe("SEEN");

    const answered = await mock.replyClientMessage(sent.message_id, m, "Mock: we'll set one up today.");
    expect(answered.reply!.by).not.toBe("RCS");
    const seenByClient = await mock.clientGetMessage(sent.message_id, c);
    expect(seenByClient.status).toBe("ANSWERED");
    expect(seenByClient.reply!.by).toBe("RCS");
  });

  it("rejects an empty message, and a report that isn't released", async () => {
    const c = await client();
    await expect(mock.clientSendMessage(c, { topic: "OTHER", subject: "Hi", body: "  " })).rejects.toMatchObject({
      status: 400,
    });
    const draft = readDb().reports.find((r) => r.status === "DRAFT")!;
    await expect(
      mock.clientSendMessage(c, { topic: "REPORT_QUESTION", report_id: draft.report_id, subject: "Q", body: "Q" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("refuses a staff token on client messages and a client token on the Manager inbox", async () => {
    await expect(mock.clientListMessages(await staff("manager-1"))).rejects.toMatchObject({ status: 401 });
    await expect(mock.listClientMessages(await client())).rejects.toMatchObject({ status: 401 });
  });
});

describe("Request support (mock)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetDb();
  });

  it("keeps the reason, lets the Auditor withdraw, and stops the Manager approving a withdrawn break", async () => {
    const a = await staff("auditor-1");
    const request_id = (await mock.requestWellbeingSupport(a, "BREAK_REQUEST", undefined, "Mock: long morning.")).request_id!;
    const mine = (await mock.getMyWellbeing(a)).requests!;
    expect(mine[0]).toMatchObject({ id: request_id, status: "OPEN", reason: "Mock: long morning." });

    await mock.withdrawWellbeingRequest(a, request_id);
    expect((await mock.getMyWellbeing(a)).requests![0].status).toBe("WITHDRAWN");
    await expect(mock.approveBreakRequest(request_id, await staff("manager-1"))).rejects.toMatchObject({ status: 409 });
  });

  it("marks a talk request as followed up", async () => {
    const a = await staff("auditor-1");
    const request_id = (await mock.requestWellbeingSupport(a, "TALK_TO_MANAGER")).request_id!;
    const m = await staff("manager-1");
    await mock.markWellbeingFollowedUp(request_id, m);
    const detail = await mock.getAuditorDetail("auditor-1", m);
    expect(detail.wellbeing_requests.find((r) => r.id === request_id)!.status).toBe("FOLLOWED_UP");
  });

  it("counts cases today from the same records the Auditor detail lists", async () => {
    const m = await staff("manager-1");
    for (const row of await mock.getAuditorOverview(m)) {
      const detail = await mock.getAuditorDetail(row.auditor_id, m);
      expect(detail.recent_cases).toHaveLength(row.cases_today);
    }
  });
});
