import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  clientGetReport,
  clientLogin,
  createReport,
  escalateDelivery,
  generateReport,
  releaseCaseAtLimit,
  retryDelivery,
} from "./httpClient";
import { apiDataService } from "./index";
import { ApiError } from "../types";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("api client: B2B flow", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("every B2B operation is wired to the backend, none reports 'not connected'", () => {
    const ops = [
      "releaseCaseAtLimit",
      "getCustomerIntegration",
      "testIntegration",
      "listDeliveries",
      "getDelivery",
      "retryDelivery",
      "escalateDelivery",
      "listReports",
      "generateReport",
      "getReport",
      "updateReportNote",
      "releaseReport",
      "listReportAccess",
      "getGovernanceSummary",
      "clientLogin",
      "clientListReports",
      "clientGetReport",
      "clientRecordDownload",
    ] as const;
    for (const op of ops) expect(apiDataService[op].name, op).toBe(op);
  });

  it("createReport adds the optional source only when the Reporter filled it in", async () => {
    vi.mocked(fetch).mockImplementation(async () => ok({ case_id: "RCS-1", status: "Received" }));
    const file = new File(["bytes"], "clip.mp4", { type: "video/mp4" });

    await createReport(file, { url: "  https://communityhub.example/post/4721  " });
    const withSource = vi.mocked(fetch).mock.calls[0][1]?.body as FormData;
    expect(withSource.get("source_url")).toBe("https://communityhub.example/post/4721");
    expect(withSource.has("source_detail")).toBe(false);

    await createReport(file, { url: "   " });
    const blank = vi.mocked(fetch).mock.calls[1][1]?.body as FormData;
    expect(blank.has("source_url")).toBe(false);
  });

  it("generateReport posts the organisation and inclusive period as JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({ report_id: "RPT-CH-2026-09" }));
    await generateReport("tok", "COMMUNITYHUB", "2026-09-01", "2026-09-30");
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toMatch(/\/api\/manager\/reports$/);
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer tok");
    expect(JSON.parse(String(init?.body))).toEqual({
      organisation_id: "COMMUNITYHUB",
      period_start: "2026-09-01",
      period_end: "2026-09-30",
    });
  });

  it("retry, escalate and release-at-limit hit their own endpoints", async () => {
    vi.mocked(fetch).mockImplementation(async () => ok({}));
    await retryDelivery("DEL-RCS-1", "tok");
    await escalateDelivery("DEL-RCS-1", "tok", "Endpoint timing out");
    await releaseCaseAtLimit("RCS-1", "tok");
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
    expect(urls[0]).toMatch(/\/api\/manager\/deliveries\/DEL-RCS-1\/retry$/);
    expect(urls[1]).toMatch(/\/api\/manager\/deliveries\/DEL-RCS-1\/escalate$/);
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body))).toEqual({ note: "Endpoint timing out" });
    expect(urls[2]).toMatch(/\/api\/auditor\/cases\/RCS-1\/release-at-limit$/);
  });

  it("client sign-in sends user_id, and a refused report surfaces as 'not found'", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({ token: "c", user_id: "ch-user-17" }));
    await clientLogin("ch-user-17", "pw");
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toEqual({
      user_id: "ch-user-17",
      password: "pw",
    });

    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ detail: "Report not found" }), { status: 404 }));
    const refused = clientGetReport("RPT-OTHER", "c");
    await expect(refused).rejects.toBeInstanceOf(ApiError);
    await expect(refused).rejects.toThrow("Report not found");
  });
});
