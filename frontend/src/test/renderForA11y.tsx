import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { axe } from "jest-axe";

/**
 * Renders a page inside a router at `path` (matched by `routePattern`, so
 * URL params like :caseId resolve) and returns axe-core's results.
 *
 * Colour contrast can't be evaluated in jsdom (there is no rendering), so
 * axe skips that rule here; contrast is checked separately by running axe
 * in a real browser during QA.
 */
export async function runAxeOnPage(page: ReactElement, path = "/", routePattern = path) {
  const { container } = render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePattern} element={page} />
      </Routes>
    </MemoryRouter>,
  );
  return { container, axe: () => axe(container) };
}

/** Logs in a staff role for tests of protected pages. */
export function seedStaffSession(role: "auditor" | "manager") {
  sessionStorage.setItem("rcs_staff_token", "test-token");
  sessionStorage.setItem("rcs_staff_role", role);
  sessionStorage.setItem("rcs_staff_id", `${role}-1`);
}
