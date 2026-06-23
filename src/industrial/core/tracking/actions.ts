import { getWorkOrderTrackingUnified } from '../../tracking/getWorkOrderTrackingUnified';

/**
 * @deprecated Use `getWorkOrderTrackingUnified` — delega para tracking industrial com fallback legado.
 */
export async function getWorkOrderTracking(workOrderId: string) {
  return getWorkOrderTrackingUnified(workOrderId);
}

export type { TrackingSnapshot } from './types';
