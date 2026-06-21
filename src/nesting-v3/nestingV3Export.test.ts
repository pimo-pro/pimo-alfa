import { describe, expect, it } from "vitest";
import { exportNestingV3ToCnc } from "./nestingV3Export";
import { runNestingV3AutoLayout } from "./nestingV3Engine";
import type { NestingV3State, V3Piece } from "./nestingV3Types";
import { DEFAULT_NESTING_V3_SETTINGS } from "./nestingV3Settings";
import { defaultSheetFromSettings } from "./nestingSheetsFactory";

function makeState(pieces: V3Piece[], placements: NestingV3State["placements"]): NestingV3State {
  const settings = { ...DEFAULT_NESTING_V3_SETTINGS };
  return {
    sheets: [defaultSheetFromSettings(settings)],
    pieces,
    placements,
    unplacedPieceIds: pieces.filter((p) => !placements.some((pl) => pl.pieceId === p.id)).map((p) => p.id),
    settings,
    kerfMm: settings.kerfMm,
    activeSheetIndex: 0,
  };
}

function assertValidTcnExport(result: ReturnType<typeof exportNestingV3ToCnc>): void {
  expect(result.files.length).toBeGreaterThan(0);
  for (const file of result.files) {
    expect(file.tcn).toContain("::UNm");
    const hasGeometry = /W#2200|W#2201|SIDE#\d+/m.test(file.tcn ?? "");
    expect(hasGeometry).toBe(true);
  }
}

describe("exportNestingV3ToCnc", () => {
  it("export manual V3 gera TCN válido", () => {
    const piece: V3Piece = {
      id: "manual-1",
      name: "Lateral",
      widthMm: 560,
      heightMm: 720,
      thicknessMm: 19,
      materialId: "mdf_branco",
      originalHoles: [{ x: 50, y: 50, diameter: 5, depth: 13 }],
      rotation: 0,
      color: "#ccc",
      sourceBoxId: "box-manual",
    };
    const state = makeState([piece], [{ pieceId: "manual-1", sheetIndex: 0, xMm: 20, yMm: 30 }]);
    assertValidTcnExport(exportNestingV3ToCnc(state, "ManualV3"));
  });

  it("export após auto-layout industrial gera TCN válido", () => {
    const settings = { ...DEFAULT_NESTING_V3_SETTINGS, sheetWidthMm: 2800, sheetHeightMm: 2070 };
    const pieces: V3Piece[] = [
      {
        id: "auto-1",
        name: "Prateleira",
        widthMm: 400,
        heightMm: 300,
        thicknessMm: 19,
        materialId: "mdf_branco",
        originalHoles: [],
        rotation: 0,
        color: "#ccc",
        sourceBoxId: "box-auto",
      },
      {
        id: "auto-2",
        name: "Divisor",
        widthMm: 350,
        heightMm: 280,
        thicknessMm: 19,
        materialId: "mdf_branco",
        originalHoles: [],
        rotation: 0,
        color: "#ddd",
        sourceBoxId: "box-auto",
      },
    ];
    const sheets = [defaultSheetFromSettings(settings)];
    const layout = runNestingV3AutoLayout(pieces, sheets, settings);
    const state: NestingV3State = {
      sheets: layout.sheets ?? sheets,
      pieces: layout.pieces ?? pieces,
      placements: layout.placements,
      unplacedPieceIds: layout.unplacedPieceIds,
      settings,
      kerfMm: settings.kerfMm,
      activeSheetIndex: 0,
    };
    const exportResult = exportNestingV3ToCnc(state, "AutoV3");
    assertValidTcnExport(exportResult);
    expect(layout.placements.length).toBeGreaterThan(0);
    expect(exportResult.files[0]?.tcn?.length ?? 0).toBeGreaterThan(100);
  });
});
