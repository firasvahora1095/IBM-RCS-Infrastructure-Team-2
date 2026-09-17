import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuth } from "./useAuth";
import * as apiClient from "../api/client";

describe("useAuth", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("stores the token, role and staff ID after a successful login", async () => {
    vi.spyOn(apiClient, "staffLogin").mockResolvedValueOnce({ token: "abc123", role: "auditor" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.login("auditor-1", "testpassword123");
    });

    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.role).toBe("auditor");
    expect(result.current.staffId).toBe("auditor-1");
    expect(sessionStorage.getItem("rcs_staff_token")).toBe("abc123");
  });

  it("clears the whole session on logout — Task 60's AC, at the state level", () => {
    sessionStorage.setItem("rcs_staff_token", "abc123");
    sessionStorage.setItem("rcs_staff_role", "auditor");
    sessionStorage.setItem("rcs_staff_id", "auditor-1");

    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoggedIn).toBe(true);

    act(() => result.current.logout());

    expect(result.current.isLoggedIn).toBe(false);
    expect(sessionStorage.getItem("rcs_staff_token")).toBeNull();
    expect(sessionStorage.getItem("rcs_staff_id")).toBeNull();
  });

  it("treats an unrecognised stored role as logged out", () => {
    sessionStorage.setItem("rcs_staff_token", "abc123");
    sessionStorage.setItem("rcs_staff_role", "admin");

    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoggedIn).toBe(false);
  });
});
