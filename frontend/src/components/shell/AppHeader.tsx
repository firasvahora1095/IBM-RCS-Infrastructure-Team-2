import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
} from "@carbon/react";
import { Help } from "@carbon/icons-react";

/**
 * The persistent top bar on every public page. Matches the Normal User
 * Figma screens (nodes 5:3, 6:3, 7:16): a Gray 100 Carbon UI Shell Header
 * with the bold "IBM" prefix, the product name, and a help affordance on the
 * right. Staff pages use their own header variants (AuditorHeader,
 * ManagerHeader) because they need sign-out and the logged-in staff ID.
 *
 * The Figma file flags the "?" button as "needs accessible label" — Carbon's
 * HeaderGlobalAction requires `aria-label`, which covers that dev note.
 */
export function AppHeader() {
  return (
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
  );
}
