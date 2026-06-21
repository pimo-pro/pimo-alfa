import { describe, expect, it } from "vitest";
import { runNestingV3AutoLayout } from "./nestingV3Engine";
import type { V3Piece } from "./nestingV3Types";
import { DEFAULT_NESTING_V3_SETTINGS } from "./nestingV3Settings";
import { defaultSheetFromSettings } from "./nestingSheetsFactory";

function makePiece(id: string, w: number, h: number, boxId = "box-1"): V3Piece {
  return {
    id,
    name: id,
    widthMm: w,
    heightMm: h,
    thicknessMm: 19,
    materialId: "mdf_branco",
    originalHoles: [],
    rotation: 0,
    color: "#ddd",
    sourceBoxId: boxId,
  };
}

describe("runNestingV3AutoLayout (CutLayout industrial)", () => {
  it("coloca todas as peças pequenas numa chapa via runCutLayout", () => {
    const settings = { ...DEFAULT_NESTING_V3_SETTINGS, sheetWidthMm: 2800, sheetHeightMm: 2070 };
    const pieces = [
      makePiece("p1", 400, 300),
      makePiece("p2", 350, 280),
      makePiece("p3", 320, 260),
      makePiece("p4", 300, 240),
    ];
    const sheets = [defaultSheetFromSettings(settings)];
    const result = runNestingV3AutoLayout(pieces, sheets, settings);

    expect(result.sheetsUsed).toBeGreaterThan(0);
    expect(result.unplacedPieceIds).toHaveLength(0);
    expect(result.placements).toHaveLength(4);
    expect(result.placements.every((p) => p.xMm >= 0 && p.yMm >= 0)).toBe(true);
    expect(result.pieces?.every((p) => p.rotation === 0 || p.rotation === 90)).toBe(true);
  });
});
