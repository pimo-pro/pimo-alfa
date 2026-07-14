/**
 * Auto-correção industrial de espessura/chapa — restaura fluxo automático na exportação.
 * Usa resolveIndustrialThicknesses (core) sem alterar CNC/cutlayout.
 */

import type { MaterialRecord } from "../../core/materials/types";
import type { CutlistItemForPieces } from "../../core/cutlayout/cutLayoutEngine";
import {
  resolveIndustrialThicknesses,
  type IndustrialThicknessAdjustment,
} from "../../core/cnc/industrialThicknessResolution";
import { throwFirstUnresolvedThicknessError } from "../../core/industrial/industrialThicknessErrors";
import {
  notifyAutoThicknessCorrections,
  type NotifyUserOptions,
} from "../errors/industrialNotificationBridge";

export type IndustrialThicknessAutoCorrectionResult<T extends CutlistItemForPieces> = {
  items: T[];
  applied: IndustrialThicknessAdjustment[];
  unresolved: IndustrialThicknessAdjustment[];
};

function adjustmentKey(materialKey: string, requestedThicknessMm: number): string {
  return `${materialKey.trim().toLowerCase()}::${requestedThicknessMm.toFixed(2)}`;
}

function itemMaterialKey(item: CutlistItemForPieces): string {
  return String(item.materialId ?? item.material ?? "").trim() || "material";
}

function itemThickness(item: CutlistItemForPieces): number | null {
  const n = Number(item.espessura);
  if (Number.isFinite(n) && n > 0) return n;
  const prof = Number(item.dimensoes?.profundidade);
  if (Number.isFinite(prof) && prof > 0) return prof;
  return null;
}

/** Aplica materialId sugerido quando a auto-correção escolhe outra chapa. */
export function autoFixMaterialThickness<T extends CutlistItemForPieces>(
  items: T[],
  adjustments: IndustrialThicknessAdjustment[]
): T[] {
  if (adjustments.length === 0) return items;
  const byKey = new Map(
    adjustments
      .filter((a) => a.suggestedMaterialId)
      .map((a) => [adjustmentKey(a.materialKey, a.requestedThicknessMm), a])
  );
  if (byKey.size === 0) return items;

  return items.map((item) => {
    const requested = itemThickness(item);
    if (!requested) return item;
    const adj = byKey.get(adjustmentKey(itemMaterialKey(item), requested));
    if (!adj?.suggestedMaterialId) return item;
    return {
      ...item,
      materialId: adj.suggestedMaterialId,
      material: adj.suggestedMaterialLabel || item.material,
    };
  });
}

/** Garante espessura/chapa alinhada com catálogo (delega em resolveIndustrialThicknesses). */
export function autoFixSheetThickness<T extends CutlistItemForPieces>(
  items: T[],
  materials: MaterialRecord[]
): IndustrialThicknessAutoCorrectionResult<T> {
  const resolution = resolveIndustrialThicknesses(items, materials);
  return {
    items: resolution.items,
    applied: resolution.adjustments,
    unresolved: resolution.unresolved,
  };
}

function runAutoCorrection<T extends CutlistItemForPieces>(
  items: T[],
  materials: MaterialRecord[],
  options?: NotifyUserOptions
): T[] {
  const { items: sheetFixed, applied, unresolved } = autoFixSheetThickness(items, materials);

  if (unresolved.length > 0) {
    throwFirstUnresolvedThicknessError(items, unresolved);
  }

  const corrected = autoFixMaterialThickness(sheetFixed, applied);

  if (applied.length > 0) {
    notifyAutoThicknessCorrections(applied, options);
  }

  return corrected;
}

/** Auto-correção no pipeline CNC. */
export function autoFixCncThicknessMismatch<T extends CutlistItemForPieces>(
  items: T[],
  materials: MaterialRecord[],
  options?: NotifyUserOptions
): T[] {
  return runAutoCorrection(items, materials, options);
}

/** Auto-correção no pipeline Nesting por espessura. */
export function autoFixNestingThickness<T extends CutlistItemForPieces>(
  items: T[],
  materials: MaterialRecord[],
  options?: NotifyUserOptions
): T[] {
  return runAutoCorrection(items, materials, options);
}

/** Validação + auto-correção de espessura de material (exportação). */
export function validateMaterialThickness<T extends CutlistItemForPieces>(
  items: T[],
  materials: MaterialRecord[],
  options?: NotifyUserOptions
): T[] {
  return runAutoCorrection(items, materials, options);
}

/** Validação + auto-correção CNC (substitui confirmação manual). */
export function validateCncExport<T extends CutlistItemForPieces>(
  items: T[],
  materials: MaterialRecord[],
  options?: NotifyUserOptions
): T[] {
  return autoFixCncThicknessMismatch(items, materials, options);
}

/** Validação + auto-correção Nesting. */
export function validateNestingThickness<T extends CutlistItemForPieces>(
  items: T[],
  materials: MaterialRecord[],
  options?: NotifyUserOptions
): T[] {
  return autoFixNestingThickness(items, materials, options);
}

/** Prepara itens para exportação industrial completa (ZIP / arquivo completo). */
export function generateFullIndustrialFile<T extends CutlistItemForPieces>(
  items: T[],
  materials: MaterialRecord[],
  options?: NotifyUserOptions
): T[] {
  return runAutoCorrection(items, materials, options);
}

/** Alias semântico para arquivo completo. */
export function buildCompleteExport<T extends CutlistItemForPieces>(
  items: T[],
  materials: MaterialRecord[],
  options?: NotifyUserOptions
): T[] {
  return generateFullIndustrialFile(items, materials, options);
}
