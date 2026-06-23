import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  getWorkOrderTrackingIndustrial,
  getWorkOrderTrackingLegacy,
  getWorkOrderTrackingUnified,
} from './getWorkOrderTrackingUnified';
import { buildTrackingSnapshot } from './buildTrackingSnapshot';

vi.mock('../persistence/work-orders/loadWorkOrders', () => ({
  loadWorkOrderById: vi.fn(),
  loadTasksByWorkOrder: vi.fn(),
}));

vi.mock('../core/work-orders/actions', () => ({
  getWorkOrderById: vi.fn(),
}));

vi.mock('../core/tasks/actions', () => ({
  getTasksByWorkOrder: vi.fn(),
}));

import { loadWorkOrderById, loadTasksByWorkOrder } from '../persistence/work-orders/loadWorkOrders';
import { getWorkOrderById } from '../core/work-orders/actions';
import { getTasksByWorkOrder } from '../core/tasks/actions';

describe('buildTrackingSnapshot', () => {
  it('calcula progresso 50% com metade das tarefas concluídas', () => {
    const snap = buildTrackingSnapshot('wo-1', 'in_progress', [
      { status: 'completed' },
      { status: 'pending' },
    ], '2026-06-23T10:00:00Z');
    expect(snap.progress).toBe(50);
    expect(snap.completedTasks).toBe(1);
    expect(snap.totalTasks).toBe(2);
  });

  it('progresso 0% sem tarefas', () => {
    const snap = buildTrackingSnapshot('wo-1', 'pending', [], '2026-06-23T10:00:00Z');
    expect(snap.progress).toBe(0);
    expect(snap.totalTasks).toBe(0);
  });
});

describe('getWorkOrderTrackingUnified', () => {
  beforeEach(() => {
    vi.mocked(loadWorkOrderById).mockReset();
    vi.mocked(loadTasksByWorkOrder).mockReset();
    vi.mocked(getWorkOrderById).mockReset();
    vi.mocked(getTasksByWorkOrder).mockReset();
  });

  it('prefere dados industriais quando WO existe', async () => {
    vi.mocked(loadWorkOrderById).mockResolvedValue({
      id: 'wo-ind',
      projectId: 'p1',
      station: 'drill',
      status: 'in_progress',
      pieceIds: ['piece-1'],
      operationTypes: ['drill'],
      metadata: {},
      createdAt: '2026-06-23T09:00:00Z',
      updatedAt: '2026-06-23T10:00:00Z',
    });
    vi.mocked(loadTasksByWorkOrder).mockResolvedValue([
      {
        id: 't1',
        workOrderId: 'wo-ind',
        pieceId: 'piece-1',
        operationType: 'drill',
        status: 'completed',
        metadata: {},
        createdAt: '2026-06-23T09:00:00Z',
        updatedAt: '2026-06-23T10:00:00Z',
      },
    ]);

    const result = await getWorkOrderTrackingUnified('wo-ind');
    expect(result?.workOrderId).toBe('wo-ind');
    expect(result?.progress).toBe(100);
    expect(getWorkOrderById).not.toHaveBeenCalled();
  });

  it('faz fallback legado quando industrial não encontra WO', async () => {
    vi.mocked(loadWorkOrderById).mockResolvedValue(null);
    vi.mocked(getWorkOrderById).mockResolvedValue({
      id: 'wo-leg',
      title: 'Legado',
      status: 'pending',
      updated_at: '2026-06-23T08:00:00Z',
    } as Awaited<ReturnType<typeof getWorkOrderById>>);
    vi.mocked(getTasksByWorkOrder).mockResolvedValue([
      { status: 'pending' } as Awaited<ReturnType<typeof getTasksByWorkOrder>>[number],
    ]);

    const result = await getWorkOrderTrackingUnified('wo-leg');
    expect(result?.workOrderId).toBe('wo-leg');
    expect(getWorkOrderById).toHaveBeenCalledWith('wo-leg');
  });

  it('getWorkOrderTrackingIndustrial retorna null sem WO', async () => {
    vi.mocked(loadWorkOrderById).mockResolvedValue(null);
    expect(await getWorkOrderTrackingIndustrial('missing')).toBeNull();
  });

  it('getWorkOrderTrackingLegacy retorna null sem WO legado', async () => {
    vi.mocked(getWorkOrderById).mockResolvedValue(null);
    expect(await getWorkOrderTrackingLegacy('missing')).toBeNull();
  });
});
