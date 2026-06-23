import type { CutListItem } from '@/core/types';
import { readOfflineProjects } from '@/core/projects/projectsOfflineStore';
import { mapCutlistToIndustrialPieces, type CutlistPieceInput } from '@/industrial/integration/cutlist/cutlistToPieces';
import type { IndustrialPiece } from '@/industrial/core/pieces/types';

export interface ProjectCutlistContext {
  projectId: string;
  projectName: string;
  cutlist: CutlistPieceInput[];
  pieces: IndustrialPiece[];
}

function asProjectState(snapshot: unknown): Record<string, unknown> | null {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const root = snapshot as Record<string, unknown>;
  const nested = root.projectState;
  if (nested && typeof nested === 'object') return nested as Record<string, unknown>;
  return root;
}

function toCutlistInput(item: CutListItem): CutlistPieceInput {
  return {
    id: item.id,
    nome: item.nome,
    boxId: item.boxId,
    material: item.material,
    materialId: item.materialId,
    quantidade: item.quantidade,
    dimensoes: item.dimensoes,
    espessura: item.espessura,
    metadata: { tipo: item.tipo, panelId: item.id },
  };
}

export function resolveProjectCutlist(projectId: string): ProjectCutlistContext | null {
  const project = readOfflineProjects().find((p) => !p.deleted && p.id === projectId);
  if (!project) return null;

  const state = asProjectState(project.snapshot);
  if (!state) return null;

  const cutList = Array.isArray(state.cutList) ? (state.cutList as CutListItem[]) : [];
  const cutlist = cutList.map(toCutlistInput);
  const pieces = mapCutlistToIndustrialPieces(cutlist, { projectId });

  return {
    projectId,
    projectName: typeof state.projectName === 'string' ? state.projectName : project.name,
    cutlist,
    pieces,
  };
}
