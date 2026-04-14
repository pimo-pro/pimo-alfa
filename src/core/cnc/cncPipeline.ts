import { cutlistToPieces, runCutLayout, type CutLayoutEngineOptions, type CutlistItemForPieces } from "../cutlayout/cutLayoutEngine";
import type { CutLayoutResult, SheetDefinition } from "../cutlayout/cutLayoutTypes";
import { exportCncFiles } from "./cncExport";
import { getLayoutKerfMmForCncNesting } from "./tcnGenerator";
import { getSettings } from "../settings/settingsService";
import { listMaterials } from "../materials/service";

const TOOL_113_NOMINAL_DIAMETER_MM = 12;
const MIN_TOOL_DIAMETER_MM = 1;

function contourToolRadiusMmFromSettings(settings: ReturnType<typeof getSettings>): number {
  const fromCnc = Number(settings?.cnc?.diametroFresaContornoMm);
  const d =
    Number.isFinite(fromCnc) && fromCnc > 0
      ? Math.max(MIN_TOOL_DIAMETER_MM, fromCnc)
      : TOOL_113_NOMINAL_DIAMETER_MM;
  return d / 2;
}

/** Opções de nesting alinhadas ao TCN: kerf = minSpacing (entre contornos) + 2×raio da fresa. */
export function getDefaultCncLayoutOptions(
  engine: "classic" | "strip" = "classic"
): CutLayoutEngineOptions {
  const settings = getSettings();
  const kerf_mm = getLayoutKerfMmForCncNesting(settings);
  const toolRadiusMm = contourToolRadiusMmFromSettings(settings);
  const kerfFloor = (settings?.cnc?.minSpacingFloorMm ?? 13.5) + 2 * Math.max(0, toolRadiusMm);
  return {
    kerf_mm,
    kerf_mm_floor: kerfFloor,
    margin_mm_floor: getSettings()?.cnc?.sheetMarginFloorMm ?? 4,
    groupByThicknessOnly: false,
    minUtilizationPercent: 0.9,
    rotationPreferenceMode: "aggressive",
    rotationWeight: 1.2,
    rotationPenalty: 0.15,
    scoreModel: "v32",
    nestingEngine: engine,
    // Nesting industrial multi-solução:
    // - múltiplos starts independentes (ordens de peças distintas)
    // - combinações de heurísticas skyline/shelf/guillotine + first/best fit
    // - meta-heurística com LNS + simulated annealing para escolher melhor solução final
    useMetaHeuristics: true,
    metaHeuristics: {
      enabled: true,
      iterations: 420,
      multiStartCount: 24,
      lnsDestroyRatio: 0.26,
      initialTemperature: 1.0,
      coolingRate: 0.968,
      seedBase: 1337,
    },
    collectDiagnostics: true,
  };
}

export function getFastCncLayoutOptions(
  engine: "classic" | "strip" = "classic"
): CutLayoutEngineOptions {
  const settings = getSettings();
  const kerf_mm = getLayoutKerfMmForCncNesting(settings);
  const toolRadiusMm = contourToolRadiusMmFromSettings(settings);
  const kerfFloor = (settings?.cnc?.minSpacingFloorMm ?? 13.5) + 2 * Math.max(0, toolRadiusMm);
  return {
    kerf_mm,
    kerf_mm_floor: kerfFloor,
    margin_mm_floor: getSettings()?.cnc?.sheetMarginFloorMm ?? 4,
    groupByThicknessOnly: false,
    minUtilizationPercent: 0.75,
    rotationPreferenceMode: "aggressive",
    rotationWeight: 0.8,
    rotationPenalty: 0.35,
    scoreModel: "legacy",
    nestingEngine: engine,
    strategyTrials: [{ strategy: "skyline", binHeuristic: "firstFit" }],
    useMetaHeuristics: false,
    collectDiagnostics: false,
  };
}

export function getSheetDefinitionFromSettings(): SheetDefinition {
  const runtimeSettings = getSettings();
  return {
    largura_mm: runtimeSettings.materiais.sheetWidthMm,
    altura_mm: runtimeSettings.materiais.sheetHeightMm,
    espessura_mm: runtimeSettings.materiais.sheetThicknessMm,
    materialName: runtimeSettings.materiais.sheetName,
  };
}

function inferItemThicknessMm(item: CutlistItemForPieces): number {
  const fromEspessura = Number((item as unknown as { espessura?: number }).espessura);
  if (Number.isFinite(fromEspessura) && fromEspessura > 0) return fromEspessura;
  const fromEspessuraMm = Number((item as unknown as { espessura_mm?: number }).espessura_mm);
  if (Number.isFinite(fromEspessuraMm) && fromEspessuraMm > 0) return fromEspessuraMm;
  const fromDepth = Number(item.dimensoes?.profundidade);
  if (Number.isFinite(fromDepth) && fromDepth > 0) return fromDepth;
  return 0;
}

function almostEqual(a: number, b: number, eps = 0.2): boolean {
  return Math.abs(a - b) <= eps;
}

function resolveSheetForThickness(
  thicknessMm: number,
  groupItems: CutlistItemForPieces[]
): SheetDefinition {
  const mats = listMaterials().filter(
    (m) =>
      Number(m.sheetWidthMm) > 0 &&
      Number(m.sheetHeightMm) > 0 &&
      Number(m.sheetThicknessMm) > 0
  );
  const wanted = Math.abs(thicknessMm);
  const refs = new Set(
    groupItems
      .flatMap((it) => {
        const m1 = (it as unknown as { materialId?: string }).materialId;
        const m2 = (it as unknown as { material?: string }).material;
        return [m1, m2].filter((v): v is string => typeof v === "string" && v.trim() !== "");
      })
      .map((s) => s.trim().toLowerCase())
  );

  const preferred = mats.find(
    (m) =>
      almostEqual(Number(m.sheetThicknessMm), wanted) &&
      (refs.has(String(m.id).toLowerCase()) || refs.has(String(m.label).toLowerCase()))
  );
  const byThickness = mats.find((m) => almostEqual(Number(m.sheetThicknessMm), wanted));
  const chosen = preferred ?? byThickness;
  if (!chosen) {
    throw new Error(`Nenhuma chapa configurada para espessura ${wanted} mm.`);
  }
  return {
    largura_mm: Number(chosen.sheetWidthMm),
    altura_mm: Number(chosen.sheetHeightMm),
    espessura_mm: Number(chosen.sheetThicknessMm),
    materialId: chosen.id,
    materialName: chosen.label,
  };
}

type IndustrialMeta = {
  drillHoles?: Array<{ x: number; y: number; diameter: number; depth: number; holeType?: string; topDrillable?: boolean }>;
  metadata?: Record<string, unknown>;
  pieceNumber?: number;
  shortCode?: string;
  espessura_mm?: number;
};

function applyIndustrialRules(items: CutlistItemForPieces[]): CutlistItemForPieces[] {
  // As regras industriais já são calculadas no cutlist paramétrico; aqui só preservamos o payload.
  return items.map((item) => ({ ...item }));
}

function applyDrillHoles(items: CutlistItemForPieces[]): CutlistItemForPieces[] {
  return items.map((item) => {
    const drill = (item as unknown as { drillHoles?: unknown }).drillHoles;
    if (Array.isArray(drill) && drill.length > 0) return item;
    const legacyHoles = (item as unknown as { holes?: unknown }).holes;
    if (!Array.isArray(legacyHoles) || legacyHoles.length === 0) return item;
    return { ...item, drillHoles: legacyHoles as CutlistItemForPieces["drillHoles"] };
  });
}

function applyCutlistMetadata(items: CutlistItemForPieces[]): CutlistItemForPieces[] {
  return items.map((item) => {
    const existing = (item as unknown as { metadata?: Record<string, unknown> }).metadata;
    const metadata: Record<string, unknown> = {
      ...(existing ?? {}),
      tipo: (item as unknown as { tipo?: unknown }).tipo ?? null,
      sourceType: (item as unknown as { sourceType?: unknown }).sourceType ?? null,
      grainDirection: (item as unknown as { grainDirection?: unknown }).grainDirection ?? null,
    };
    return { ...item, metadata };
  });
}

function pieceKey(value: {
  boxId?: string;
  partName?: string;
  largura_mm?: number;
  altura_mm?: number;
  pieceNumber?: number;
  shortCode?: string;
}): string {
  const pieceNumber = Number(value.pieceNumber ?? 0) || 0;
  const shortCode = String(value.shortCode ?? "");
  if (pieceNumber > 0 || shortCode) {
    return `id:${pieceNumber}:${shortCode}`;
  }
  return `geom:${value.boxId ?? ""}:${value.partName ?? ""}:${Math.round(Number(value.largura_mm ?? 0))}:${Math.round(Number(value.altura_mm ?? 0))}`;
}

export function buildCncFromCutlistItems(
  project: unknown,
  items: CutlistItemForPieces[],
  _sheet?: SheetDefinition,
  layoutOptions: CutLayoutEngineOptions = getDefaultCncLayoutOptions()
) {
  try {
    if (items.length === 0) {
      return null;
    }
    const industrialItems = applyCutlistMetadata(applyDrillHoles(applyIndustrialRules(items)));

    const settings = getSettings();
    const kerf_mm = getLayoutKerfMmForCncNesting(settings);
    const toolRadiusMm = contourToolRadiusMmFromSettings(settings);
    const kerfFloor = (settings?.cnc?.minSpacingFloorMm ?? 13.5) + 2 * Math.max(0, toolRadiusMm);
    const enforcedLayoutOptions: CutLayoutEngineOptions = {
      ...layoutOptions,
      kerf_mm,
      kerf_mm_floor: kerfFloor,
    };

    const groupedItems = new Map<number, CutlistItemForPieces[]>();
    for (const item of industrialItems) {
      const t = inferItemThicknessMm(item);
      if (!(t > 0)) continue;
      const key = Math.round(Math.abs(t) * 100) / 100;
      if (!groupedItems.has(key)) groupedItems.set(key, []);
      groupedItems.get(key)!.push(item);
    }
    if (groupedItems.size === 0) {
      throw new Error("Nenhuma peça com espessura válida para CNC.");
    }

    const allPieces = cutlistToPieces(industrialItems);
    if (allPieces.length === 0) {
      return null;
    }

    const finalSheets: CutLayoutResult["sheets"] = [];
    for (const [thickness, group] of groupedItems) {
      const selectedSheet = resolveSheetForThickness(thickness, group);

      const piecesGroup = cutlistToPieces(group).map((p) => ({
        ...p,
        sheetWidthMm: selectedSheet.largura_mm,
        sheetHeightMm: selectedSheet.altura_mm,
        sheetThicknessMm: selectedSheet.espessura_mm,
      }));
      const metaByPieceKey = new Map<string, IndustrialMeta>();
      for (const p of piecesGroup) {
        metaByPieceKey.set(
          pieceKey({
            boxId: p.boxId,
            partName: p.partName,
            largura_mm: p.largura_mm,
            altura_mm: p.altura_mm,
            pieceNumber: p.pieceNumber,
            shortCode: p.shortCode,
          }),
          {
            drillHoles: p.drillHoles ?? p.holes,
            metadata: p.metadata,
            pieceNumber: p.pieceNumber,
            shortCode: p.shortCode,
            espessura_mm: p.espessura_mm,
          }
        );
      }
      const optionsForGroup: CutLayoutEngineOptions = {
        ...enforcedLayoutOptions,
        sheetLargura_mm: selectedSheet.largura_mm,
        sheetAltura_mm: selectedSheet.altura_mm,
      };
      const groupLayout = runCutLayout(piecesGroup, selectedSheet, optionsForGroup);
      for (const s of groupLayout.sheets) {
        const enrichedPlacements = s.placements.map((pl) => {
          const meta = metaByPieceKey.get(
            pieceKey({
              boxId: pl.boxId,
              partName: pl.partName,
              largura_mm: pl.largura_mm,
              altura_mm: pl.altura_mm,
              pieceNumber: pl.pieceNumber,
              shortCode: pl.shortCode,
            })
          );
          if (!meta) return pl;
          return {
            ...pl,
            espessura_mm: pl.espessura_mm ?? meta.espessura_mm,
            holes: pl.holes ?? meta.drillHoles,
            drillHoles: pl.drillHoles ?? meta.drillHoles,
            metadata: pl.metadata ?? meta.metadata,
            pieceNumber: pl.pieceNumber ?? meta.pieceNumber,
            shortCode: pl.shortCode ?? meta.shortCode,
          };
        });
        finalSheets.push({ ...s, placements: enrichedPlacements });
      }
    }
    const layoutResult: CutLayoutResult = { sheets: finalSheets };
    const cnc = exportCncFiles(project, layoutResult, []);
    return { pieces: allPieces, layoutResult, cnc };
  } catch (err) {
    console.error("[CNC-ERROR] Erro no pipeline:", err);
    throw err;
  }
}

