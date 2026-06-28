import { applyResultados } from '@/context/projectState';
import { reviveState } from '@/context/projectPersistence';
import { buildBoxNomeByIdFromBoxes, piecePrefixForCutLayoutPro } from '@/core/cutlayout/cutLayoutProPieceNaming';
import { buildCutlistItemsForIndustrialExport } from '@/core/fabrication/buildCutlistItemsForIndustrialExport';
import {
  buildV5BottomStripIndustrialName,
  resolveNomeIndustrialForEtiqueta,
  sanitizeIndustrialSegment,
} from '@/core/etiquetas/industrialDisplayName';
import { buildEtiquetaCodeV5 } from '@/core/etiquetas/qr/etiquetaCodeV5';
import { readOfflineProjects } from '@/core/projects/projectsOfflineStore';
import type { CutListItem } from '@/core/types';

import { resolveProjectDisplayName } from '../integration/projetos/projetosProjectLinks';

import { resolveProjectCutlist } from './resolveProjectCutlist';
import type { IndustrialWorkOrderTask, WorkOrderPieceDisplay } from './types';

const METADATA_KEYS = {
  projectCode: 'project_code',
  boxCode: 'box_code',
  pieceCode: 'piece_code',
  fullIndustrialName: 'full_industrial_name',
  nqrCode: 'nqr_code',
} as const;

function cutlistItemMatchesId(item: CutListItem, pieceId: string): boolean {
  const candidates = [
    item.id,
    `${item.boxId}:${item.nome}`,
    `${item.boxId}:${item.id}`,
    (item as CutListItem & { shortCode?: string }).shortCode,
    (item as CutListItem & { panelId?: string }).panelId,
  ].filter(Boolean);
  return candidates.some((value) => String(value) === pieceId);
}

export function projectCodeFromName(projectName: string): string {
  const code = sanitizeIndustrialSegment(projectName);
  return (code || 'PROJETO').toUpperCase();
}

export function boxCodeFromName(boxName: string): string {
  return sanitizeIndustrialSegment(boxName) || 'CAIXA';
}

export function pieceCodeFromItem(item: CutListItem): string {
  return piecePrefixForCutLayoutPro(item);
}

export function displayToTaskMetadata(display: WorkOrderPieceDisplay): Record<string, string> {
  return {
    [METADATA_KEYS.projectCode]: display.projectCode,
    [METADATA_KEYS.boxCode]: display.boxCode,
    [METADATA_KEYS.pieceCode]: display.pieceCode,
    [METADATA_KEYS.fullIndustrialName]: display.fullIndustrialName,
    [METADATA_KEYS.nqrCode]: display.nqrCode,
  };
}

export function readDisplayFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): WorkOrderPieceDisplay | null {
  if (!metadata) return null;
  const fullIndustrialName = String(metadata[METADATA_KEYS.fullIndustrialName] ?? '').trim();
  if (!fullIndustrialName) return null;

  return {
    projectCode: String(metadata[METADATA_KEYS.projectCode] ?? '').trim() || '—',
    boxCode: String(metadata[METADATA_KEYS.boxCode] ?? '').trim() || '—',
    pieceCode: String(metadata[METADATA_KEYS.pieceCode] ?? '').trim() || '—',
    fullIndustrialName,
    nqrCode: String(metadata[METADATA_KEYS.nqrCode] ?? '').trim() || fullIndustrialName,
  };
}

type ProjectCutlistMatch = {
  item: CutListItem;
  projectName: string;
  boxName: string;
  cutlist: CutListItem[];
};

function findCutlistMatch(projectId: string, pieceId: string): ProjectCutlistMatch | null {
  const project = readOfflineProjects().find((p) => !p.deleted && p.id === projectId);
  if (!project) return null;

  const revived = reviveState(project.snapshot?.projectState);
  if (!revived) return null;
  const state = applyResultados(revived);
  const projectName = project.name?.trim() || state.projectName?.trim() || 'Projeto';

  const fromState = Array.isArray(state.cutList) ? (state.cutList as CutListItem[]) : [];
  const cutlist =
    fromState.length > 0
      ? fromState
      : buildCutlistItemsForIndustrialExport({
          boxes: state.boxes ?? [],
          rules: state.rules,
          materialId: state.materialId,
          projectName,
          remates: state.remates ?? [],
          rodapes: state.rodapes ?? [],
          extractedPartsByBoxId: state.extractedPartsByBoxId,
        });

  const item = cutlist.find((row) => cutlistItemMatchesId(row, pieceId));
  if (!item) return null;

  const boxNomeById = buildBoxNomeByIdFromBoxes(state.boxes ?? []);
  const boxName = boxNomeById[item.boxId ?? ''] ?? item.boxId ?? 'Caixa';

  return { item, projectName, boxName, cutlist };
}

/** Resolve nomenclatura industrial a partir da cutlist local (igual à etiqueta). */
export function resolveWorkOrderPieceDisplay(
  pieceId: string,
  projectId: string,
): WorkOrderPieceDisplay | null {
  const match = findCutlistMatch(projectId, pieceId);
  if (!match) return null;

  const { item, projectName, boxName, cutlist } = match;
  const nomeIndustrial = resolveNomeIndustrialForEtiqueta(item, projectName, boxName);
  const projectCode = projectCodeFromName(projectName);
  const boxCode = boxCodeFromName(boxName);
  const pieceCode = pieceCodeFromItem(item);
  const fullIndustrialName = buildV5BottomStripIndustrialName(projectName, boxName, nomeIndustrial);
  const piecesInBox = cutlist.filter((row) => row.boxId === item.boxId).length || 1;

  const nqrCode = buildEtiquetaCodeV5({
    projectName,
    boxName,
    nomeIndustrial,
    pieceSeq: 1,
    totalPiecesInSheet: piecesInBox,
  });

  return {
    projectCode,
    boxCode,
    pieceCode,
    fullIndustrialName,
    nqrCode,
  };
}

export function resolveWorkOrderPieceFromTask(
  task: IndustrialWorkOrderTask,
  projectId: string,
): WorkOrderPieceDisplay {
  const fromMeta = readDisplayFromMetadata(task.metadata);
  if (fromMeta) return fromMeta;

  const fromCutlist = resolveWorkOrderPieceDisplay(task.pieceId, projectId);
  if (fromCutlist) return fromCutlist;

  return {
    projectCode: projectCodeFromName(resolveProjectDisplayName(projectId)),
    boxCode: '—',
    pieceCode: task.pieceId.slice(0, 16),
    fullIndustrialName: task.pieceId,
    nqrCode: task.pieceId,
  };
}

export function getWorkOrderPieceDisplay(
  task: IndustrialWorkOrderTask,
  projectId: string,
): WorkOrderPieceDisplay {
  return task.display ?? resolveWorkOrderPieceFromTask(task, projectId);
}

export function buildWorkOrderPieceDisplayMap(
  projectId: string,
  pieceIds: string[],
): Map<string, WorkOrderPieceDisplay> {
  const map = new Map<string, WorkOrderPieceDisplay>();
  for (const pieceId of pieceIds) {
    const display = resolveWorkOrderPieceDisplay(pieceId, projectId);
    if (display) map.set(pieceId, display);
  }
  return map;
}

export function attachDisplayToTasks(
  tasks: IndustrialWorkOrderTask[],
  projectIdByWorkOrderId: Map<string, string>,
): IndustrialWorkOrderTask[] {
  return tasks.map((task) => {
    const projectId = projectIdByWorkOrderId.get(task.workOrderId) ?? '';
    const display = resolveWorkOrderPieceFromTask(task, projectId);
    return { ...task, display };
  });
}

export function resolveWorkOrderProjectDisplay(projectId: string): string {
  const ctx = resolveProjectCutlist(projectId);
  if (ctx) return projectCodeFromName(ctx.projectName);
  return projectCodeFromName(resolveProjectDisplayName(projectId));
}
