import { Button, Header, HeaderGlobalBar, HeaderMenuItem, HeaderName, HeaderNavigation, Tag, Theme } from "@carbon/react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { canSee, clientHome, useClientAuth } from "../../hooks/useClientAuth";
import { DemoDataBadge } from "./DemoDataBadge";

/**
 * Header for the CommunityHub client surface (B2B spec S12): same g100
 * Carbon UI Shell and sign-out treatment as the staff header, but no staff
 * navigation, demo scenarios or SOS badge. Shows whose organisation the
 * user is signed in for, so it's always clear which reports they can see.
 */
export function ClientHeader() {
  const { session, logout } = useClientAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function handleSignOut() {
    logout();
    navigate("/client/login", { replace: true });
  }

  return (
    <Theme theme="g100">
      <Header aria-label="RCS — Client portal">
        <HeaderName as={RouterLink} to={clientHome(session?.role)} prefix="" aria-label="RCS — Client portal">
          RCS<span className="hidden sm:inline"> — Client portal</span>
        </HeaderName>
        {session && (
          <HeaderNavigation aria-label="Client sections">
            {canSee(session.role, "reports") && (
              <HeaderMenuItem as={RouterLink} to="/client/reports" isActive={pathname.startsWith("/client/reports")}>
                Reports
              </HeaderMenuItem>
            )}
            {canSee(session.role, "cases") && (
              <HeaderMenuItem as={RouterLink} to="/client/cases" isActive={pathname.startsWith("/client/cases")}>
                Case results
              </HeaderMenuItem>
            )}
            <HeaderMenuItem as={RouterLink} to="/client/messages" isActive={pathname.startsWith("/client/messages")}>
              Messages
            </HeaderMenuItem>
          </HeaderNavigation>
        )}
        <DemoDataBadge />
        <HeaderGlobalBar className="min-w-0 items-center gap-2 pr-2 sm:gap-6 sm:pr-6">
          {session && (
            <>
              {/* Always reachable: a client can contact RCS from any page. */}
              <Button kind="tertiary" size="sm" onClick={() => navigate("/client/messages/new")}>
                Contact RCS
              </Button>
              <Tag type="gray" size="md" style={{ margin: 0, whiteSpace: "nowrap" }}>
                {session.organisationName}
              </Tag>
              <span
                className="hidden lg:inline"
                style={{ fontSize: 14, color: "var(--cds-text-primary)", whiteSpace: "nowrap" }}
              >
                {session.displayName}
              </span>
            </>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="cursor-pointer"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "var(--cds-text-primary)",
              fontSize: 14,
              fontFamily: "inherit",
              textDecoration: "underline",
              whiteSpace: "nowrap",
            }}
          >
            Sign out
          </button>
        </HeaderGlobalBar>
      </Header>
    </Theme>
  );
}
