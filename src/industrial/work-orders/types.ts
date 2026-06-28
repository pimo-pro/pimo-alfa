export const INDUSTRIAL_STATIONS = [
  'warehouse',
  'nesting',
  'drill',
  'orlar',
  'montagem',
  'embalagem',
] as const;

export type IndustrialStation = (typeof INDUSTRIAL_STATIONS)[number];

export type WorkOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type WorkOrderTaskStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';

export interface IndustrialWorkOrder {
  id: string;
  projectId: string;
  station: IndustrialStation;
  status: WorkOrderStatus;
  pieceIds: string[];
  operationTypes: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IndustrialWorkOrderTask {
  id: string;
  workOrderId: string;
  pieceId: string;
  operationType: string;
  status: WorkOrderTaskStatus;
  operatorId?: string;
  startedAt?: string;
  completedAt?: string;
  rejectedAt?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  /** Nomes industriais (etiqueta) — preenchido pelo resolver ou view Supabase. */
  display?: WorkOrderPieceDisplay;
}

/** Nomenclatura industrial alinhada à etiqueta v5. */
export interface WorkOrderPieceDisplay {
  projectCode: string;
  boxCode: string;
  pieceCode: string;
  fullIndustrialName: string;
  nqrCode: string;
}

export interface IndustrialWorkOrderEvent {
  id: string;
  workOrderId?: string;
  taskId?: string;
  eventType: string;
  operatorId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface GeneratedWorkOrderDraft {
  station: IndustrialStation;
  pieceIds: string[];
  operationTypes: string[];
  tasks: Array<{ pieceId: string; operationType: string }>;
}

export const STATION_LABELS: Record<IndustrialStation, string> = {
  warehouse: 'Supervisor Geral',
  nesting: 'Nesting',
  drill: 'Drill',
  orlar: 'Orlar',
  montagem: 'Montagem',
  embalagem: 'Embalagem',
};
