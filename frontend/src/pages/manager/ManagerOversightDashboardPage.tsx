import { useEffect, useState } from "react";
import { InlineNotification, SkeletonText } from "@carbon/react";
import { StaffHeader } from "../../components/shell/StaffHeader";
import { ManagerTopNav } from "../../components/shell/ManagerTopNav";
import { StaffPage } from "../../components/layout/StaffPage";
import { ScaffoldLabel } from "../../components/notifications/ScaffoldLabel";
import { getManagerDashboard } from "../../api/client";
import { ApiError } from "../../api/types";
import type { ManagerDashboardResponse } from "../../api/types";

/**
 * Manager Oversight Dashboard — Sprint 2 scaffold (Figma node 78:69).
 *
 * The Figma screen is a Sprint 3 design: per-Auditor exposure bars
 * ("120 / 120 min"), At limit / Approaching / Under states, cooldown
 * countdowns and an SOS banner. None of that data exists —
 * GET /api/manager/dashboard returns only { auditors: [], pending_declined_cases }
 * — and docs/ux/sprint2-build-scope-handoff.md marks this screen "static/
 * placeholder shell, no live exposure data".
 *
 * Task 96's AC is the rule here: "No placeholder section could be mistaken
 * for live data by someone unfamiliar with the build." So the page shows
 * only what the API really returns, labelled plainly as a scaffold, rather
 * than recreating the Figma table with invented numbers.
 */
export function ManagerOversightDashboardPage() {
  const [data, setData] = useState<ManagerDashboardResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getManagerDashboard()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Couldn't load dashboard data.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <StaffHeader role="manager" />
      <ManagerTopNav />
      <StaffPage clearHeader={false}>
        <div className="flex flex-col items-start gap-3">
          <h1 style={{ fontSize: 32, lineHeight: "40px", fontWeight: 600 }}>Oversight Dashboard</h1>
          <ScaffoldLabel>Scaffold — per-Auditor exposure tracking ships in Sprint 3</ScaffoldLabel>
        </div>

        {loadError && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            role="alert"
            title="Couldn't load dashboard data."
            subtitle={loadError}
            style={{ maxWidth: "100%" }}
          />
        )}

        {!data && !loadError && <SkeletonText paragraph lineCount={3} />}

        {data && (
          <section aria-label="Live data available in Sprint 2" className="flex flex-col gap-4">
            <p style={{ fontSize: 14, lineHeight: "20px", color: "#525252", maxWidth: 640 }}>
              {data.auditors.length === 0
                ? "No auditor workload data is available yet — this table will populate once exposure tracking ships in Sprint 3."
                : // The row shape hasn't been observed with real data yet, so
                  // report the count rather than guess at columns.
                  `${data.auditors.length} auditor record(s) returned. A workload table for them ships with exposure tracking in Sprint 3.`}
            </p>
            <dl className="flex items-baseline gap-2" style={{ fontSize: 14 }}>
              <dt style={{ color: "#525252" }}>Pending declined cases:</dt>
              <dd style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                {data.pending_declined_cases}
              </dd>
            </dl>
          </section>
        )}
      </StaffPage>
    </>
  );
}
