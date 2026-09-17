import { describe, it, expect, vi, beforeEach } from "vitest";
import { createReport, getStatus, staffLogin, resolveCase } from "./client";
import { ApiError } from "./types";

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
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), { status: 200 }));

    const file = new File(["fake video bytes"], "test.mp4", { type: "video/mp4" });
    const result = await createReport(file);

    expect(result).toEqual(mockResponse);
    // Confirm we sent FormData, not JSON — the classic bug that breaks uploads.
    const [, requestInit] = vi.mocked(fetch).mock.calls[0];
    expect(requestInit?.body).toBeInstanceOf(FormData);
  });

  it("getStatus throws ApiError with the backend's message on 404", async () => {
    // A fresh Response per call: a Response body can only be read once.
    vi.mocked(fetch).mockImplementation(
      async () => new Response(JSON.stringify({ detail: "Case not found" }), { status: 404 }),
    );

    await expect(getStatus("DOES-NOT-EXIST")).rejects.toThrow(ApiError);
    await expect(getStatus("DOES-NOT-EXIST")).rejects.toThrow("Case not found");
  });

  it("falls back to a generic message when an error response isn't JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("<html>Bad Gateway</html>", { status: 502 }));

    await expect(getStatus("ANY")).rejects.toMatchObject({
      name: "ApiError",
      status: 502,
      message: "Something went wrong. Please try again.",
    });
  });

  it("staffLogin sends credentials as query params, not a JSON body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ token: "abc123", role: "auditor" }), { status: 200 }),
    );

    await staffLogin("auditor-1", "testpassword123");

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("auditor_id=auditor-1");
    expect(String(url)).toContain("password=testpassword123");
  });

  it("resolveCase only sends a severity score and comment when they're provided", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ case_id: "X", status: "Complete", final_outcome: "NO_VIOLATION_FOUND" }), {
        status: 200,
      }),
    );

    await resolveCase("X", "tok", "NO_VIOLATION_FOUND");

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("final_outcome=NO_VIOLATION_FOUND");
    expect(String(url)).not.toContain("auditor_severity_score");
    expect(String(url)).not.toContain("auditor_comment");
    expect(init?.headers).toEqual({ Authorization: "Bearer tok" });
  });
});
