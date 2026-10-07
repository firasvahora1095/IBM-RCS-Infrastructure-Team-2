import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Starts every new page at the top, and scrolls to an in-page anchor
 * (e.g. /rcs#how-it-works) when the URL has one. React Router keeps the
 * scroll position between routes and doesn't follow hashes on its own.
 * The offset under the fixed header comes from `scroll-padding-top` in
 * styles/_b2b-kit.scss, so headings are never hidden behind it.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    // Wait a frame so the target section has rendered.
    const id = decodeURIComponent(hash.slice(1));
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
}
