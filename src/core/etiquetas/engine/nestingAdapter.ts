import type { LabelSheetPlacement } from "../qr/etiquetaCodeV5";

/** Placement mínimo do Cut Layout PRO (nesting industrial). */
export type CutLayoutPlacementLike = {
  partName: string;
  boxId: string;
  sheetIndex: number;
  x_mm: number;
  y_mm: number;
};

/**
 * Normaliza placements do nesting industrial para o UEE.
 * Preserva a ordem real dentro de cada painel (placementIndex).
 */
export function normalizeCutLayoutPlacements(
  placements?: CutLayoutPlacementLike[]
): LabelSheetPlacement[] | undefined {
  if (!placements || placements.length === 0) return undefined;

  const perSheetCounter = new Map<number, number>();

  return placements.map((p, globalIndex) => {
    const sheetIndex = p.sheetIndex ?? 0;
    const placementIndex = perSheetCounter.get(sheetIndex) ?? 0;
    perSheetCounter.set(sheetIndex, placementIndex + 1);

    return {
      partName: p.partName,
      boxId: p.boxId,
      sheetIndex,
      x_mm: p.x_mm ?? 0,
      y_mm: p.y_mm ?? 0,
      placementIndex,
      globalPlacementIndex: globalIndex,
    };
  });
}

/**
 * Payload JSON do Nesting V3 (S4) — referência para futura conversão opcional.
 * Não altera nesting-v3; apenas documenta o mapeamento UEE.
 */
export function nestingV3JsonToUnifiedHint(payload: {
  proj?: string;
  peca?: string;
  folha?: number;
}): { projectName: string; pieceName: string; sheetIndex: number } {
  return {
    projectName: String(payload.proj ?? "Projeto").slice(0, 20),
    pieceName: String(payload.peca ?? "Peça").slice(0, 20),
    sheetIndex: Math.max(0, Math.floor(Number(payload.folha ?? 1)) - 1),
  };
}
