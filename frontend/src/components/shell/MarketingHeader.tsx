import { Header, HeaderGlobalBar, HeaderMenuItem, HeaderName, HeaderNavigation, Theme } from "@carbon/react";
import { Link as RouterLink } from "react-router-dom";
import { DemoDataBadge } from "./DemoDataBadge";

/**
 * Header for the RCS product site (landing and organisation set-up, B2B flow
 * stages 1–2). The same g100 Carbon UI Shell as every other header in the
 * app. Section links are router links, so they scroll within the page
 * instead of reloading it; the two sign-in doors sit on the right.
 */
export function MarketingHeader() {
  return (
    <Theme theme="g100">
      <Header aria-label="IBM Responsible Content Safety">
        <HeaderName as={RouterLink} to="/rcs" prefix="IBM">
          Responsible Content Safety
        </HeaderName>
        <HeaderNavigation aria-label="RCS">
          <HeaderMenuItem as={RouterLink} to="/rcs#how-it-works">
            How it works
          </HeaderMenuItem>
          <HeaderMenuItem as={RouterLink} to="/rcs#wellbeing">
            Reviewer wellbeing
          </HeaderMenuItem>
          <HeaderMenuItem as={RouterLink} to="/rcs#integration">
            Integration
          </HeaderMenuItem>
          <HeaderMenuItem as={RouterLink} to="/rcs#faq">
            FAQ
          </HeaderMenuItem>
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
          <RouterLink to="/staff/login" style={{ fontSize: 14, color: "var(--cds-text-primary)", whiteSpace: "nowrap" }}>
            Staff sign in
          </RouterLink>
        </HeaderGlobalBar>
      </Header>
    </Theme>
  );
}
