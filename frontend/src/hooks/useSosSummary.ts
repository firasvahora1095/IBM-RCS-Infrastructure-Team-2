import { useCallback, useEffect, useState } from "react";
import { getSosSummary } from "../services";
import type { SosSummary } from "../services/types";
import { useAuth } from "./useAuth";

/** Fired after anything that changes SOS alerts, so the banner and badge refresh everywhere. */
export const SOS_CHANGED_EVENT = "rcs:sos-changed";

export function notifySosChanged(): void {
  window.dispatchEvent(new Event(SOS_CHANGED_EVENT));
}

/** How often the Manager's SOS state is re-checked, so a new alert appears without a reload. */
const POLL_MS = 30_000;

/**
 * Unresolved SOS alerts for the signed-in Manager (MR-SOS-03). Null until
 * loaded, and stays null if the data source can't provide it, so no banner
 * or badge is ever shown with an invented count.
 */
export function useSosSummary(): SosSummary | null {
  const { token, role } = useAuth();
  const [summary, setSummary] = useState<SosSummary | null>(null);

  const refresh = useCallback(() => {
    if (!token || role !== "manager") return;
    getSosSummary(token)
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [token, role]);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, POLL_MS);
    window.addEventListener(SOS_CHANGED_EVENT, refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(SOS_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return summary;
}
