import type { IndustrialStation, IndustrialWorkOrder, IndustrialWorkOrderTask } from '@/industrial/work-orders/types';

export type SupervisorTaskStatus = IndustrialWorkOrderTask['status'];

export interface SupervisorStationKpi {
  station: IndustrialStation;
  pending: number;
  inProgress: number;
  completed: number;
  rejected: number;
  rework: number;
  total: number;
}

export interface SupervisorProjectKpi {
  projectId: string;
  projectCode: string;
  totalTasks: number;
  completed: number;
  rejected: number;
  progressPct: number;
  criticalPieces: string[];
}

export interface SupervisorQualityKpi {
  inspections: number;
  rejected: number;
  reworkEvents: number;
  rejectionRatePct: number;
}

export interface SupervisorTimeKpi {
  activeSessions: number;
  delayedTasks: number;
  avgMinutesPerStation: Record<IndustrialStation, number>;
}

export interface SupervisorOperatorKpi {
  operatorId: string;
  completed: number;
  rejected: number;
  errors: number;
}

export interface SupervisorSystemEventRow {
  id: string;
  type: string;
  createdAt: string;
  workOrderId?: string;
  userId?: string;
  metadata: Record<string, unknown>;
}

export interface SupervisorAlertItem {
  id: string;
  level: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  createdAt: string;
  station?: IndustrialStation;
  projectId?: string;
  projectCode?: string;
  pieceId?: string;
  nqrCode?: string;
  fullIndustrialName?: string;
}

export interface SupervisorDashboardSnapshot {
  orders: IndustrialWorkOrder[];
  tasks: IndustrialWorkOrderTask[];
  events: SupervisorSystemEventRow[];
  stationKpis: SupervisorStationKpi[];
  projectKpis: SupervisorProjectKpi[];
  qualityKpi: SupervisorQualityKpi;
  timeKpi: SupervisorTimeKpi;
  operatorKpis: SupervisorOperatorKpi[];
  alerts: SupervisorAlertItem[];
  loadedAt: string;
}
