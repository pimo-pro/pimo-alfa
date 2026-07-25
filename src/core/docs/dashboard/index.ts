/**
 * Dashboard Avançado — barrel (Fase 12).
 */

export type {
  DashboardTone,
  DashboardKpi,
  DashboardPoint,
  DashboardSeries,
  DashboardBar,
  DashboardSlice,
  DashboardGraph,
  DashboardHealthStatus,
  DashboardHealthItem,
  DashboardHealth,
  DashboardCounters,
  HubDashboardSnapshot,
} from "./dashboardTypes";

export { buildDashboardKpis } from "./dashboardKpis";
export { buildDashboardGraphs } from "./dashboardGraphs";
export { buildDashboardHealth } from "./dashboardHealth";
export { loadHubDashboard } from "./loadHubDashboard";
