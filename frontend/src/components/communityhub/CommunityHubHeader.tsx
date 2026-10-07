import { Link as RouterLink, useLocation } from "react-router-dom";
import { Add, Notification, Search } from "@carbon/icons-react";

/**
 * The simulated CommunityHub's own header (its brand, not RCS's), shared by
 * the feed and CommunityHub's moderation queue.
 */
export function CommunityHubHeader() {
  const { pathname } = useLocation();
  const onModeration = pathname.startsWith("/communityhub/moderation");
  return (
    <header className="ch-header">
      <div className="ch-header-inner">
        <RouterLink className="ch-brand" to="/communityhub" aria-label="CommunityHub home">
          <span className="ch-logo" aria-hidden="true">
            ch
          </span>
          <span className="ch-wordmark">CommunityHub</span>
        </RouterLink>
        <label className="ch-search">
          <Search size={16} aria-hidden="true" />
          <span className="cds--visually-hidden">Search CommunityHub</span>
          <input type="search" placeholder="Search CommunityHub" />
        </label>
        <div className="ch-header-actions">
          <span className="ch-sim-pill">Simulated platform</span>
          <RouterLink
            className="ch-header-link"
            to="/communityhub/moderation"
            aria-current={onModeration ? "page" : undefined}
          >
            Moderation
          </RouterLink>
          <button type="button" className="ch-icon-button" aria-label="Notifications">
            <Notification size={20} aria-hidden="true" />
          </button>
          {!onModeration && (
            <button type="button" className="ch-button ch-button--primary">
              <Add size={16} aria-hidden="true" />
              Create post
            </button>
          )}
          <span className="ch-avatar ch-tone-1" aria-label="Your profile" role="img" style={{ inlineSize: 32, blockSize: 32 }}>
            JD
          </span>
        </div>
      </div>
    </header>
  );
}
