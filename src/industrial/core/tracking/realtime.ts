import { subscribeToTasks } from '@/industrial/core/tasks/realtime';
import { subscribeToWorkOrders } from '@/industrial/core/work-orders/realtime';

export function subscribeToTrackingUpdates(handler: () => void) {
  const unsubscribeTasks = subscribeToTasks(handler);
  const unsubscribeWorkOrders = subscribeToWorkOrders(handler);

  return () => {
    unsubscribeTasks();
    unsubscribeWorkOrders();
  };
}
