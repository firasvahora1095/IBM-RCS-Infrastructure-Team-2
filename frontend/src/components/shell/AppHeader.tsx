import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Header, HeaderName, HeaderGlobalBar, HeaderGlobalAction, Theme } from "@carbon/react";
import { Help } from "@carbon/icons-react";
import { DemoDataBadge } from "./DemoDataBadge";
import { RcsLogo } from "../brand/RcsMark";

/**
 * The top bar on every public reporting page. Reporters arrive here from the product site's "Report content" and from
 * a platform's report button, so it is the product site's white header: the RCS logo with the full name beside it
 * (a member of the public has never heard of "RCS"), and help on the right. Staff and Client pages use the dark app
 * shell instead, because they are signed-in tools.
 */
export function AppHeader() {
  const navigate = useNavigate();
  return (
    <Theme theme="white">
      <Header aria-label="Responsible Content Safety (RCS) — Reporting" className="rcs-site-header rcs-public-header">
        <HeaderName as={RouterLink} to="/report" prefix="" aria-label="Responsible Content Safety (RCS) — Reporting">
          <RcsLogo size={28} layout="inline" />
        </HeaderName>
        <DemoDataBadge />
        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label="Help" tooltipAlignment="end" onClick={() => navigate("/report/contact#faq")}>
            <Help size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>
    </Theme>
  );
}
