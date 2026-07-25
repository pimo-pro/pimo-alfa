/**
 * Loader local do Dashboard Avançado — sem fetch.
 */

import { buildDashboardKpis } from "./dashboardKpis";
import { buildDashboardGraphs } from "./dashboardGraphs";
import { buildDashboardHealth } from "./dashboardHealth";
import type { HubDashboardSnapshot } from "./dashboardTypes";

export function loadHubDashboard(): HubDashboardSnapshot {
  const { kpis, counters } = buildDashboardKpis();
  return {
    generatedAtLabel: new Date().toLocaleString("pt-PT", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    kpis,
    counters,
    graphs: buildDashboardGraphs(),
    health: buildDashboardHealth(),
  };
}
