import { Header, HeaderGlobalBar, HeaderMenuItem, HeaderName, HeaderNavigation, Theme } from "@carbon/react";
import { Link as RouterLink } from "react-router-dom";
import { DemoDataBadge } from "./DemoDataBadge";

/**
 * Header for the RCS product site (landing and organisation onboarding,
 * B2B flow stages 1–2). Same g100 Carbon UI Shell as every other header in
 * the app, with section links and the two sign-in doors on the right.
 */
export function MarketingHeader() {
  return (
    <Theme theme="g100">
      <Header aria-label="IBM Responsible Content Safety">
        <HeaderName as={RouterLink} to="/rcs" prefix="IBM">
          RCS
        </HeaderName>
        <HeaderNavigation aria-label="RCS">
          <HeaderMenuItem href="/rcs#how-it-works">How it works</HeaderMenuItem>
          <HeaderMenuItem href="/rcs#wellbeing">Reviewer wellbeing</HeaderMenuItem>
          <HeaderMenuItem href="/rcs#platforms">For platforms</HeaderMenuItem>
        </HeaderNavigation>
        <DemoDataBadge />
        <HeaderGlobalBar className="min-w-0 items-center gap-4 pr-4 sm:gap-6 sm:pr-6">
          <RouterLink
            to="/client/login"
            className="hidden md:inline"
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
        </HeaderGlobalBar>
      </Header>
    </Theme>
  );
}
