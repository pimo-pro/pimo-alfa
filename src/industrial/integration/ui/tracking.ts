import type { TrackingSnapshot } from '@/industrial/core/tracking/types';
import type { IndustrialUiCard } from './types';

export function trackingSnapshotToUiCard(snapshot: TrackingSnapshot): IndustrialUiCard {
  return {
    id: snapshot.workOrderId,
    title: `Work order ${snapshot.workOrderId}`,
    subtitle: `${snapshot.completedTasks}/${snapshot.totalTasks} tarefas concluídas`,
    status: snapshot.status,
    meta: {
      progress: snapshot.progress,
      updatedAt: snapshot.updatedAt,
    },
  };
}
