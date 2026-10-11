import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { AppRoutes } from "../../App";
import { mockDataService } from "../../services/mock";
import { resetDb } from "../../services/mock/store";
import { DEMO_PASSWORD } from "../../services/mock/seed";
import { STAGES } from "./flowStages";
import { FlowHubPage } from "./FlowHubPage";

/**
 * The B2B end-to-end flow has a screen for every touchpoint, and every stage on
 * the flow guide opens that screen for the person who uses it (B2B high-level
 * flow, "UX / Design Screens Needed", and the Sprint 3 plan's "full user flow"
 * task: a screen exists for every marked touchpoint, with no gaps).
 */

/** The eight screens the B2B high-level flow lists, and the route each one lives on. */
const REQUIRED_TOUCHPOINTS: { touchpoint: string; routes: string[] }[] = [
  { touchpoint: "1. Customer / integration context", routes: ["/rcs", "/rcs/get-started"] },
  { touchpoint: "2. Reporter submission", routes: ["/communityhub", "/"] },
  { touchpoint: "3. Reporter status", routes: ["/status"] },
  { touchpoint: "4. Auditor review", routes: ["/auditor"] },
  { touchpoint: "5. Case completion / delivery", routes: ["/manager/deliveries"] },
  { touchpoint: "6. Manager oversight", routes: ["/manager"] },
  { touchpoint: "7. Client report preview / approval", routes: ["/manager/reports"] },
  { touchpoint: "8. CommunityHub sign-in, report list, view, download", routes: ["/client/reports"] },
];

function Where() {
  const location = useLocation();
  return <output data-testid="where">{location.pathname}</output>;
}

async function signInFor(signIn: string | undefined) {
  if (!signIn) return;
  if (signIn.startsWith("ch-")) {
    const result = await mockDataService.clientLogin(signIn, DEMO_PASSWORD);
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
  const result = await mockDataService.staffLogin(signIn, DEMO_PASSWORD);
  sessionStorage.setItem("rcs_staff_token", result.token);
  sessionStorage.setItem("rcs_staff_role", signIn.startsWith("manager") ? "manager" : "auditor");
  sessionStorage.setItem("rcs_staff_id", signIn);
}

describe("B2B flow: a screen for every touchpoint", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetDb();
  });

  it("has a stage on the flow guide for every touchpoint in the B2B flow", () => {
    const routes = new Set(STAGES.map((s) => s.to));
    for (const { touchpoint, routes: needed } of REQUIRED_TOUCHPOINTS) {
      for (const route of needed) {
        expect(routes.has(route), `${touchpoint} has no stage for ${route}`).toBe(true);
      }
    }
  });

  it("numbers the stages in the order a case travels, with no duplicates", () => {
    const numbers = STAGES.map((s) => s.n);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect([...numbers].sort()).toEqual(numbers);
  });

  it.each(STAGES.map((s) => [`${s.n} ${s.title}`, s] as const))(
    "stage %s opens its own screen for the right person",
    async (_name, stage) => {
      await signInFor(stage.signIn);
      render(
        <MemoryRouter initialEntries={[stage.to]}>
          <AppRoutes />
          <Where />
        </MemoryRouter>,
      );
      await screen.findByRole("heading", { level: 1 });
      // Not bounced to a sign-in page or the home page.
      await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(new RegExp(`^${stage.to}$`)));
    },
  );

  it("lists every stage on the guide and doesn't show a feature pitch (client feedback, 8 Oct)", () => {
    render(
      <MemoryRouter>
        <FlowHubPage />
      </MemoryRouter>,
    );
    const stages = screen.getByRole("region", { name: "Stages" });
    expect(stages.querySelectorAll("a")).toHaveLength(STAGES.length);
    expect(screen.queryByText(/Sprint 3 HD feature/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Why it.s HD/i)).not.toBeInTheDocument();
  });
});
