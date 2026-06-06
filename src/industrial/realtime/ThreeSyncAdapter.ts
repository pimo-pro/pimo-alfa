import { industrialRealtimeGateway } from './IndustrialRealtimeGateway';
import type { RtoPiecePayload, RtoTaskPayload, RtoThreeSyncPayload, ThreeSyncAction } from './types';

/**
 * Adaptador de sincronização 3D em tempo real.
 * Emite triggers para actualizar o canvas sem alterar o viewer 3D.
 */
class ThreeSyncAdapter {
  private revision = 0;
  private lastSync: RtoThreeSyncPayload | null = null;

  start(): () => void {
    const unsubs = [
      industrialRealtimeGateway.on<RtoTaskPayload>('task.updated', (task) => this.onTaskChange(task)),
      industrialRealtimeGateway.on<RtoPiecePayload>('piece.updated', (piece) => this.onPieceChange(piece)),
    ];
    return () => unsubs.forEach((u) => u());
  }

  getRevision(): number {
    return this.revision;
  }

  getLastSync(): RtoThreeSyncPayload | null {
    return this.lastSync;
  }

  onSync(handler: (payload: RtoThreeSyncPayload) => void): () => void {
    return industrialRealtimeGateway.on<RtoThreeSyncPayload>('three.sync', handler);
  }

  private bump(action: ThreeSyncAction, pieceId: string, station?: string, taskId?: string): void {
    this.revision += 1;
    const payload: RtoThreeSyncPayload = {
      action,
      pieceId,
      station: station as RtoThreeSyncPayload['station'],
      taskId,
      timestamp: new Date().toISOString(),
    };
    this.lastSync = payload;
    industrialRealtimeGateway.dispatch('three.sync', payload);
  }

  private onTaskChange(task: RtoTaskPayload): void {
    const action = this.resolveAction(task.status, task.raw);
    if (!action) return;
    this.bump(action, task.pieceId, task.station, task.id);
  }

  private onPieceChange(piece: RtoPiecePayload): void {
    const action = this.resolveAction(piece.status);
    if (!action) return;
    this.bump(action, piece.pieceId, piece.station);
  }

  private resolveAction(status: string, raw?: Record<string, unknown>): ThreeSyncAction | null {
    if (status === 'completed') return 'completed';
    if (status === 'rejected') return raw?.rework ? 'rework' : 'rejected';
    if (status === 'in_progress' || status === 'pending') return 'moved';
    return null;
  }
}

export const threeSyncAdapter = new ThreeSyncAdapter();
