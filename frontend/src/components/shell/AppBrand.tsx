import { useId, useState, type ComponentProps } from "react";
import { HeaderName, Popover, PopoverContent } from "@carbon/react";
import { Logout } from "@carbon/icons-react";
import { RcsLogo } from "../brand/RcsMark";

/**
 * The left of every app header (Auditor, Manager, Client): the RCS logo, a hairline, and which part of RCS this is.
 * The accessible name stays "RCS — {area}", so screen readers and tests hear one clear label. Below sm the area
 * label drops out and only the logo remains.
 */
export function AppBrand({
  area,
  ...link
}: { area: string } & Omit<ComponentProps<typeof HeaderName>, "prefix" | "children">) {
  return (
    <HeaderName {...link} prefix="" aria-label={`RCS — ${area}`} className="rcs-app-brand">
      <RcsLogo size={24} variant="onDark" name={false} />
      <span className="rcs-app-area">{area}</span>
    </HeaderName>
  );
}

function initialsOf(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * The account menu at the far right of every app header, as on IBM Cloud: one avatar button that opens a small panel
 * with who is signed in, their role and ID, and Sign out. It replaces a row of name text and a separate Sign out link,
 * so every control on the right of the header is the same 48px square.
 */
export function UserMenu({
  name,
  role,
  detail,
  onSignOut,
}: {
  name: string;
  /** e.g. "Auditor", "Super Auditor", "Manager", "CommunityHub · Trust & Safety". */
  role: string;
  /** A secondary line, e.g. the staff ID. */
  detail?: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <Popover
      open={open}
      align="bottom-end"
      dropShadow
      isTabTip
      onRequestClose={() => setOpen(false)}
      className="rcs-user-menu"
    >
      <button
        type="button"
        className="rcs-header-action rcs-user-trigger"
        aria-label={`Account: ${name}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="rcs-user-avatar" aria-hidden="true">
          {initialsOf(name)}
        </span>
      </button>
      <PopoverContent id={id} className="rcs-user-panel">
        <div className="rcs-user-panel-id">
          <span className="rcs-user-avatar rcs-user-avatar--lg" aria-hidden="true">
            {initialsOf(name)}
          </span>
          <span className="rcs-user-panel-text">
            <span className="rcs-user-panel-name">{name}</span>
            <span className="rcs-user-panel-role">{role}</span>
            {detail && <span className="rcs-user-panel-detail">{detail}</span>}
          </span>
        </div>
        <button type="button" className="rcs-user-panel-signout" onClick={onSignOut}>
          Sign out
          <Logout size={16} aria-hidden />
        </button>
      </PopoverContent>
    </Popover>
  );
}
