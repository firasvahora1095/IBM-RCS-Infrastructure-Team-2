import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createReport,
  getStatus,
  staffLogin,
  resolveCase,
} from "./httpClient";
import { ApiError } from "../types";

describe("api client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("createReport posts multipart form data and returns the parsed case", async () => {
    const mockResponse = {
      case_id: "INSZNNJI4P",
      status: "Being Reviewed",
      assigned_auditor: "auditor-1",
    };

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const file = new File(["fake video bytes"], "test.mp4", {
      type: "video/mp4",
    });

    const result = await createReport(file);

    expect(result).toEqual(mockResponse);

    // Confirm we sent FormData, not JSON — the classic bug that breaks uploads.
    const [, requestInit] = vi.mocked(fetch).mock.calls[0];

    expect(requestInit?.body).toBeInstanceOf(FormData);
  });

  it("getStatus throws ApiError with the backend's message on 404", async () => {
    // A fresh Response per call: a Response body can only be read once.
    vi.mocked(fetch).mockImplementation(
      async () =>
        new Response(JSON.stringify({ detail: "Case not found" }), {
          status: 404,
        }),
    );

    await expect(getStatus("DOES-NOT-EXIST")).rejects.toThrow(ApiError);

    await expect(getStatus("DOES-NOT-EXIST")).rejects.toThrow(
      "Case not found",
    );
  });

  it("falls back to a generic message when an error response isn't JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("<html>Bad Gateway</html>", { status: 502 }),
    );

    await expect(getStatus("ANY")).rejects.toMatchObject({
      name: "ApiError",
      status: 502,
      message: "Something went wrong. Please try again.",
    });
  });

  it("rejects a successful response that isn't JSON instead of returning null", async () => {
    // A wrong VITE_API_BASE_URL makes the web server answer with its HTML page
    // and a 200; returning null here left screens stuck on their skeleton.
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("<!doctype html><html></html>", { status: 200 }),
    );

    await expect(getStatus("ANY")).rejects.toMatchObject({
      name: "ApiError",
      status: 502,
    });
  });

  it("staffLogin sends credentials as a JSON body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          token: "abc123",
          role: "auditor",
        }),
        { status: 200 },
      ),
    );

    await staffLogin("auditor-1", "testpassword123");

    const [url, init] = vi.mocked(fetch).mock.calls[0];

    expect(String(url)).toContain("/api/staff/login");
    expect(String(url)).not.toContain("auditor_id=");
    expect(String(url)).not.toContain("password=");

    expect(init?.method).toBe("POST");

    expect(init?.headers).toEqual(
      expect.objectContaining({
        "Content-Type": "application/json",
      }),
    );

    expect(JSON.parse(String(init?.body))).toEqual({
      staff_id: "auditor-1",
      password: "testpassword123",
    });
  });

  it("resolveCase sends the final outcome as JSON and omits optional fields when not provided", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          case_id: "X",
          status: "Complete",
          final_outcome: "NO_VIOLATION_FOUND",
        }),
        { status: 200 },
      ),
    );

    await resolveCase("X", "tok", "NO_VIOLATION_FOUND");

    const [url, init] = vi.mocked(fetch).mock.calls[0];

    expect(String(url)).toContain("/api/auditor/cases/X/resolve");
    expect(String(url)).not.toContain("final_outcome=");
    expect(String(url)).not.toContain("auditor_severity_score");
    expect(String(url)).not.toContain("auditor_comment");

    expect(init?.method).toBe("POST");

    expect(init?.headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer tok",
        "Content-Type": "application/json",
      }),
    );

    expect(JSON.parse(String(init?.body))).toEqual({
      final_outcome: "NO_VIOLATION_FOUND",
    });
  });

  it("resolveCase includes severity score and comment when provided", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          case_id: "X",
          status: "Complete",
          final_outcome: "POLICY_VIOLATION_FOUND",
        }),
        { status: 200 },
      ),
    );

    await resolveCase(
      "X",
      "tok",
      "POLICY_VIOLATION_FOUND",
      85,
      "Auditor adjusted the AI severity score.",
    );

    const [url, init] = vi.mocked(fetch).mock.calls[0];

    expect(String(url)).toContain("/api/auditor/cases/X/resolve");

    expect(init?.headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer tok",
        "Content-Type": "application/json",
      }),
    );

    expect(JSON.parse(String(init?.body))).toEqual({
      final_outcome: "POLICY_VIOLATION_FOUND",
      auditor_severity_score: 85,
      auditor_comment: "Auditor adjusted the AI severity score.",
    });
  });
});