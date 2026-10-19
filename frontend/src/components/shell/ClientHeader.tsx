import { Button, Header, HeaderGlobalBar, Tag, Theme } from "@carbon/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { clientHome, useClientAuth } from "../../hooks/useClientAuth";
import { DemoDataBadge } from "./DemoDataBadge";
import { AppBrand, UserChip } from "./AppBrand";

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
              <span className="hidden lg:inline-flex">
                <UserChip name={session.displayName} label={session.displayName} />
              </span>
            </>
          )}
          <button type="button" onClick={handleSignOut} className="rcs-header-action">
            Sign out
          </button>
        </HeaderGlobalBar>
      </Header>
    </Theme>
  );
}
