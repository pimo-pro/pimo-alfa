import type { CutListItemComPreco } from "../types";
import { cutlistToPieces, runCutLayout, type CutlistItemForPieces } from "../cutlayout/cutLayoutEngine";
import type { CutLayoutResult } from "../cutlayout/cutLayoutTypes";
import { getFastCncLayoutOptions, getSheetDefinitionFromSettings } from "../cnc/cncPipeline";
import { CHAPA_PADRAO_LARGURA, CHAPA_PADRAO_ALTURA } from "../manufacturing/materials";

export type ChapasRealSheetRow = {
  sheetIndex: number;
  espessuraMm: number;
  material: string;
  pieceCount: number;
  usedAreaMm2: number;
  sheetAreaMm2: number;
  wasteMm2: number;
  wastePct: number;
  pieces: Array<{ nome: string; boxId: string; largura: number; altura: number }>;
};

export type ChapasRealSummary = {
  totalSheets: number;
  totalWasteMm2: number;
  totalWastePct: number;
  sheets: ChapasRealSheetRow[];
  layout: CutLayoutResult | null;
};

export function computeChapasReal(
  items: CutListItemComPreco[],
  projectName: string,
  boxes: Array<{ id: string; nome?: string }>
): ChapasRealSummary {
  if (items.length === 0) {
    return { totalSheets: 0, totalWasteMm2: 0, totalWastePct: 0, sheets: [], layout: null };
  }

  const sheetDef = getSheetDefinitionFromSettings();
  const pieces = cutlistToPieces(items as CutlistItemForPieces[], { projectName, boxes });
  let layout: CutLayoutResult | null = null;
  try {
    layout = runCutLayout(pieces, sheetDef, getFastCncLayoutOptions(sheetDef));
  } catch {
    layout = null;
  }

  if (!layout?.sheets?.length) {
    const sheetArea = (sheetDef.largura_mm || CHAPA_PADRAO_LARGURA) * (sheetDef.altura_mm || CHAPA_PADRAO_ALTURA);
    const used = items.reduce(
      (s, i) => s + i.dimensoes.largura * i.dimensoes.altura * (i.quantidade ?? 1),
      0
    );
    const estSheets = Math.max(1, Math.ceil(used / sheetArea));
    return {
      totalSheets: estSheets,
      totalWasteMm2: estSheets * sheetArea - used,
      totalWastePct: estSheets * sheetArea > 0 ? ((estSheets * sheetArea - used) / (estSheets * sheetArea)) * 100 : 0,
      sheets: [],
      layout: null,
    };
  }

  const sheets: ChapasRealSheetRow[] = layout.sheets.map((sheetResult, idx) => {
    const sheetW = sheetResult.sheet.largura_mm ?? sheetDef.largura_mm ?? CHAPA_PADRAO_LARGURA;
    const sheetH = sheetResult.sheet.altura_mm ?? sheetDef.altura_mm ?? CHAPA_PADRAO_ALTURA;
    const sheetArea = sheetW * sheetH;
    const usedArea = sheetResult.placements.reduce((s, p) => s + p.largura_mm * p.altura_mm, 0);
    const waste = Math.max(0, sheetArea - usedArea);
    return {
      sheetIndex: idx + 1,
      espessuraMm: sheetResult.sheet.espessura_mm ?? sheetDef.espessura_mm ?? 18,
      material: sheetResult.sheet.materialName ?? sheetDef.materialName ?? "MDF",
      pieceCount: sheetResult.placements.length,
      usedAreaMm2: usedArea,
      sheetAreaMm2: sheetArea,
      wasteMm2: waste,
      wastePct: sheetArea > 0 ? (waste / sheetArea) * 100 : 0,
      pieces: sheetResult.placements.map((p) => ({
        nome: p.partName ?? "—",
        boxId: p.boxId ?? "",
        largura: p.largura_mm,
        altura: p.altura_mm,
      })),
    };
  });

  const totalWaste = sheets.reduce((s, r) => s + r.wasteMm2, 0);
  const totalArea = sheets.reduce((s, r) => s + r.sheetAreaMm2, 0);

  return {
    totalSheets: sheets.length,
    totalWasteMm2: totalWaste,
    totalWastePct: totalArea > 0 ? (totalWaste / totalArea) * 100 : 0,
    sheets,
    layout,
  };
}
