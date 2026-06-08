import type { MaterialRecord } from "../materials/types";
import type { CutlistItemForPieces } from "../cutlayout/cutLayoutEngine";

const THICKNESS_EPSILON_MM = 0.2;

export type IndustrialThicknessAdjustment = {
  materialKey: string;
  requestedThicknessMm: number;
  suggestedThicknessMm: number;
  suggestedMaterialId: string;
  suggestedMaterialLabel: string;
  pieceNames: string[];
  count: number;
};

export type IndustrialThicknessResolution<T extends CutlistItemForPieces> = {
  items: T[];
  adjustments: IndustrialThicknessAdjustment[];
  unresolved: IndustrialThicknessAdjustment[];
};

function almostEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= THICKNESS_EPSILON_MM;
}

function validThickness(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeMaterialFamily(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]?\d+(?:[.,]\d+)?\s*mm?$/i, "")
    .replace(/\b\d+(?:[.,]\d+)?\s*mm?\b/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function materialRefs(material: MaterialRecord): string[] {
  return [
    material.id,
    material.label,
    material.industrialMaterialId,
    material.visualPresetId,
  ].filter((v): v is string => typeof v === "string" && v.trim() !== "");
}

function resolveMaterialRecord(
  materialKey: string,
  materials: MaterialRecord[]
): MaterialRecord | null {
  const lower = materialKey.trim().toLowerCase();
  return (
    materials.find((m) =>
      materialRefs(m).some((ref) => ref.trim().toLowerCase() === lower)
    ) ?? null
  );
}

function equivalentMaterials(
  materialKey: string,
  materials: MaterialRecord[]
): MaterialRecord[] {
  const resolved = resolveMaterialRecord(materialKey, materials);
  const family = normalizeMaterialFamily(resolved?.label ?? materialKey);
  if (!family) return [];
  return materials.filter((m) =>
    materialRefs(m).some((ref) => normalizeMaterialFamily(ref) === family)
  );
}

function validSheetMaterials(materials: MaterialRecord[]): MaterialRecord[] {
  return materials.filter(
    (m) =>
      Number(m.sheetWidthMm) > 0 &&
      Number(m.sheetHeightMm) > 0 &&
      Number(m.sheetThicknessMm) > 0
  );
}

function itemThickness(item: CutlistItemForPieces): number | null {
  return (
    validThickness(item.espessura) ??
    validThickness((item as unknown as { espessura_mm?: unknown }).espessura_mm) ??
    validThickness(item.dimensoes?.profundidade)
  );
}

function itemMaterialKey(item: CutlistItemForPieces): string {
  return String(item.materialId ?? item.material ?? "").trim() || "material";
}

function nearestSheet(
  requestedThicknessMm: number,
  candidates: MaterialRecord[]
): MaterialRecord | null {
  const valid = validSheetMaterials(candidates);
  if (valid.length === 0) return null;
  return [...valid].sort((a, b) => {
    const da = Math.abs(Number(a.sheetThicknessMm) - requestedThicknessMm);
    const db = Math.abs(Number(b.sheetThicknessMm) - requestedThicknessMm);
    if (Math.abs(da - db) > 0.001) return da - db;
    return Number(a.sheetThicknessMm) - Number(b.sheetThicknessMm);
  })[0] ?? null;
}

function adjustmentKey(materialKey: string, requestedThicknessMm: number): string {
  return `${materialKey.trim().toLowerCase()}::${requestedThicknessMm.toFixed(2)}`;
}

export function resolveIndustrialThicknesses<T extends CutlistItemForPieces>(
  items: T[],
  materials: MaterialRecord[]
): IndustrialThicknessResolution<T> {
  const adjustmentsByKey = new Map<string, IndustrialThicknessAdjustment>();
  const unresolvedByKey = new Map<string, IndustrialThicknessAdjustment>();
  const resolvedThicknessByKey = new Map<string, number>();

  for (const item of items) {
    const requested = itemThickness(item);
    if (!requested) continue;

    const materialKey = itemMaterialKey(item);
    const equivalent = equivalentMaterials(materialKey, materials);
    const candidates = equivalent.length > 0 ? equivalent : materials;
    const exactEquivalent = validSheetMaterials(candidates).find((m) =>
      almostEqual(Number(m.sheetThicknessMm), requested)
    );
    if (exactEquivalent) continue;

    const suggested = nearestSheet(requested, candidates);
    const key = adjustmentKey(materialKey, requested);
    const pieceName = String(item.nome ?? "Peça");
    if (!suggested) {
      const current = unresolvedByKey.get(key);
      if (current) {
        current.count += 1;
        if (!current.pieceNames.includes(pieceName)) current.pieceNames.push(pieceName);
      } else {
        unresolvedByKey.set(key, {
          materialKey,
          requestedThicknessMm: requested,
          suggestedThicknessMm: 0,
          suggestedMaterialId: "",
          suggestedMaterialLabel: "",
          pieceNames: [pieceName],
          count: 1,
        });
      }
      continue;
    }

    const suggestedThickness = Number(suggested.sheetThicknessMm);
    resolvedThicknessByKey.set(key, suggestedThickness);
    const current = adjustmentsByKey.get(key);
    if (current) {
      current.count += 1;
      if (!current.pieceNames.includes(pieceName)) current.pieceNames.push(pieceName);
    } else {
      adjustmentsByKey.set(key, {
        materialKey,
        requestedThicknessMm: requested,
        suggestedThicknessMm: suggestedThickness,
        suggestedMaterialId: suggested.id,
        suggestedMaterialLabel: suggested.label,
        pieceNames: [pieceName],
        count: 1,
      });
    }
  }

  const normalizedItems = items.map((item) => {
    const requested = itemThickness(item);
    if (!requested) return item;
    const key = adjustmentKey(itemMaterialKey(item), requested);
    const nextThickness = resolvedThicknessByKey.get(key);
    if (!nextThickness || almostEqual(nextThickness, requested)) return item;
    return {
      ...item,
      espessura: nextThickness,
      dimensoes: {
        ...item.dimensoes,
        profundidade: nextThickness,
      },
      sheetThicknessMm: nextThickness,
    };
  });

  return {
    items: normalizedItems,
    adjustments: [...adjustmentsByKey.values()],
    unresolved: [...unresolvedByKey.values()],
  };
}

export function formatIndustrialThicknessIssue(
  issue: IndustrialThicknessAdjustment
): string {
  const pieces = issue.pieceNames.slice(0, 4).join(", ");
  const more = issue.pieceNames.length > 4 ? "..." : "";
  const suggestion = issue.suggestedThicknessMm > 0
    ? ` Sugestão: ${issue.suggestedMaterialLabel} (${issue.suggestedThicknessMm} mm).`
    : "";
  return `${issue.materialKey}: ${issue.requestedThicknessMm} mm em ${issue.count} peça(s) (${pieces}${more}).${suggestion}`;
}
