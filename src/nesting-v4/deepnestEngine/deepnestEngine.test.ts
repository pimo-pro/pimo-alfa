import { describe, expect, it } from "vitest";
import { runNestingV4AutoLayout } from "../nestingV4Engine";
import { resolveNestingV4EngineId, runResolvedNestingV4AutoLayout } from "../engines/resolveEngine";
import type { V4Piece } from "../nestingV4Types";
import { DEFAULT_NESTING_V4_SETTINGS } from "../nestingV4Settings";
import { defaultSheetFromSettings } from "../nestingSheetsFactory";
import { runDeepnestAutoLayout } from "./deepnestEngine";

function makePiece(id: string, w: number, h: number): V4Piece {
  return {
    id,
    name: id,
    widthMm: w,
    heightMm: h,
    thicknessMm: 19,
    materialId: "mdf_branco",
    originalHoles: [{ x: 10, y: 20, diameter: 5, depth: 12 }],
    rotation: 0,
    color: "#ddd",
    sourceBoxId: "box-1",
  };
}

describe("Nesting V4 — motor Deepnest", () => {
  it("resolveEngine reconhece deepnest", () => {
    expect(resolveNestingV4EngineId({ ...DEFAULT_NESTING_V4_SETTINGS, nestingEngine: "deepnest" })).toBe(
      "deepnest"
    );
  });

  it("coloca peças rectangulares com GA+NFP", () => {
    const settings = {
      ...DEFAULT_NESTING_V4_SETTINGS,
      nestingEngine: "deepnest" as const,
      sheetWidthMm: 2800,
      sheetHeightMm: 2070,
      kerfMm: 3,
      marginMm: 10,
    };
    const pieces = [
      makePiece("d1", 400, 300),
      makePiece("d2", 350, 280),
      makePiece("d3", 320, 260),
      makePiece("d4", 300, 240),
    ];
    const sheets = [defaultSheetFromSettings(settings)];
    const result = runDeepnestAutoLayout(pieces, sheets, settings, {
      populationSize: 6,
      generations: 3,
      enableSa: true,
      saIterations: 20,
      seed: 42,
    });

    expect(result.sheetsUsed).toBeGreaterThan(0);
    expect(result.placements.length).toBeGreaterThan(0);
    expect(result.selectedStrategy).toBe("deepnest-ga-nfp");
    expect(result.placements.every((p) => p.xMm >= 0 && p.yMm >= 0)).toBe(true);
    expect(result.pieces?.every((p) => p.rotation === 0 || p.rotation === 90)).toBe(true);
  });

  it("runNestingV4AutoLayout e resolveEngine usam o mesmo ramo", () => {
    const settings = {
      ...DEFAULT_NESTING_V4_SETTINGS,
      nestingEngine: "deepnest" as const,
      sheetWidthMm: 1200,
      sheetHeightMm: 800,
    };
    const pieces = [makePiece("a", 200, 100), makePiece("b", 180, 90)];
    const sheets = [defaultSheetFromSettings(settings)];
    const a = runNestingV4AutoLayout(pieces, sheets, settings);
    const b = runResolvedNestingV4AutoLayout(pieces, sheets, settings);
    expect(a.placements.length).toBe(b.placements.length);
    expect(a.unplacedPieceIds.length).toBe(b.unplacedPieceIds.length);
  });
});
