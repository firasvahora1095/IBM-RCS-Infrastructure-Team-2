import { useNavigate } from "react-router-dom";
import { Header, HeaderName, HeaderGlobalBar, HeaderGlobalAction, Theme } from "@carbon/react";
import { Help } from "@carbon/icons-react";
import { DemoDataBadge } from "./DemoDataBadge";
import { RcsMark } from "../brand/RcsMark";

/**
 * The persistent top bar on every public page. Matches the Normal User
 * Figma screens (nodes 5:3, 6:3, 7:16): a Gray 100 Carbon UI Shell Header
 * with the RCS mark and name ("RCS — Reporting", one product name across the app), and a help affordance on the
 * right. Staff pages use StaffHeader instead, because they need sign-out and
 * the logged-in staff ID.
 *
 * Carbon renders a Header in whatever theme surrounds it, so it is wrapped
 * in the g100 (Gray 100) theme to get the dark bar from the design while the
 * rest of the page stays on the default white theme.
 *
 * The Figma file flags the "?" button as "needs accessible label" — Carbon's
 * HeaderGlobalAction requires `aria-label`, which covers that dev note.
 */
export function AppHeader() {
  const navigate = useNavigate();
  return (
    <Theme theme="g100">
      <Header aria-label="Responsible Content Safety (RCS) — Reporting">
        {/* The RCS mark sits with the name so the product is recognisable on every page. */}
        <span className="flex items-center pl-4" aria-hidden="true">
          <RcsMark size={24} />
        </span>
        <HeaderName href="/report" prefix="" aria-label="Responsible Content Safety (RCS) — Reporting" style={{ paddingInlineStart: "0.5rem" }}>
          RCS<span className="hidden md:inline"> · Responsible Content Safety</span>
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
