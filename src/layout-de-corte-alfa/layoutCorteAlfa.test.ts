import { describe, expect, it } from "vitest";
import { buildVisualSimulation, buildVisualTcnReport } from "./simulation/buildVisualToolpaths";
import { DEFAULT_LCA_RULES, normalizeLcaRules } from "./rules/layoutCorteAlfaRules";
import type { V4Piece, V4Placement, V4Sheet } from "../nesting-v4/nestingV4Types";

function piece(id: string): V4Piece {
  return {
    id,
    name: id,
    widthMm: 400,
    heightMm: 300,
    thicknessMm: 19,
    materialId: "mdf",
    originalHoles: [{ x: 20, y: 30, diameter: 5, depth: 12, holeType: "confirmat" }],
    rotation: 0,
    color: "#ccc",
    industrialGrainCode: "YY",
  };
}

describe("Layout de Corte Alfa — simulação visual", () => {
  it("normalizeLcaRules aplica defaults", () => {
    const r = normalizeLcaRules(null);
    expect(r.cncOrigin.corner).toBe("top-right");
    expect(r.simulation.defaultSpeed).toBeGreaterThan(0);
  });

  it("buildVisualSimulation gera contornos, furos e estatísticas", () => {
    const sheet: V4Sheet = {
      index: 0,
      widthMm: 2800,
      heightMm: 2070,
      thicknessMm: 19,
    };
    const pieces = [piece("a"), piece("b")];
    const placements: V4Placement[] = [
      { pieceId: "a", sheetIndex: 0, xMm: 20, yMm: 20 },
      { pieceId: "b", sheetIndex: 0, xMm: 500, yMm: 20 },
    ];
    const sim = buildVisualSimulation(sheet, pieces, placements, 3, DEFAULT_LCA_RULES);
    expect(sim.stats.pieceCount).toBe(2);
    expect(sim.stats.holeCount).toBe(2);
    expect(sim.contours.some((c) => c.kind === "outer")).toBe(true);
    expect(sim.contours.some((c) => c.kind === "kerf")).toBe(true);
    expect(sim.toolpaths.some((t) => t.kind === "contour")).toBe(true);
    expect(sim.stats.utilizationPercent).toBeGreaterThan(0);
    expect(sim.stats.wastePercent).toBeLessThan(100);
  });

  it("buildVisualTcnReport marca simulação e não produção", () => {
    const sheet: V4Sheet = { index: 0, widthMm: 2800, heightMm: 2070, thicknessMm: 19 };
    const pieces = [piece("a")];
    const placements: V4Placement[] = [{ pieceId: "a", sheetIndex: 0, xMm: 10, yMm: 10 }];
    const sim = buildVisualSimulation(sheet, pieces, placements, 3, DEFAULT_LCA_RULES);
    const txt = buildVisualTcnReport("Demo", sheet, pieces, placements, 3, sim.stats);
    expect(txt).toContain("SIMULAÇÃO VISUAL");
    expect(txt).toContain("NÃO É FICHEIRO CNC DE PRODUÇÃO");
    expect(txt).toContain("nesting_mo");
  });
});
