import type { SettingsSchema } from "../settings/settingsSchema";
import type { MaterialRecord } from "../materials/types";
import {
  cutlistToPieces,
  type CutlistItemForPieces,
} from "../cutlayout/cutLayoutEngine";
import type { CutLayoutEngineOptions, CutLayoutResult, CutPlacement } from "../cutlayout/cutLayoutTypes";
import { getSheetDefinitionFromSettings } from "../cnc/cncPipeline";
import { applyRotationGeometryToSheets } from "../cutlayout/utils/cutLayoutGeomRotation";
import {
  formatMaterialThicknessFolderName,
  groupCutlistItemsByMaterialAndThickness,
  resolveMaterialLabelForCutlistItem,
  sortMaterialThicknessGroupKeys,
} from "../cnc/industrialThicknessGroups";
import {
  inferCutlistItemThicknessMm,
  resolveCanonicalMaterialIdForNesting,
} from "../cnc/industrialNestingGroup";
import {
  buildCncFromCutlistItemsInWorker,
  runCutLayoutInWorker,
} from "./industrialWorkerRunner";

type CncBundle = NonNullable<Awaited<ReturnType<typeof buildCncFromCutlistItemsInWorker>>>;

export type PerThicknessLayoutBundle = {
  thicknessMm: number;
  materialId: string;
  materialLabel: string;
  bucket: string;
  groupKey: string;
  items: CutlistItemForPieces[];
  layoutResult: CutLayoutResult;
};

export type PerThicknessCncBundle = PerThicknessLayoutBundle & {
  cncBundle: CncBundle;
};

type CutlistToPiecesContext = {
  projectName?: string;
  boxes?: unknown[];
};

function withSheetDefaults(
  layoutOptions: CutLayoutEngineOptions,
  sheetDef = getSheetDefinitionFromSettings()
): CutLayoutEngineOptions {
  return {
    ...layoutOptions,
    groupByThicknessOnly: true,
    sheetLargura_mm: layoutOptions.sheetLargura_mm ?? sheetDef.largura_mm,
    sheetAltura_mm: layoutOptions.sheetAltura_mm ?? sheetDef.altura_mm,
  };
}

function buildBundleMeta(
  groupKey: string,
  groupItems: CutlistItemForPieces[],
  materials: MaterialRecord[]
): Pick<PerThicknessLayoutBundle, "thicknessMm" | "materialId" | "materialLabel" | "bucket" | "groupKey"> {
  const sample = groupItems[0]!;
  const thicknessMm = inferCutlistItemThicknessMm(sample);
  const materialRef = String(sample.materialId ?? sample.material ?? "").trim();
  const materialId = resolveCanonicalMaterialIdForNesting(materialRef, thicknessMm);
  const materialLabel = resolveMaterialLabelForCutlistItem(sample, materials);
  const bucket = formatMaterialThicknessFolderName(materialLabel, thicknessMm);
  return { thicknessMm, materialId, materialLabel, bucket, groupKey };
}

/**
 * Executa CutLayout uma vez por material+espessura, devolvendo um resultado independente por grupo.
 */
export async function runCutLayoutPerThickness(
  settings: SettingsSchema,
  materials: MaterialRecord[],
  items: CutlistItemForPieces[],
  layoutOptions: CutLayoutEngineOptions,
  projectCtx?: CutlistToPiecesContext
): Promise<PerThicknessLayoutBundle[]> {
  const groups = groupCutlistItemsByMaterialAndThickness(items);
  const sheetDef = getSheetDefinitionFromSettings();
  const opts = withSheetDefaults(layoutOptions, sheetDef);
  const results: PerThicknessLayoutBundle[] = [];

  for (const groupKey of sortMaterialThicknessGroupKeys(groups.keys(), groups, materials)) {
    const groupItems = groups.get(groupKey)!;
    const meta = buildBundleMeta(groupKey, groupItems, materials);
    const pieces = cutlistToPieces(groupItems, {
      projectName: projectCtx?.projectName ?? "Projeto",
      boxes: (projectCtx?.boxes ?? []) as never[],
    });
    if (pieces.length === 0) continue;

    const layoutResult = await runCutLayoutInWorker(settings, materials, pieces, opts);
    applyRotationGeometryToSheets(layoutResult.sheets);
    results.push({
      ...meta,
      items: groupItems,
      layoutResult,
    });
  }

  return results;
}

/**
 * Executa nesting + exportação TCN uma vez por material+espessura.
 */
export async function buildCncBundlesPerThickness(
  settings: SettingsSchema,
  materials: MaterialRecord[],
  projectStub: unknown,
  items: CutlistItemForPieces[],
  layoutOptions: CutLayoutEngineOptions
): Promise<PerThicknessCncBundle[]> {
  const groups = groupCutlistItemsByMaterialAndThickness(items);
  const sheetDef = getSheetDefinitionFromSettings();
  const opts = withSheetDefaults(layoutOptions, sheetDef);
  const results: PerThicknessCncBundle[] = [];

  for (const groupKey of sortMaterialThicknessGroupKeys(groups.keys(), groups, materials)) {
    const groupItems = groups.get(groupKey)!;
    const meta = buildBundleMeta(groupKey, groupItems, materials);
    const cncBundle = await buildCncFromCutlistItemsInWorker(
      settings,
      materials,
      projectStub,
      groupItems,
      opts
    );
    if (!cncBundle?.layoutResult) continue;
    applyRotationGeometryToSheets(cncBundle.layoutResult.sheets);
    results.push({
      ...meta,
      items: groupItems,
      layoutResult: cncBundle.layoutResult,
      cncBundle,
    });
  }

  return results;
}

/** Junta placements de vários layouts (com índice de chapa deslocado) para ordenação global. */
export function mergePerThicknessPlacements(
  bundles: PerThicknessLayoutBundle[]
): CutPlacement[] {
  const merged: CutPlacement[] = [];
  let sheetOffset = 0;
  for (const bundle of bundles) {
    for (const sheet of bundle.layoutResult.sheets) {
      for (const placement of sheet.placements) {
        merged.push({
          ...placement,
          sheetIndex: sheetOffset + placement.sheetIndex,
        });
      }
    }
    sheetOffset += bundle.layoutResult.sheets.length;
  }
  return merged;
}
