/**
 * Nesting V4 — Exportação TCN + PDF industrial armazém.
 *
 * Usa o contrato industrial partilhado (fixedPlacementsFromV3State) antes de
 * invocar exportCncFiles — o mesmo pipeline geométrico que produção individual/lote.
 */

import type { NestingV4State } from "./nestingV4Types";
import type { CutLayoutResult } from "../core/cutlayout/cutLayoutTypes";
import type { ChapasRealSummary } from "../core/industrial/computeChapasReal";
import type { ConsumoMateriaisSummary } from "../core/industrial/computeConsumoMateriais";
import { exportCncFiles } from "../core/cnc/cncExport";
import type { CncExportResult } from "../core/cnc/cncTypes";
import { fixedPlacementsFromV3State } from "../core/cutlayout/integration/fixedPlacementsAdapter";
import {
  buildIndustrialArmazemPdf,
  industrialArmazemPdfFileName,
} from "../core/pdf/pdfIndustrialArmazem";
import type jsPDF from "jspdf";

/**
 * Prepara layoutResult industrial a partir do estado V3 (manual ou pós auto-layout).
 */
export function prepareNestingV4IndustrialLayout(state: NestingV4State): CutLayoutResult {
  const { result } = fixedPlacementsFromV3State(state);
  return result;
}

/** Converte layout industrial V3 → resumos usados pelo PDF armazém. */
export function chapasAndConsumoFromCutLayout(layout: CutLayoutResult): {
  chapas: ChapasRealSummary;
  consumo: ConsumoMateriaisSummary;
} {
  const sheets = (layout.sheets ?? []).map((sheetResult, idx) => {
    const sheetW = sheetResult.sheet.largura_mm ?? 0;
    const sheetH = sheetResult.sheet.altura_mm ?? 0;
    const sheetArea = sheetW * sheetH;
    const usedArea = sheetResult.placements.reduce((s, p) => s + p.largura_mm * p.altura_mm, 0);
    const waste = Math.max(0, sheetArea - usedArea);
    return {
      sheetIndex: idx + 1,
      espessuraMm: sheetResult.sheet.espessura_mm ?? 18,
      material: sheetResult.sheet.materialName ?? "MDF",
      sheetLarguraMm: sheetW,
      sheetAlturaMm: sheetH,
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
  const chapas: ChapasRealSummary = {
    totalSheets: sheets.length,
    totalWasteMm2: totalWaste,
    totalWastePct: totalArea > 0 ? (totalWaste / totalArea) * 100 : 0,
    sheets,
    layout,
    mode: sheets.length > 0 ? "real" : "vazio",
    diagnostics: sheets.length > 0 ? [] : ["nesting-v4: sem sheets no layout exportado"],
  };

  const porChapa = sheets.map((s) => ({
    chapaIndex: s.sheetIndex,
    material: s.material,
    espessuraMm: s.espessuraMm,
    areaUsadaMm2: s.usedAreaMm2,
    areaChapaMm2: s.sheetAreaMm2,
    desperdicioMm2: s.wasteMm2,
    desperdicioPct: s.wastePct,
  }));

  const consumo: ConsumoMateriaisSummary = {
    porPeca: sheets.flatMap((s) =>
      s.pieces.map((p, i) => ({
        pecaId: `${s.sheetIndex}-${i}`,
        peca: p.nome,
        caixa: p.boxId || "—",
        material: s.material,
        areaMm2: p.largura * p.altura,
        pesoKg: 0,
        quantidade: 1,
      }))
    ),
    porChapa,
    desperdicioTotalMm2: totalWaste,
    desperdicioTotalPct: chapas.totalWastePct,
  };

  return { chapas, consumo };
}

export async function buildNestingV4IndustrialArmazemPdf(
  state: NestingV4State,
  projectName = "NestingV4"
): Promise<jsPDF> {
  const layout = prepareNestingV4IndustrialLayout(state);
  const { chapas, consumo } = chapasAndConsumoFromCutLayout(layout);
  return buildIndustrialArmazemPdf(projectName, chapas, consumo);
}

export async function downloadNestingV4ArmazemPdf(
  state: NestingV4State,
  projectName = "NestingV4"
): Promise<void> {
  const doc = await buildNestingV4IndustrialArmazemPdf(state, projectName);
  doc.save(industrialArmazemPdfFileName(projectName));
}

/**
 * Gera ficheiros TCN a partir do estado do Nesting V4.
 * Pipeline: V3 → BL físico → finalizeIndustrialLayout(preserve-positions) → exportCncFiles.
 */
export function exportNestingV4ToCnc(
  state: NestingV4State,
  projectName = "NestingV4"
): CncExportResult {
  const layoutResult = prepareNestingV4IndustrialLayout(state);
  return exportCncFiles({ projectName }, layoutResult, []);
}

export function downloadNestingV4Tcn(state: NestingV4State, projectName = "NestingV4"): void {
  const result = exportNestingV4ToCnc(state, projectName);
  for (const file of result.files) {
    const blob = new Blob([file.tcn], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.filenameBase}.tcn`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export interface V4ExportStats {
  totalPieces: number;
  placedPieces: number;
  unplacedPieces: number;
  sheetsUsed: number;
  filesGenerated: number;
}

export function getV4ExportStats(state: NestingV4State): V4ExportStats {
  const sheetsWithPieces = new Set(state.placements.map((p) => p.sheetIndex));
  return {
    totalPieces: state.pieces.length,
    placedPieces: state.placements.length,
    unplacedPieces: state.unplacedPieceIds.length,
    sheetsUsed: sheetsWithPieces.size,
    filesGenerated: sheetsWithPieces.size,
  };
}

/** @deprecated alias */
export type V3ExportStats = V4ExportStats;
/** @deprecated alias */
export const getV3ExportStats = getV4ExportStats;
