/**
 * Interface unificada para exportação CNC (TCN + KDT).
 * Gera um arquivo separado por espessura (job_<id>_19mm.tcn / job_<id>_10mm.tcn).
 */

import type { CutLayoutResult, SheetResult } from "../cutlayout/cutLayoutTypes";
import type { CncDrillOperation, CncExportResult, CncExportFile, CncPanel } from "./cncTypes";
import { generateTcnForThickness } from "./tcnGenerator";
import { generateKdt } from "./kdtGenerator";

/**
 * Agrupa sheets por espessura e gera um par TCN+KDT por espessura.
 */
export function exportCncFiles(
  _project: unknown,
  layoutResult: CutLayoutResult,
  _drillOperations: CncDrillOperation[]
): CncExportResult {
  const projectName =
    typeof _project === "object" &&
    _project !== null &&
    "projectName" in _project &&
    typeof (_project as { projectName?: unknown }).projectName === "string"
      ? (_project as { projectName: string }).projectName
      : "Sheet";
  const acamBaseName = projectName
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "Sheet";

  const byThickness = new Map<number, SheetResult[]>();
  for (const sheetResult of layoutResult.sheets) {
    const t = sheetResult.sheet.espessura_mm;
    if (!byThickness.has(t)) byThickness.set(t, []);
    byThickness.get(t)!.push(sheetResult);
  }

  const files: CncExportFile[] = [];
  for (const [thicknessMm, sheetResults] of byThickness) {
    const sheet = sheetResults[0].sheet;
    const panel: CncPanel = {
      largura_mm: sheet.largura_mm,
      altura_mm: sheet.altura_mm,
      espessura_mm: thicknessMm,
      materialId: sheet.materialId,
    };
    const drillsForThickness = buildBasicDrillOperationsFromSheets(sheetResults);
    files.push({
      thicknessMm,
      tcn: generateTcnForThickness(sheetResults, thicknessMm, 3, acamBaseName),
      kdt: generateKdt(panel, drillsForThickness),
    });
  }

  return { files };
}

/**
 * Operações básicas de furação para um conjunto de sheets (por espessura).
 */
function buildBasicDrillOperationsFromSheets(sheetResults: SheetResult[]): CncDrillOperation[] {
  const ops: CncDrillOperation[] = [];
  for (const sheet of sheetResults) {
    for (const pl of sheet.placements) {
      const x = pl.x_mm;
      const y = pl.y_mm;
      const w = pl.largura_mm;
      const h = pl.altura_mm;
      const margin = 25;
      const points: Array<{ x: number; y: number }> = [
        { x: x + margin, y: y + margin },
        { x: x + w - margin, y: y + margin },
        { x: x + w - margin, y: y + h - margin },
        { x: x + margin, y: y + h - margin },
      ];
      points.forEach((p) => {
        ops.push({
          x: p.x,
          y: p.y,
          z: 0,
          diametro: 5,
          profundidade: 10,
          tipo: "vertical",
        });
      });
    }
  }
  return ops;
}

/**
 * Operações básicas de furação (placeholder):
 * 4 furos nos cantos de cada peça. Usado para compatibilidade; export usa buildBasicDrillOperationsFromSheets por espessura.
 */
export function buildBasicDrillOperations(layoutResult: CutLayoutResult): CncDrillOperation[] {
  const ops: CncDrillOperation[] = [];
  for (const sheet of layoutResult.sheets) {
    for (const pl of sheet.placements) {
      const x = pl.x_mm;
      const y = pl.y_mm;
      const w = pl.largura_mm;
      const h = pl.altura_mm;
      const margin = 25;
      const points: Array<{ x: number; y: number }> = [
        { x: x + margin, y: y + margin },
        { x: x + w - margin, y: y + margin },
        { x: x + w - margin, y: y + h - margin },
        { x: x + margin, y: y + h - margin },
      ];
      points.forEach((p) => {
        ops.push({
          x: p.x,
          y: p.y,
          z: 0,
          diametro: 5,
          profundidade: 10,
          tipo: "vertical",
        });
      });
    }
  }
  return ops;
}
