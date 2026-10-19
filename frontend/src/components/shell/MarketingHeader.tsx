import { Button, Header, HeaderGlobalBar, HeaderMenuItem, HeaderName, HeaderNavigation, Theme } from "@carbon/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { RcsMark } from "../brand/RcsMark";

/** The sections of the product site, in page order. The landing page marks the one being read. */
export const SITE_SECTIONS = [
  { id: "problem", label: "The problem" },
  { id: "how-it-works", label: "How it works" },
  { id: "wellbeing", label: "Wellbeing" },
  { id: "integration", label: "Integration" },
  { id: "team", label: "Meet the team" },
  { id: "faq", label: "FAQ" },
] as const;

/**
 * Header for the RCS product site (landing and organisation set-up, B2B flow
 * stages 1–2). The same g100 Carbon UI Shell as every other header in the
 * app. Section links are router links, so they scroll within the page
 * instead of reloading it; the two sign-in doors sit on the right.
 *
 * This is the site's only navigation. The landing page used to repeat these same links in a second sticky bar
 * underneath, which gave the page two rows of nav saying the same thing; `activeId` lets the landing page mark the
 * section being read here instead.
 */
export function MarketingHeader({ activeId }: { activeId?: string } = {}) {
  const navigate = useNavigate();
  return (
    <Theme theme="g100">
      <Header aria-label="IBM Responsible Content Safety">
        {/* The mark sits with the name, so the product is recognisable at a glance on every page of the site. */}
        <span className="flex items-center pl-4" aria-hidden="true">
          <RcsMark size={24} />
        </span>
        <HeaderName as={RouterLink} to="/rcs" prefix="IBM" style={{ paddingInlineStart: "0.5rem" }}>
          Responsible Content Safety
        </HeaderName>
        <HeaderNavigation aria-label="RCS" className="rcs-site-nav">
          {SITE_SECTIONS.map((section) => (
            <HeaderMenuItem
              key={section.id}
              as={RouterLink}
              to={`/rcs#${section.id}`}
              isActive={activeId === section.id}
              aria-current={activeId === section.id ? "true" : undefined}
            >
              {section.label}
            </HeaderMenuItem>
          ))}
        </HeaderNavigation>
        <HeaderGlobalBar className="min-w-0 items-center gap-4 pr-4 sm:gap-6 sm:pr-6">
          <RouterLink
            to="/client/login"
            className="hidden min-[1200px]:inline"
            style={{ fontSize: 14, color: "var(--cds-text-primary)", whiteSpace: "nowrap" }}
          >
            Client sign in
          </RouterLink>
          <RouterLink
            to="/staff/login"
            style={{ fontSize: 14, color: "var(--cds-text-primary)", whiteSpace: "nowrap" }}
          >
            Staff sign in
          </RouterLink>
          <Button size="sm" onClick={() => navigate("/rcs/get-started")}>
            Get started
          </Button>
        </HeaderGlobalBar>
      </Header>
    </Theme>
  );
}
