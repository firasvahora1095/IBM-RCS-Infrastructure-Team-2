import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { AppRoutes } from "../App";
import APP_SOURCE from "../App.tsx?raw";
import { mockDataService } from "../services/mock";
import { resetDb } from "../services/mock/store";
import { DEMO_PASSWORD } from "../services/mock/seed";

/**
 * Sprint 3 Week 2, "Non-functional B2B click-through": every touchpoint is clickable and the flow
 * has no dead links. Each screen of every journey is rendered as the person who uses it, and every
 * link on it must lead to a route that exists. A link to an unknown path would otherwise fall
 * through to the catch-all and quietly send the person home.
 */

/** Every real route in App.tsx, as a matcher. The catch-all "*" is excluded on purpose. */
const ROUTES = [...APP_SOURCE.matchAll(/<Route[^>]*\spath="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((path) => path !== "*")
  .map((path) => new RegExp(`^${path.replace(/:[^/]+/g, "[^/]+")}$`));

type Person = "public" | "auditor" | "manager" | "client";

const JOURNEYS: Record<Person, string[]> = {
  public: [
    "/rcs",
    "/rcs/get-started",
    "/communityhub",
    "/communityhub/moderation",
    "/",
    "/status",
    "/flow",
    "/staff/login",
    "/client/login",
  ],
  auditor: ["/auditor", "/auditor/cooldown"],
  manager: [
    "/manager",
    "/manager/insights",
    "/manager/cases",
    "/manager/sos",
    "/manager/reassignment",
    "/manager/validation",
    "/manager/deliveries",
    "/manager/reports",
    "/manager/messages",
    "/manager/customers/communityhub",
    "/manager/audit-logs",
  ],
  client: ["/client/reports", "/client/messages"],
};

async function signIn(person: Person) {
  if (person === "public") return;
  if (person === "client") {
    const result = await mockDataService.clientLogin("ch-user-17", DEMO_PASSWORD);
    sessionStorage.setItem("rcs_client_token", result.token);
    sessionStorage.setItem(
      "rcs_client_profile",
      JSON.stringify({
        userId: result.user_id,
        displayName: result.display_name,
        organisationId: result.organisation_id,
        organisationName: result.organisation_name,
        role: result.role ?? "REPORTS",
      }),
    );
    return;
  }
  const staffId = person === "manager" ? "manager-1" : "auditor-1";
  const result = await mockDataService.staffLogin(staffId, DEMO_PASSWORD);
  sessionStorage.setItem("rcs_staff_token", result.token);
  sessionStorage.setItem("rcs_staff_role", person);
  sessionStorage.setItem("rcs_staff_id", staffId);
}

function internalPaths(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLAnchorElement>("a[href]")]
    .map((a) => a.getAttribute("href") ?? "")
    .filter((href) => href.startsWith("/") && !href.startsWith("//"))
    .map((href) => href.split("#")[0].split("?")[0] || "/");
}

describe("the B2B click-through has no dead links", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetDb();
  });

  it("reads the routes from App.tsx", () => {
    // Guards the test itself: if the pattern stops matching, it would pass by checking nothing.
    expect(ROUTES.length).toBeGreaterThan(30);
    expect(ROUTES.some((r) => r.test("/manager/cases/ABC123/review"))).toBe(true);
  });

  for (const [person, paths] of Object.entries(JOURNEYS) as [Person, string[]][]) {
    for (const path of paths) {
      it(`${person}: every link on ${path} leads somewhere real`, async () => {
        await signIn(person);
        const { container } = render(
          <MemoryRouter initialEntries={[path]}>
            <AppRoutes />
          </MemoryRouter>,
        );
        // Wait for the screen's own data to load, so links that appear after loading are checked too.
        await waitFor(() => expect(container.querySelectorAll("a[href]").length).toBeGreaterThan(0));
        await new Promise((resolve) => setTimeout(resolve, 150));

        const dead = [...new Set(internalPaths(container))].filter((href) => !ROUTES.some((r) => r.test(href)));
        expect(dead, `${path} links to routes that do not exist: ${dead.join(", ")}`).toEqual([]);
      });
    }
  }
});
