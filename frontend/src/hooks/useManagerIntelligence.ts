import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getManagerIntelligence } from "../services";
import type { PeriodKey } from "../services/types";
import { useStaffQuery } from "./useStaffQuery";
import { DEFAULT_PERIOD, isPeriodKey, periodFor } from "../utils/periods";
import { formatPeriod } from "../utils/formatPeriod";

/** The one customer in this prototype (D5: the organisation filter exists, with one option). */
export const ORGANISATION_ID = "COMMUNITYHUB";
/** New SOS, cooldowns and failed handoffs appear without a reload (QA 7.1–7.3). */
export const REFRESH_MS = 30_000;

/**
 * The intelligence figures for the period in the URL (`?period=`), shared by the
 * Overview and Insights so both read the same numbers for the same period.
 */
export function useManagerIntelligence() {
  const [params, setParams] = useSearchParams();
  const rawPeriod = params.get("period");
  const periodKey: PeriodKey = isPeriodKey(rawPeriod) ? rawPeriod : DEFAULT_PERIOD;
  // Read the date once per visit, so the period doesn't shift while the page is open.
  const [openedAt] = useState(() => new Date());
  const { start, end } = periodFor(periodKey, openedAt);

  const intel = useStaffQuery(
    (t) => getManagerIntelligence(t, { organisationId: ORGANISATION_ID, periodStart: start, periodEnd: end }),
    `${start}:${end}`,
    { refreshMs: REFRESH_MS },
  );

  return {
    intel,
    data: intel.data,
    periodKey,
    start,
    end,
    periodLabel: formatPeriod(start, end),
    setPeriod: (key: PeriodKey) => setParams({ period: key }, { replace: true }),
    /** Cooldowns are judged against the server's calculation time, which advances with every refresh. */
    now: intel.data ? Date.parse(intel.data.calculated_at) : openedAt.getTime(),
  };
}
