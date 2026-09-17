import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  Theme,
} from "@carbon/react";
import { Help } from "@carbon/icons-react";

/**
 * The persistent top bar on every public page. Matches the Normal User
 * Figma screens (nodes 5:3, 6:3, 7:16): a Gray 100 Carbon UI Shell Header
 * with the bold "IBM" prefix, the product name, and a help affordance on the
 * right. Staff pages use their own header variants (AuditorHeader,
 * ManagerHeader) because they need sign-out and the logged-in staff ID.
 *
 * Carbon renders a Header in whatever theme surrounds it, so it is wrapped
 * in the g100 (Gray 100) theme to get the dark bar from the design while the
 * rest of the page stays on the default white theme.
 *
 * The Figma file flags the "?" button as "needs accessible label" — Carbon's
 * HeaderGlobalAction requires `aria-label`, which covers that dev note.
 */
export function AppHeader() {
  return (
    <Theme theme="g100">
      <Header aria-label="IBM Content Safety Reporting">
        <HeaderName href="/" prefix="IBM">
          Content Safety Reporting
        </HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label="Help" tooltipAlignment="end">
            <Help size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>
    </Theme>
  );
}
