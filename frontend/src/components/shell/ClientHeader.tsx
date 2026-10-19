import { Header, HeaderGlobalBar, Theme } from "@carbon/react";
import { Email } from "@carbon/icons-react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { clientHome, useClientAuth } from "../../hooks/useClientAuth";
import { DemoDataBadge } from "./DemoDataBadge";
import { AppBrand, UserMenu } from "./AppBrand";

/**
 * Header for the CommunityHub client surface (B2B spec S12): same g100
 * Carbon UI Shell and sign-out treatment as the staff header, but no staff
 * navigation, demo scenarios or SOS badge. Shows whose organisation the
 * user is signed in for, so it's always clear which reports they can see.
 */
export function ClientHeader() {
  const { session, logout } = useClientAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    logout();
    navigate("/client/login", { replace: true });
  }

  return (
    <Theme theme="g100">
      <Header aria-label="RCS — Client portal" className="rcs-app-header">
        <AppBrand area="Client portal" as={RouterLink} to={clientHome(session?.role)} />
        <DemoDataBadge />
        <HeaderGlobalBar className="rcs-app-actions">
          {session && (
            <>
              {/* Always reachable: a Client can contact RCS from any page. */}
              <button
                type="button"
                className="rcs-header-action"
                onClick={() => navigate("/client/messages/new")}
              >
                <Email size={16} aria-hidden />
                <span className="hidden md:inline">Contact RCS</span>
                <span className="cds--visually-hidden md:hidden">Contact RCS</span>
              </button>
              <span className="rcs-header-divider" aria-hidden="true" />
              <span className="rcs-header-org">{session.organisationName}</span>
              <UserMenu
                name={session.displayName}
                role={session.organisationName}
                detail={session.userId}
                onSignOut={handleSignOut}
              />
            </>
          )}
        </HeaderGlobalBar>
      </Header>
    </Theme>
  );
}
