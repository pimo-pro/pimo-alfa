import { describe, expect, it } from "vitest";
import { DEFAULT_NESTING_V4_SETTINGS } from "../../nesting-v4/nestingV4Settings";
import type { NestingV4State, V4Piece } from "../../nesting-v4/nestingV4Types";
import { exportNestingV4ToCnc } from "../../nesting-v4/nestingV4Export";
import { withIndustrialOutputAuthorization } from "../../core/industrial/industrialOutputGuard";
import { generateTcnV4, segmentsToPseudoGCode } from "./generateTcnV4";
import { parseTcnMoPanel } from "./parseTcnMoPaths";
import { normalizeLcaTcnRules } from "../rules/layoutCorteAlfaTcnRules";

function makeState(): NestingV4State {
  const pieces: V4Piece[] = [
    {
      id: "p1",
      name: "Lateral",
      widthMm: 600,
      heightMm: 400,
      thicknessMm: 19,
      materialId: "mdf",
      originalHoles: [
        { x: 32, y: 50, diameter: 5, depth: 12, holeType: "confirmat" },
        { x: 32, y: 350, diameter: 5, depth: 12, holeType: "confirmat" },
      ],
      rotation: 0,
      color: "#ccc",
      industrialGrainCode: "YY",
      sourceBoxId: "box-1",
    },
    {
      id: "p2",
      name: "Prateleira",
      widthMm: 500,
      heightMm: 300,
      thicknessMm: 19,
      materialId: "mdf",
      originalHoles: [],
      rotation: 90,
      color: "#ddd",
      sourceBoxId: "box-1",
    },
  ];
  const settings = { ...DEFAULT_NESTING_V4_SETTINGS, kerfMm: 3, marginMm: 10 };
  return {
    sheets: [{ index: 0, widthMm: 2800, heightMm: 2070, thicknessMm: 19 }],
    pieces,
    placements: [
      { pieceId: "p1", sheetIndex: 0, xMm: 20, yMm: 20 },
      { pieceId: "p2", sheetIndex: 0, xMm: 700, yMm: 20, rotated: true },
    ],
    unplacedPieceIds: [],
    settings,
    kerfMm: 3,
    activeSheetIndex: 0,
  };
}

describe("generateTcnV4 — TCN real (writer mo)", () => {
  it("produz TCN idêntico a exportNestingV4ToCnc", () => {
    const state = makeState();
    const a = generateTcnV4(state, { projectName: "ParityTest", applyTcnKerfPreference: false });
    const b = withIndustrialOutputAuthorization("tcn", () =>
      exportNestingV4ToCnc(state, "ParityTest")
    );
    expect(a.exportResult.files.length).toBe(b.files.length);
    expect(a.exportResult.files.length).toBeGreaterThan(0);
    expect(a.exportResult.files[0]!.tcn).toBe(b.files[0]!.tcn);
    expect(a.meta.writer).toBe("nesting_mo");
    expect(a.exportResult.files[0]!.tcn).toContain("W#2201");
  });

  it("parse extrai contornos W#2201 e furos W#81", () => {
    const state = makeState();
    const result = generateTcnV4(state, { projectName: "ParseTest", applyTcnKerfPreference: false });
    const file = result.exportResult.files[0]!;
    const parsed = parseTcnMoPanel(file.tcn, {
      filenameBase: file.filenameBase,
      panelIndex: file.panelIndex,
      thicknessMm: file.thicknessMm,
    });
    expect(parsed.points.length).toBeGreaterThan(4);
    expect(parsed.contours.length).toBeGreaterThan(0);
    // furos presentes no TCN quando existem no layout industrial
    const hasDrillBlocks = file.tcn.includes("W#81");
    if (hasDrillBlocks) {
      expect(parsed.drills.length).toBeGreaterThan(0);
    }
    const zMoves = parsed.points.filter((p) => p.kind === "plunge" || p.kind === "retract" || p.z !== 0);
    expect(zMoves.length).toBeGreaterThan(0);
  });

  it("valida kerf/offsets nas regras TCN e pseudo G-code visual", () => {
    const rules = normalizeLcaTcnRules({
      kerf: { preferredKerfMm: 4, showKerfCompensation: true },
      motion: { zSafeMm: 30, showZMoves: true, showFeedrate: true },
    });
    expect(rules.kerf.preferredKerfMm).toBe(4);
    expect(rules.motion.zSafeMm).toBe(30);
    const g = segmentsToPseudoGCode([
      { x: 10, y: 20, z: 25, rapid: true },
      { x: 10, y: 20, z: -19, feed: 1000 },
      { x: 100, y: 20, z: -19, feed: 8000 },
    ]);
    expect(g).toContain("G0");
    expect(g).toContain("G1");
    expect(g).toContain("Pseudo G-code visual");
  });
});
