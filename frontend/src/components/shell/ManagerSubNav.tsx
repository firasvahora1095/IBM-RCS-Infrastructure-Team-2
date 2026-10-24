import { Link, useLocation } from "react-router-dom";
import { activeSection, WORK_QUEUES } from "./managerSections";

/**
 * The work queues, one step under Overview: the pages a Manager opens many times a day (SOS inbox, Reassignment
 * Queue, Client messages), so they are always one click away and never hidden behind a list. They sit in a
 * second, quieter row so the main bar stays at six sections, and appear only on Overview and its sub-pages
 * because that is where this work happens.
 */
export function ManagerSubNav({
  sosCount = 0,
  reassignmentCount = 0,
  messageCount = 0,
}: {
  sosCount?: number;
  reassignmentCount?: number;
  messageCount?: number;
}) {
  const { pathname } = useLocation();
  if (activeSection(pathname) !== "/manager") return null;
  return (
    <nav
      aria-label="Work queues"
      className="flex flex-wrap gap-2 px-6 sm:px-8"
      style={{ backgroundColor: "var(--cds-layer-01)", borderBottom: "1px solid var(--cds-border-subtle-01)" }}
    >
      {WORK_QUEUES.map((queue) => {
        const isActive = queue.owns.some((pattern) => pattern.test(pathname));
        return (
          <Link
            key={queue.path}
            to={queue.path}
            aria-current={isActive ? "page" : undefined}
            className="rcs-subnav-link"
            data-active={isActive || undefined}
          >
            {queue.label}
            {/* Red is for SOS alone, the one thing that is urgent. Every other queue waiting on the Manager gets the
                same count in a neutral dark badge, so a number always means "waiting for you" and only red means "now". */}
            {queue.path === "/manager/sos" && sosCount > 0 && <span className="rcs-subnav-count">{sosCount}</span>}
            {queue.path === "/manager/reassignment" && reassignmentCount > 0 && (
              <span className="rcs-subnav-count rcs-subnav-count--neutral">{reassignmentCount}</span>
            )}
            {queue.path === "/manager/messages" && messageCount > 0 && (
              <span className="rcs-subnav-count rcs-subnav-count--neutral">{messageCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
