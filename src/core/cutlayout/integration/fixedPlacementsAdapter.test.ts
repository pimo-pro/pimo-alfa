import { describe, expect, it } from "vitest";
import { fixedPlacementsFromV3State, v3StateToCutLayoutResult } from "./fixedPlacementsAdapter";
import { v3TopLeftToPhysicalBl } from "./layoutCoordinateAdapter";
import type { NestingV3State, V3Piece } from "../../../nesting-v3/nestingV3Types";
import { DEFAULT_NESTING_V3_SETTINGS } from "../../../nesting-v3/nestingV3Settings";
import { defaultSheetFromSettings } from "../../../nesting-v3/nestingSheetsFactory";

function makeState(piece: V3Piece, placement: NestingV3State["placements"][number]): NestingV3State {
  const settings = { ...DEFAULT_NESTING_V3_SETTINGS, sheetWidthMm: 2800, sheetHeightMm: 2070 };
  return {
    sheets: [defaultSheetFromSettings(settings)],
    pieces: [piece],
    placements: [placement],
    unplacedPieceIds: [],
    settings,
    kerfMm: settings.kerfMm,
    activeSheetIndex: 0,
  };
}

describe("fixedPlacementsFromV3State", () => {
  it("converte TL canvas para BL físico e aplica pós-processamento geométrico", () => {
    const piece: V3Piece = {
      id: "p1",
      name: "Lateral",
      widthMm: 560,
      heightMm: 720,
      thicknessMm: 19,
      materialId: "mdf_branco",
      originalHoles: [{ x: 50, y: 50, diameter: 5, depth: 13 }],
      rotation: 0,
      color: "#ccc",
      sourceBoxId: "box1",
    };
    const state = makeState(piece, { pieceId: "p1", sheetIndex: 0, xMm: 100, yMm: 200 });

    const raw = v3StateToCutLayoutResult(state);
    const bl = v3TopLeftToPhysicalBl(100, 200, 720, 2070);
    expect(raw.sheets[0]?.placements[0]).toMatchObject({
      x_mm: bl.x_mm,
      y_mm: bl.y_mm,
      largura_mm: 560,
      altura_mm: 720,
      drillHoles: [{ x: 50, y: 50, diameter: 5, depth: 13 }],
    });

    const { result, valid } = fixedPlacementsFromV3State(state);
    expect(valid).toBe(true);
    const placement = result.sheets[0]?.placements[0];
    expect(placement?.drillHoles).toEqual([{ x: 50, y: 50, diameter: 5, depth: 13 }]);
    expect(placement?.originalDrillHoles).toEqual([{ x: 50, y: 50, diameter: 5, depth: 13 }]);
  });

  it("preserva furos após rotação 90° da peça", () => {
    const piece: V3Piece = {
      id: "p2",
      name: "Prateleira",
      widthMm: 400,
      heightMm: 300,
      thicknessMm: 19,
      originalHoles: [{ x: 20, y: 30, diameter: 5, depth: 12 }],
      rotation: 90,
      color: "#ccc",
      sourceBoxId: "box1",
    };
    const state = makeState(piece, { pieceId: "p2", sheetIndex: 0, xMm: 50, yMm: 80, rotated: true });

    const { result } = fixedPlacementsFromV3State(state);
    const placement = result.sheets[0]?.placements[0];
    expect(placement?.largura_mm).toBe(300);
    expect(placement?.altura_mm).toBe(400);
    expect(placement?.rotacao).toBe(90);
    expect(placement?.drillHoles?.length).toBe(1);
    expect(placement?.drillHoles?.[0]?.x).toBe(20);
    expect(placement?.drillHoles?.[0]?.y).toBe(30);
  });
});
