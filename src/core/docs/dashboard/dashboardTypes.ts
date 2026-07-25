/**
 * Tipos do hub — Dashboard Avançado (Fase 12).
 */

export type DashboardTone = "neutral" | "blue" | "green" | "amber";

export type DashboardKpi = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  tone: DashboardTone;
  deltaLabel?: string;
  sparkline: number[];
};

export type DashboardPoint = { x: number; y: number; label?: string };

export type DashboardSeries = {
  id: string;
  label: string;
  color: string;
  points: DashboardPoint[];
};

export type DashboardBar = {
  id: string;
  label: string;
  value: number;
  color: string;
};

export type DashboardSlice = {
  id: string;
  label: string;
  value: number;
  color: string;
};

export type DashboardGraph =
  | {
      id: string;
      kind: "timeline" | "line";
      title: string;
      series: DashboardSeries[];
    }
  | {
      id: string;
      kind: "bars";
      title: string;
      bars: DashboardBar[];
      max?: number;
    }
  | {
      id: string;
      kind: "donut";
      title: string;
      slices: DashboardSlice[];
    };

export type DashboardHealthStatus = "ok" | "warn" | "fail";

export type DashboardHealthItem = {
  id: string;
  label: string;
  status: DashboardHealthStatus;
  detail: string;
};

export type DashboardHealth = {
  overall: DashboardHealthStatus;
  items: DashboardHealthItem[];
};

export type DashboardCounters = {
  completed: number;
  inProgress: number;
  planned: number;
  total: number;
  completionPercent: number;
  roadmapProgress: number;
};

export type HubDashboardSnapshot = {
  generatedAtLabel: string;
  kpis: DashboardKpi[];
  counters: DashboardCounters;
  graphs: DashboardGraph[];
  health: DashboardHealth;
};
