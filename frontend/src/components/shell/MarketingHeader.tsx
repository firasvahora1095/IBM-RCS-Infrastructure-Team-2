import { useState } from "react";
import {
  Button,
  Header,
  HeaderGlobalBar,
  HeaderMenu,
  HeaderMenuButton,
  HeaderMenuItem,
  HeaderName,
  HeaderNavigation,
  HeaderSideNavItems,
  SideNav,
  SideNavItems,
  SideNavLink,
  SkipToContent,
  Theme,
} from "@carbon/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { RcsLogo } from "../brand/RcsMark";

/** The sections of the product site a visitor chooses between, in page order. */
export const SITE_SECTIONS = [
  { id: "how-it-works", label: "How it works" },
  { id: "product", label: "Product" },
  { id: "team", label: "The team" },
  { id: "security", label: "Security" },
  { id: "faq", label: "FAQ" },
] as const;

const SIGN_INS = [
  { to: "/client/login", label: "Client sign in" },
  { to: "/staff/login", label: "Staff sign in" },
] as const;

/**
 * Header for the RCS product site (landing, organisation set-up, demo guide). A white Carbon UI Shell so the gradient
 * logo sits on the surface it was designed for; the app shells inside the product stay dark.
 *
 * Five section links: the hero is the problem, and the rest of the story is reached from the page. Both sign-ins live in one "Sign in" menu so the bar has a single link style and one primary action. Below
 * 1056px Carbon hides the navigation, so a menu button opens the same links, both sign-ins and the action in a side nav.
 */
export function MarketingHeader({ activeId }: { activeId?: string } = {}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <Theme theme="white">
      <Header aria-label="Responsible Content Safety (RCS)" className="rcs-site-header">
        <SkipToContent href="#main-content" />
        <HeaderMenuButton
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          isActive={menuOpen}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        />
        <HeaderName as={RouterLink} to="/rcs" prefix="" aria-label="Responsible Content Safety (RCS) home">
          <RcsLogo size={28} name={false} />
        </HeaderName>
        <HeaderNavigation aria-label="RCS">
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
        <HeaderGlobalBar className="items-center">
          <HeaderNavigation aria-label="Sign in" className="rcs-site-signin">
            <HeaderMenu aria-label="Sign in" menuLinkName="Sign in">
              {SIGN_INS.map((s) => (
                <HeaderMenuItem key={s.to} as={RouterLink} to={s.to}>
                  {s.label}
                </HeaderMenuItem>
              ))}
            </HeaderMenu>
          </HeaderNavigation>
          <Button size="sm" className="rcs-site-header-cta" onClick={() => navigate("/rcs/get-started")}>
            Get started
          </Button>
        </HeaderGlobalBar>
        <SideNav aria-label="Site menu" expanded={menuOpen} isPersistent={false} onOverlayClick={close}>
          <SideNavItems>
            <HeaderSideNavItems>
              {SITE_SECTIONS.map((section) => (
                <SideNavLink key={section.id} as={RouterLink} to={`/rcs#${section.id}`} onClick={close}>
                  {section.label}
                </SideNavLink>
              ))}
              {SIGN_INS.map((s) => (
                <SideNavLink key={s.to} as={RouterLink} to={s.to} onClick={close}>
                  {s.label}
                </SideNavLink>
              ))}
              <SideNavLink as={RouterLink} to="/rcs/get-started" onClick={close}>
                Get started
              </SideNavLink>
            </HeaderSideNavItems>
          </SideNavItems>
        </SideNav>
      </Header>
    </Theme>
  );
}
