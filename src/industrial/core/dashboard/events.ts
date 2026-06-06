export const DASHBOARD_EVENTS = {
  refreshRequested: 'dashboard_refresh_requested',
  metricsUpdated: 'dashboard_metrics_updated',
} as const;

export type DashboardEvent = (typeof DASHBOARD_EVENTS)[keyof typeof DASHBOARD_EVENTS];
