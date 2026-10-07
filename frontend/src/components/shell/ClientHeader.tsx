import { Header, HeaderGlobalBar, HeaderName, Tag, Theme } from "@carbon/react";
import { useNavigate } from "react-router-dom";
import { useClientAuth } from "../../hooks/useClientAuth";
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

  function handleSignOut() {
    logout();
    navigate("/client/login", { replace: true });
  }

  return (
    <Theme theme="g100">
      <Header aria-label="RCS — Client reports">
        <HeaderName href="/client/reports" prefix="" aria-label="RCS — Client reports">
          RCS<span className="hidden sm:inline"> — Client reports</span>
        </HeaderName>
        <DemoDataBadge />
        <HeaderGlobalBar className="min-w-0 items-center gap-2 pr-2 sm:gap-6 sm:pr-6">
          {session && (
            <>
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
