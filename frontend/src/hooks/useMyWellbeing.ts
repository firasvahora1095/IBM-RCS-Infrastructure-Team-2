import { useCallback, useEffect, useState } from "react";
import { getMyWellbeing } from "../services";
import type { AuditorWellbeing } from "../services/types";
import { useAuth } from "./useAuth";

/** Fired after anything that changes an Auditor's exposure or cooldown, so every view refreshes. */
export const WELLBEING_CHANGED_EVENT = "rcs:wellbeing-changed";

export function notifyWellbeingChanged(): void {
  window.dispatchEvent(new Event(WELLBEING_CHANGED_EVENT));
}

/**
 * The logged-in Auditor's exposure and cooldown state, shared by the header
 * exposure bar and the dashboard banners. Returns null until loaded, and stays
 * null if the data source can't provide it (e.g. the real backend has no
 * endpoint yet) — callers then simply don't render exposure UI rather than
 * showing a made-up number.
 */
export function useMyWellbeing(): { wellbeing: AuditorWellbeing | null; refresh: () => void } {
  const { token, role } = useAuth();
  const [wellbeing, setWellbeing] = useState<AuditorWellbeing | null>(null);

  const refresh = useCallback(() => {
    if (!token || role !== "auditor") return;
    getMyWellbeing(token)
      .then(setWellbeing)
      .catch(() => setWellbeing(null));
  }, [token, role]);

  useEffect(() => {
    refresh();
    window.addEventListener(WELLBEING_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(WELLBEING_CHANGED_EVENT, refresh);
  }, [refresh]);

  return { wellbeing, refresh };
}
