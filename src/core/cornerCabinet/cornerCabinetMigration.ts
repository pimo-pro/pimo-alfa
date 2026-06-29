import type { WorkspaceBox } from "../types";
import {
  CORNER_DIREITA_INFERIOR_V2_ID,
  CORNER_FF_COZINHA_INFERIOR_ID,
  isCornerLayoutSsotModel,
} from "./cornerCabinetRules";
import { syncCornerWorkspaceBoxDoorsLayer } from "./cornerCabinetLayers";

/** IDs de catálogo/baseCabinetId do módulo Canto Direita Inferior legado. */
export const LEGACY_CORNER_DIREITA_INFERIOR_IDS = [CORNER_FF_COZINHA_INFERIOR_ID] as const;

export function isLegacyCornerDireitaInferiorId(id?: string | null): boolean {
  return typeof id === "string" && (LEGACY_CORNER_DIREITA_INFERIOR_IDS as readonly string[]).includes(id);
}

/**
 * Migra caixas `corner-ff-cozinha-inferior` para `corner-direita-inferior-v2`
 * e reconstrói doorsLayer a partir do layout industrial SSOT.
 */
export function migrateCornerDireitaInferiorBoxToV2<T extends WorkspaceBox>(box: T): T {
  const legacy =
    isLegacyCornerDireitaInferiorId(box.baseCabinetId) ||
    isLegacyCornerDireitaInferiorId(box.catalogItemId);
  if (!legacy && isCornerLayoutSsotModel(box.baseCabinetId)) {
    return syncCornerWorkspaceBoxDoorsLayer(box);
  }
  if (!legacy) return box;

  const migrated: T = {
    ...box,
    baseCabinetId: CORNER_DIREITA_INFERIOR_V2_ID,
    catalogItemId:
      box.catalogItemId === CORNER_FF_COZINHA_INFERIOR_ID
        ? CORNER_DIREITA_INFERIOR_V2_ID
        : box.catalogItemId,
    nome:
      box.nome === "Canto — Direita (Inferior) [legado]" || box.nome?.includes("[legado]")
        ? "Canto — Direita (Inferior)"
        : box.nome,
  };
  return syncCornerWorkspaceBoxDoorsLayer(migrated);
}

export function migrateCornerDireitaInferiorBoxes<T extends WorkspaceBox>(boxes: T[]): T[] {
  return boxes.map(migrateCornerDireitaInferiorBoxToV2);
}
