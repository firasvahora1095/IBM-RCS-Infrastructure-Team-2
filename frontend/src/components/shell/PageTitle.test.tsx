import { act, render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";
import APP_SOURCE from "../../App.tsx?raw";
import { PAGE_TITLES, PageTitle, titleFor } from "./PageTitle";

/** Every real route in App.tsx. Redirects and the catch-all are listed in REDIRECTS and need no title of their own. */
const ROUTES = [...APP_SOURCE.matchAll(/<Route[^>]*\spath="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== "*");
const REDIRECTS = ["/status", "/case-confirmation", "/client"];
/** The product page itself is titled with the product name alone. */
const PRODUCT_PAGES = ["/", "/rcs"];

describe("PageTitle", () => {
  it("names every screen, so no route is left with the generic title or one left over from another page", () => {
    expect(ROUTES.length).toBeGreaterThan(30); // a guard: the route list was read
    const missing = ROUTES.filter(
      (path) =>
        !REDIRECTS.includes(path) && !PRODUCT_PAGES.includes(path) && !PAGE_TITLES.some(([known]) => known === path),
    );
    expect(missing).toEqual([]);
  });

  it("has no title for a route that no longer exists", () => {
    const stale = PAGE_TITLES.map(([path]) => path).filter((path) => !ROUTES.includes(path));
    expect(stale).toEqual([]);
  });

  it("titles a screen by what it is, keeps IDs out, and falls back to the product name", () => {
    expect(titleFor("/manager")).toBe("Overview · Responsible Content Safety (RCS)");
    expect(titleFor("/manager/deliveries/DEL-AR-2026-00404")).toBe("Delivery · Responsible Content Safety (RCS)");
    expect(titleFor("/manager/cases/AR-2026-00417/review")).not.toContain("AR-2026");
    expect(titleFor("/")).toBe("Responsible Content Safety (RCS)");
    expect(titleFor("/not-a-page")).toBe("Responsible Content Safety (RCS)");
  });

  it("changes the title as the person moves between screens, so one page's title never lingers on the next", () => {
    let go: (to: string) => void = () => {};
    function Remote() {
      go = useNavigate();
      return null;
    }
    render(
      <MemoryRouter initialEntries={["/flow"]}>
        <PageTitle />
        <Remote />
      </MemoryRouter>,
    );
    expect(document.title).toBe("Demo guide · Responsible Content Safety (RCS)");
    act(() => go("/manager"));
    expect(document.title).toBe("Overview · Responsible Content Safety (RCS)");
    act(() => go("/staff/login"));
    expect(document.title).toBe("Staff sign in · Responsible Content Safety (RCS)");
  });
});
