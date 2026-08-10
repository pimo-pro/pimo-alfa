/**
 * Paridade Auto-layout V4 (runCutLayout PRO/Experimental) vs pipeline directo.
 */

import { describe, expect, it } from "vitest";
import { runCutLayout } from "../core/cutlayout/cutLayoutEngine";
import type { CutPiece, SheetDefinition } from "../core/cutlayout/cutLayoutTypes";
import { getDefaultCncLayoutOptions, getExperimentalCncLayoutOptions } from "../core/cnc/cncPipeline";
import { v4PiecesToCutPieces } from "../core/cutlayout/integration/v4ToCutPieces";
import { v3TopLeftToPhysicalBl } from "../core/cutlayout/integration/layoutCoordinateAdapter";
import { runNestingV4AutoLayout } from "./nestingV4Engine";
import { DEFAULT_NESTING_V4_SETTINGS, type NestingV4Settings } from "./nestingV4Settings";
import type { V4Piece, V4Sheet } from "./nestingV4Types";

function cutPiecesToStableV4(cutPieces: CutPiece[]): V4Piece[] {
  return cutPieces.map((cp, index) => ({
    id: `v4-parity-${index}`,
    name: cp.partName,
    widthMm: cp.largura_mm,
    heightMm: cp.altura_mm,
    thicknessMm: cp.espessura_mm,
    materialId: cp.materialId,
    materialName: cp.materialName,
    originalHoles: (cp.drillHoles ?? []).map((h) => ({
      x: h.x,
      y: h.y,
      diameter: h.diameter,
      depth: h.depth,
      holeType: h.holeType,
    })),
    rotation: 0 as const,
    color: "#ccc",
    sourceBoxId: cp.boxId,
    industrialGrainCode: cp.industrialGrainCode,
    pieceTipo: cp.pieceTipo,
  }));
}

describe("nesting V4 industrial parity", () => {
  const sheet: SheetDefinition = { largura_mm: 2800, altura_mm: 2070, espessura_mm: 19 };
  const settings: NestingV4Settings = {
    ...DEFAULT_NESTING_V4_SETTINGS,
    nestingEngine: "pro",
    kerfMm: 3,
    marginMm: 10,
  };

  it("PRO alinha contagem de chapas com runCutLayout", () => {
    const cutPieces: CutPiece[] = [
      {
        largura_mm: 600,
        altura_mm: 400,
        espessura_mm: 19,
        quantidade: 4,
        boxId: "b1",
        partName: "Lat",
      },
      {
        largura_mm: 800,
        altura_mm: 500,
        espessura_mm: 19,
        quantidade: 2,
        boxId: "b1",
        partName: "Fundo",
      },
    ];
    const expanded: CutPiece[] = [];
    for (const cp of cutPieces) {
      const qty = cp.quantidade ?? 1;
      for (let i = 0; i < qty; i++) expanded.push({ ...cp, quantidade: 1 });
    }
    const v4Pieces = cutPiecesToStableV4(expanded);
    const sheets: V4Sheet[] = [
      { index: 0, widthMm: sheet.largura_mm, heightMm: sheet.altura_mm, thicknessMm: sheet.espessura_mm },
    ];
    const direct = runCutLayout(expanded, sheet, {
      ...getDefaultCncLayoutOptions(sheet),
      kerf_mm: settings.kerfMm,
    });
    const v4Result = runNestingV4AutoLayout(v4Pieces, sheets, settings);
    expect(v4Result.sheetsUsed).toBe(direct.sheets.length);
    expect(v4Result.unplacedPieceIds.length).toBeLessThanOrEqual(expanded.length);
  });

  it("Experimental também produz layout válido", () => {
    const cutPieces: CutPiece[] = [
      {
        largura_mm: 500,
        altura_mm: 300,
        espessura_mm: 19,
        quantidade: 6,
        boxId: "b2",
        partName: "Prat",
      },
    ];
    const expanded: CutPiece[] = [];
    for (const cp of cutPieces) {
      for (let i = 0; i < (cp.quantidade ?? 1); i++) expanded.push({ ...cp, quantidade: 1 });
    }
    const v4Pieces = cutPiecesToStableV4(expanded);
    const sheets: V4Sheet[] = [
      { index: 0, widthMm: sheet.largura_mm, heightMm: sheet.altura_mm, thicknessMm: sheet.espessura_mm },
    ];
    const experimentalSettings: NestingV4Settings = { ...settings, nestingEngine: "experimental" };
    const result = runNestingV4AutoLayout(v4Pieces, sheets, experimentalSettings);
    expect(result.placements.length + result.unplacedPieceIds.length).toBe(expanded.length);
    expect(result.sheetsUsed).toBeGreaterThan(0);

    const viaAdapter = v4PiecesToCutPieces(v4Pieces, experimentalSettings);
    expect(viaAdapter).toHaveLength(expanded.length);

    const directExp = runCutLayout(expanded, sheet, {
      ...getExperimentalCncLayoutOptions(sheet),
      kerf_mm: settings.kerfMm,
    });
    expect(directExp.sheets.length).toBeGreaterThan(0);

    const pl = result.placements[0];
    if (pl) {
      const piece = v4Pieces.find((p) => p.id === pl.pieceId)!;
      const h = piece.rotation === 90 || piece.rotation === 270 ? piece.widthMm : piece.heightMm;
      const bl = v3TopLeftToPhysicalBl(pl.xMm, pl.yMm, h, sheet.altura_mm);
      expect(bl.x_mm).toBeGreaterThanOrEqual(0);
      expect(bl.y_mm).toBeGreaterThanOrEqual(0);
    }
  });
});
