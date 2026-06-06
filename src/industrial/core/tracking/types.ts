export interface TrackingSnapshot {
  workOrderId: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  progress: number;
  updatedAt: string;
}
