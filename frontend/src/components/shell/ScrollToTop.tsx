import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Starts every new page at the top. React Router keeps the scroll position
 * between routes, so moving from a long page (CommunityHub's feed) to the
 * report form otherwise opened the form at its bottom. In-page anchors
 * (#how-it-works) are left alone.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
