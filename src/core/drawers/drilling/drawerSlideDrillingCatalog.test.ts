import { describe, expect, it } from "vitest";
import {
  buildEuropeanModuleLateralCorredicaDrilling,
  computePiModuleLateralCorredicaHoles,
  getDrawerSlideDrillingRules,
  resolveEuropeanModuleRunnerLinesYMm,
} from "./DrawerDrillingRules";
import {
  HETTICH_QUADRO_V6_YOU_M_SILENT_SYSTEM,
  MODULE_SLIDE_EDGE_SETBACK_MM,
  MODULE_SLIDE_MARK_DEPTH_MM,
  QUADRO_V6_YOU_M_B1_MM,
  buildModuleSlideMarkingPattern,
  clampHoleToPanel,
  mirrorSlideHoleXFromFront,
  moduleSlideHoleCountForNl,
  resolveCorredicaOverlaps,
  resolveSlideDrillingPattern,
} from "./drawerSlideDrillingCatalog";
import { DRAWER_SLIDE_LENGTHS_MM } from "../drawerSlideDepth";

const QUADRO = HETTICH_QUADRO_V6_YOU_M_SILENT_SYSTEM;
const EDGE = MODULE_SLIDE_EDGE_SETBACK_MM;

describe("Catalogo industrial — marcacao corredica modulo (X1=38, X_last=D-38)", () => {
  it("NL 350 → 4 furos, X1=38, X_last=D-38, profundidade 1 mm", () => {
    const D = 350;
    const pattern = resolveSlideDrillingPattern({
      slideType: "Hettich ArciTech",
      panelDepthMm: D,
      preferredLengthMm: 350,
    });
    expect(pattern.holes).toHaveLength(4);
    expect(pattern.holes[0]!.xFromFrontMm).toBe(EDGE);
    expect(pattern.holes[pattern.holes.length - 1]!.xFromFrontMm).toBe(D - EDGE);
    expect(pattern.holes.every((h) => h.isMarkOnly === true)).toBe(true);
    expect(pattern.profundidadeMm).toBe(MODULE_SLIDE_MARK_DEPTH_MM);
    expect(pattern.profundidadeMarkMm).toBe(MODULE_SLIDE_MARK_DEPTH_MM);

    const rules = getDrawerSlideDrillingRules("Hettich ArciTech", "Nenhuma", {
      mode: "pi_module_lateral",
      panelDepthMm: D,
      slideLengthMm: 350,
    });
    const right = computePiModuleLateralCorredicaHoles({
      runnerLinesYMm: [200],
      panelDepthMm: D,
      panelHeightMm: 720,
      side: "right",
      rules,
      useLegacyPiOffsets: false,
    });
    expect(right).toHaveLength(4);
    expect(right.every((h) => h.depth === 1)).toBe(true);
    expect(right[0]!.x).toBe(EDGE);
    expect(right[3]!.x).toBe(D - EDGE);
  });

  it("NL 500 → 5 furos, X1=38, X_last=D-38, profundidade 1 mm", () => {
    const D = 500;
    const pattern = resolveSlideDrillingPattern({
      slideType: "Hettich ArciTech",
      panelDepthMm: D,
      preferredLengthMm: 500,
    });
    expect(pattern.holes).toHaveLength(5);
    expect(pattern.holes[0]!.xFromFrontMm).toBe(EDGE);
    expect(pattern.holes[pattern.holes.length - 1]!.xFromFrontMm).toBe(D - EDGE);
    expect(pattern.holes.every((h) => h.isMarkOnly === true)).toBe(true);

    const built = buildEuropeanModuleLateralCorredicaDrilling({
      runnerLinesYMm: [720 - 41],
      panelDepthMm: D,
      panelHeightMm: 720,
      side: "right",
      slideType: "Hettich ArciTech",
      slideLengthMm: 500,
    });
    expect(built).toHaveLength(5);
    expect(built.every((h) => h.depth === 1)).toBe(true);
    const xs = built.map((h) => h.x).sort((a, b) => a - b);
    expect(xs[0]).toBe(EDGE);
    expect(xs[xs.length - 1]).toBe(D - EDGE);
  });

  it("simetria L/R: left.x + right.x ≈ D", () => {
    const D = 560;
    const rules = getDrawerSlideDrillingRules("Hettich ArciTech", "Nenhuma", {
      mode: "pi_module_lateral",
      panelDepthMm: D,
      slideLengthMm: 500,
    });
    const left = computePiModuleLateralCorredicaHoles({
      runnerLinesYMm: [200],
      panelDepthMm: D,
      panelHeightMm: 720,
      side: "left",
      rules,
      useLegacyPiOffsets: false,
    });
    const right = computePiModuleLateralCorredicaHoles({
      runnerLinesYMm: [200],
      panelDepthMm: D,
      panelHeightMm: 720,
      side: "right",
      rules,
      useLegacyPiOffsets: false,
    });
    expect(left.length).toBe(5);
    expect(left.length).toBe(right.length);
    for (let i = 0; i < right.length; i++) {
      expect(left[i]!.x + right[i]!.x).toBeCloseTo(D, 5);
      expect(left[i]!.y).toBe(right[i]!.y);
      expect(left[i]!.depth).toBe(1);
      expect(right[i]!.depth).toBe(1);
    }
  });

  it("tabela NL 350-600: contagem 4/5 + extremos 38 / D-38", () => {
    for (const nl of DRAWER_SLIDE_LENGTHS_MM) {
      const D = nl;
      const n = moduleSlideHoleCountForNl(nl);
      expect(n).toBe(nl <= 400 ? 4 : 5);
      const holes = buildModuleSlideMarkingPattern({
        comprimentoMm: nl,
        panelDepthMm: D,
      });
      expect(holes).toHaveLength(n);
      expect(holes[0]!.xFromFrontMm).toBe(EDGE);
      expect(holes[holes.length - 1]!.xFromFrontMm).toBe(D - EDGE);
      expect(holes.every((h) => h.isMarkOnly)).toBe(true);
    }
  });

  it("Quadro V6 — intermedios ancorados no CC oficial (b1)", () => {
    const nl = 500 as const;
    const D = 560;
    const b1 = QUADRO_V6_YOU_M_B1_MM[nl];
    const cc = EDGE + b1 - 1; // 293
    const pattern = resolveSlideDrillingPattern({
      slideType: QUADRO,
      panelDepthMm: D,
      preferredLengthMm: nl,
    });
    expect(pattern.holes).toHaveLength(5);
    expect(pattern.holes[0]!.xFromFrontMm).toBe(EDGE);
    expect(pattern.holes[pattern.holes.length - 1]!.xFromFrontMm).toBe(D - EDGE);
    expect(pattern.holes.some((h) => h.xFromFrontMm === cc)).toBe(true);
  });

  it("Quadro V6 NL 350 — 4 furos, CC=261 entre extremos", () => {
    const nl = 350 as const;
    const D = 400;
    const cc = EDGE + QUADRO_V6_YOU_M_B1_MM[nl] - 1; // 261
    const pattern = resolveSlideDrillingPattern({
      slideType: QUADRO,
      panelDepthMm: D,
      preferredLengthMm: nl,
    });
    expect(pattern.holes).toHaveLength(4);
    expect(pattern.holes.map((h) => h.xFromFrontMm)).toContain(cc);
    expect(pattern.holes[0]!.xFromFrontMm).toBe(38);
    expect(pattern.holes[3]!.xFromFrontMm).toBe(D - 38);
  });

  it("cutlist = Viewer = XML = PDF (mesmo padrao SSOT de marcacao)", () => {
    const D = 560;
    const pattern = resolveSlideDrillingPattern({
      slideType: "Quadro V6",
      panelDepthMm: D,
      preferredLengthMm: 500,
    });
    const rules = getDrawerSlideDrillingRules(QUADRO, "Nenhuma", {
      mode: "pi_module_lateral",
      panelDepthMm: D,
      slideLengthMm: 500,
    });
    const built = buildEuropeanModuleLateralCorredicaDrilling({
      runnerLinesYMm: [720 - 41],
      panelDepthMm: D,
      panelHeightMm: 720,
      side: "right",
      slideType: QUADRO,
      slideLengthMm: 500,
    });
    const xsPattern = pattern.holes.map((h) => h.xFromFrontMm);
    const xsRules = rules.holePatternFromFront.map((h) => h.xFromFrontMm);
    const xsBuilt = built.map((h) => h.x).sort((a, b) => a - b);
    expect(xsPattern).toEqual(xsRules);
    expect(xsBuilt).toEqual([...xsPattern].sort((a, b) => a - b));
    expect(built.every((h) => h.depth === 1)).toBe(true);
    expect(rules.profundidadeMarkMm).toBe(1);
    expect(rules.offsetFrenteMm).toBe(38);
    expect(rules.offsetFundoMm).toBe(38);
  });

  it("Quadro V6 — stack 3 gavetas: linhas sobem, Y_from_bottom >= 41", () => {
    const panelH = 720;
    const internalH = 720 - 2 * 19;
    const heights = [150, 150, 150];
    // BASE_OFFSET = 0 (frente flush à base): 1ª gaveta começa no piso interno.
    const drawers = heights.map((h, i) => {
      let offset = 0;
      for (let j = 0; j < i; j++) offset += heights[j]! + 4;
      return {
        posYMm: -internalH / 2 + offset + h / 2,
        frontHeightMm: h,
      };
    });
    const rules = getDrawerSlideDrillingRules(QUADRO, "Nenhuma", {
      mode: "pi_module_lateral",
      panelDepthMm: 400,
      slideLengthMm: 350,
    });
    const lines = resolveEuropeanModuleRunnerLinesYMm({
      panelHeightMm: panelH,
      boxInternalHeightMm: internalH,
      drawers,
      rules,
    });
    expect(lines.length).toBe(3);
    const fromBottom = lines.map((y) => panelH - y);
    expect(fromBottom[0]).toBeCloseTo(41, 5);

    const holes = buildEuropeanModuleLateralCorredicaDrilling({
      runnerLinesYMm: lines,
      panelDepthMm: 400,
      panelHeightMm: panelH,
      side: "right",
      slideType: QUADRO,
      slideLengthMm: 350,
    });
    expect(holes.length).toBe(12); // 3 linhas x 4 furos
    expect(holes.every((h) => h.depth === 1)).toBe(true);
    for (const h of holes) {
      expect(panelH - h.y).toBeGreaterThanOrEqual(41 - 0.05);
    }
  });

  it("clamp — nenhum furo sai da peca", () => {
    const c = clampHoleToPanel(-10, 9999, 400, 700, 5);
    expect(c.x).toBeGreaterThanOrEqual(3);
    expect(c.x).toBeLessThanOrEqual(400 - 3);
    expect(c.clamped).toBe(true);
  });

  it("anti-overlap ajusta Y face a DIV/SEP", () => {
    const corredica = [{ x: 38, y: 200, holeType: "corredica" as const }];
    const existing = [{ x: 38, y: 200 }];
    const { holes, unresolved } = resolveCorredicaOverlaps(corredica, existing, 720, 5);
    expect(unresolved).toBe(0);
    expect(holes[0]!.y).not.toBe(200);
  });

  it("mirrorSlideHoleXFromFront", () => {
    expect(mirrorSlideHoleXFromFront(38, 560, "right", true)).toBe(38);
    expect(mirrorSlideHoleXFromFront(38, 560, "left", true)).toBe(560 - 38);
    expect(mirrorSlideHoleXFromFront(69, 560, "left", true)).toBe(560 - 69);
  });

  it("exemplos numericos NL 350 e NL 500 (D=NL)", () => {
    const h350 = buildModuleSlideMarkingPattern({ comprimentoMm: 350, panelDepthMm: 350 });
    expect(h350.map((h) => h.xFromFrontMm)).toEqual([38, 129.3, 220.7, 312]);

    const h500 = buildModuleSlideMarkingPattern({ comprimentoMm: 500, panelDepthMm: 500 });
    expect(h500.map((h) => h.xFromFrontMm)).toEqual([38, 144, 250, 356, 462]);
  });
});
