import type { IndustrialPiece } from '@/industrial/core/pieces/types';
import {
  getWorkOrderPieceDisplay,
  resolveWorkOrderPieceDisplay,
} from '@/industrial/work-orders/resolveWorkOrderPiece';
import { resolveProjectCutlist } from '@/industrial/work-orders/resolveProjectCutlist';
import type { IndustrialStation, IndustrialWorkOrder, IndustrialWorkOrderTask } from '@/industrial/work-orders/types';
import type { StationListSection } from '@/industrial/ui/components/stationTypes';

function pieceById(orders: IndustrialWorkOrder[], pieceId: string): IndustrialPiece | undefined {
  for (const order of orders) {
    const ctx = resolveProjectCutlist(order.projectId);
    const found = ctx?.pieces.find((p) => p.id === pieceId);
    if (found) return found;
  }
  return undefined;
}

function pieceLabel(task: IndustrialWorkOrderTask, orders: IndustrialWorkOrder[]): string {
  const order = orders.find((o) => o.id === task.workOrderId);
  if (task.display?.fullIndustrialName) return task.display.fullIndustrialName;
  if (order) {
    const display = resolveWorkOrderPieceDisplay(task.pieceId, order.projectId);
    if (display) return display.fullIndustrialName;
  }
  const piece = pieceById(orders, task.pieceId);
  return piece?.name ?? getWorkOrderPieceDisplay(task, order?.projectId ?? '').fullIndustrialName;
}

function taskItems(tasks: IndustrialWorkOrderTask[], orders: IndustrialWorkOrder[]) {
  return tasks.map((task) => {
    const order = orders.find((o) => o.id === task.workOrderId);
    const display = getWorkOrderPieceDisplay(task, order?.projectId ?? '');
    return {
      id: task.id,
      pieceId: task.pieceId,
      primary: pieceLabel(task, orders),
      secondary: `${display.nqrCode} · ${task.operationType} · ${task.status}`,
    };
  });
}

export function buildStationListSections(
  station: IndustrialStation,
  tasks: IndustrialWorkOrderTask[],
  orders: IndustrialWorkOrder[],
): StationListSection[] {
  const active = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const items = taskItems(active, orders);

  switch (station) {
    case 'warehouse': {
      const materials = new Map<string, number>();
      for (const task of active) {
        const piece = pieceById(orders, task.pieceId);
        const material = piece?.material ?? 'Material não definido';
        materials.set(material, (materials.get(material) ?? 0) + 1);
      }
      return [
        {
          title: 'Materiais',
          items: Array.from(materials.entries()).map(([material, count]) => ({
            id: material,
            primary: material,
            secondary: `${count} peça(s)`,
          })),
        },
        { title: 'Entregas pendentes', items },
      ];
    }

    case 'nesting': {
      const sheets = new Map<string, IndustrialWorkOrderTask[]>();
      for (const task of active) {
        const piece = pieceById(orders, task.pieceId);
        const sheet = piece?.material ?? 'Chapa padrão';
        const list = sheets.get(sheet) ?? [];
        list.push(task);
        sheets.set(sheet, list);
      }
      return [
        {
          title: 'Chapas',
          items: Array.from(sheets.entries()).map(([sheet, sheetTasks]) => ({
            id: sheet,
            primary: sheet,
            secondary: `${sheetTasks.length} peça(s)`,
          })),
        },
        {
          title: 'Peças por chapa',
          items: Array.from(sheets.entries()).flatMap(([sheet, sheetTasks]) =>
            sheetTasks.map((task) => ({
              id: `${sheet}-${task.id}`,
              pieceId: task.pieceId,
              primary: pieceLabel(task, orders),
              secondary: `Chapa: ${sheet}`,
            })),
          ),
        },
      ];
    }

    case 'drill':
      return [
        {
          title: 'Peças com TXML',
          items: active.map((task) => {
            const piece = pieceById(orders, task.pieceId);
            const hasTxml = Boolean(piece?.metadata?.txml ?? piece?.metadata?.drillFile);
            return {
              id: task.id,
              pieceId: task.pieceId,
              primary: pieceLabel(task, orders),
              secondary: hasTxml ? 'TXML disponível' : 'TXML pendente',
            };
          }),
        },
        { title: 'Furação pendente', items },
      ];

    case 'orlar':
      return [
        {
          title: 'Peças com bordas',
          items: active.map((task) => {
            const piece = pieceById(orders, task.pieceId);
            const edges = piece?.metadata?.edges ?? piece?.metadata?.orlas;
            return {
              id: task.id,
              pieceId: task.pieceId,
              primary: pieceLabel(task, orders),
              secondary: edges ? `Bordas: ${String(edges)}` : '4 bordas (padrão)',
            };
          }),
        },
        { title: 'Orlagem pendente', items },
      ];

    case 'montagem': {
      const modules = new Map<string, IndustrialWorkOrderTask[]>();
      for (const task of active) {
        const order = orders.find((o) => o.id === task.workOrderId);
        const boxCode =
          task.display?.boxCode ??
          (order ? resolveWorkOrderPieceDisplay(task.pieceId, order.projectId)?.boxCode : null) ??
          'Modulo';
        const list = modules.get(boxCode) ?? [];
        list.push(task);
        modules.set(boxCode, list);
      }
      return [
        {
          title: 'Módulos',
          items: Array.from(modules.entries()).map(([mod, modTasks]) => ({
            id: mod,
            primary: mod,
            secondary: `${modTasks.length} peça(s)`,
          })),
        },
        { title: 'Montagem pendente', items },
      ];
    }

    case 'embalagem':
      return [
        {
          title: 'Peças finais',
          items: active.map((task) => {
            const piece = pieceById(orders, task.pieceId);
            return {
              id: task.id,
              pieceId: task.pieceId,
              primary: pieceLabel(task, orders),
              secondary: `${piece?.dimensions.widthMm ?? '—'}×${piece?.dimensions.heightMm ?? '—'} mm`,
            };
          }),
        },
        { title: 'Embalagem pendente', items },
      ];

    default:
      return [{ title: 'Tarefas', items }];
  }
}

export function buildCanvasPieces(
  tasks: IndustrialWorkOrderTask[],
  orders: IndustrialWorkOrder[],
  selectedPieceId: string | null,
): Array<{
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  color?: string;
  highlighted?: boolean;
}> {
  const active = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const uniquePieceIds = Array.from(new Set(active.map((t) => t.pieceId)));

  return uniquePieceIds.map((pieceId) => {
    const task = active.find((t) => t.pieceId === pieceId);
    const piece = pieceById(orders, pieceId);
    const label = task ? pieceLabel(task, orders) : piece?.name ?? pieceId;
    return {
      id: pieceId,
      label,
      widthMm: piece?.dimensions.widthMm ?? 600,
      heightMm: piece?.dimensions.heightMm ?? 400,
      thicknessMm: piece?.dimensions.thicknessMm ?? 18,
      color: pieceId === selectedPieceId ? '#38bdf8' : '#8b9cb3',
      highlighted: pieceId === selectedPieceId,
    };
  });
}
