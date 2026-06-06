import type { IndustrialMetrics } from '@/industrial/core/metrics/types';
import type { WorkOrder } from '@/industrial/core/work-orders/types';
import type { IndustrialTask } from '@/industrial/core/tasks/types';

export interface IndustrialDashboardData {
  metrics: IndustrialMetrics;
  recentWorkOrders: WorkOrder[];
  recentTasks: IndustrialTask[];
  generatedAt: string;
}
