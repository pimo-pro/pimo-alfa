import { describe, expect, it } from "vitest";
import {
  buildEuropeanModuleLateralCorredicaDrilling,
  computePiModuleLateralCorredicaHoles,
  getDrawerSlideDrillingRules,
  resolveEuropeanModuleRunnerLinesYMm,
} from "./DrawerDrillingRules";
import {
  HETTICH_QUADRO_V6_YOU_M_SILENT_SYSTEM,
  QUADRO_V6_YOU_M_B1_MM,
  QUADRO_V6_YOU_M_FRONT_X_MM,
  QUADRO_V6_YOU_M_SECOND_HOLE_SETBACK_MM,
  clampHoleToPanel,
  mirrorSlideHoleXFromFront,
  resolveCorredicaOverlaps,
  resolveSlideDrillingPattern,
} from "./drawerSlideDrillingCatalog";

const QUADRO = HETTICH_QUADRO_V6_YOU_M_SILENT_SYSTEM;

describe("Catalogo industrial de furacao por slideType", () => {
  it("Hettich ArciTech 500 mm — padrao System 32 com marca a 69", () => {
    const pattern = resolveSlideDrillingPattern({
      slideType: "Hettich ArciTech",
      panelDepthMm: 560,
      preferredLengthMm: 500,
    });
    expect(pattern.comprimentoMm).toBe(500);
    expect(pattern.alturaRelativaFundoMm).toBe(41);
    const xs = pattern.holes.map((h) => h.xFromFrontMm);
    expect(xs[0]).toBe(37);
    expect(xs).toContain(69);
    expect(xs[xs.length - 1]).toBe(500 - 37);
  });

  it("Quadro V6 YOU M NL 350 — X1=38, X2=X1+b1-1", () => {
    const nl = 350 as const;
    const b1 = QUADRO_V6_YOU_M_B1_MM[nl];
    const pattern = resolveSlideDrillingPattern({
      slideType: QUADRO,
      panelDepthMm: 400,
      preferredLengthMm: nl,
    });
    expect(pattern.slideType).toBe(QUADRO);
    expect(pattern.comprimentoMm).toBe(350);
    expect(pattern.alturaRelativaFundoMm).toBe(41);
    expect(pattern.holes).toHaveLength(2);
    expect(pattern.holes[0]!.xFromFrontMm).toBe(QUADRO_V6_YOU_M_FRONT_X_MM);
    expect(pattern.holes[1]!.xFromFrontMm).toBe(
      QUADRO_V6_YOU_M_FRONT_X_MM + b1 - QUADRO_V6_YOU_M_SECOND_HOLE_SETBACK_MM
    );
    expect(pattern.holes[1]!.xFromFrontMm).toBe(261); // 38+224-1
  });

  it("Quadro V6 YOU M NL 500 — X1=38, X2=293", () => {
    const pattern = resolveSlideDrillingPattern({
      slideType: QUADRO,
      panelDepthMm: 560,
      preferredLengthMm: 500,
    });
    const xs = pattern.holes.map((h) => h.xFromFrontMm);
    expect(xs[0]).toBe(38);
    expect(xs[1]).toBe(38 + 256 - 1);
    expect(xs[1]).toBe(293);
  });

  it("Quadro V6 — tabela completa NL 350-600 (b1 oficial)", () => {
    const expected: Record<number, number> = {
      350: 224,
      400: 224,
      450: 256,
      500: 256,
      550: 256,
      600: 256,
    };
    for (const [nlStr, b1] of Object.entries(expected)) {
      const nl = Number(nlStr);
      const pattern = resolveSlideDrillingPattern({
        slideType: QUADRO,
        panelDepthMm: nl + 60,
        preferredLengthMm: nl,
      });
      expect(pattern.holes[0]!.xFromFrontMm).toBe(38);
      expect(pattern.holes[1]!.xFromFrontMm).toBe(38 + b1 - 1);
    }
  });

  it("Quadro V6 — paridade L/R + Y>=41 + clamp", () => {
    const rules = getDrawerSlideDrillingRules(QUADRO, "Nenhuma", {
      mode: "pi_module_lateral",
      panelDepthMm: 560,
      slideLengthMm: 500,
    });
    expect(rules.offsetFrenteMm).toBe(38);
    expect(rules.holePatternFromFront[0]!.xFromFrontMm).toBe(38);
    expect(rules.holePatternFromFront[1]!.xFromFrontMm).toBe(293);

    const depth = 560;
    const height = 720;
    const yLines = [height - 41];
    const left = computePiModuleLateralCorredicaHoles({
      runnerLinesYMm: yLines,
      panelDepthMm: depth,
      panelHeightMm: height,
      side: "left",
      rules,
      useLegacyPiOffsets: false,
    });
    const right = computePiModuleLateralCorredicaHoles({
      runnerLinesYMm: yLines,
      panelDepthMm: depth,
      panelHeightMm: height,
      side: "right",
      rules,
      useLegacyPiOffsets: false,
    });

    expect(left.length).toBe(right.length);
    expect(left.length).toBe(2);
    for (let i = 0; i < right.length; i++) {
      expect(left[i]!.x + right[i]!.x).toBeCloseTo(depth, 5);
      expect(left[i]!.y).toBe(right[i]!.y);
      expect(height - left[i]!.y).toBeGreaterThanOrEqual(41 - 0.05);
    }
    expect(right.map((h) => h.x).sort((a, b) => a - b)).toEqual([38, 293]);
  });

  it("Quadro V6 — stack 3 gavetas: linhas sobem, Y_from_bottom >= 41", () => {
    const panelH = 720;
    const internalH = 720 - 2 * 19;
    const heights = [150, 150, 150];
    const drawers = heights.map((h, i) => {
      let offset = 10;
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
    expect(fromBottom[1]).toBeGreaterThan(fromBottom[0]!);
    expect(fromBottom[2]).toBeGreaterThan(fromBottom[1]!);
    for (const yb of fromBottom) {
      expect(yb).toBeGreaterThanOrEqual(41 - 0.05);
    }

    const holes = buildEuropeanModuleLateralCorredicaDrilling({
      runnerLinesYMm: lines,
      panelDepthMm: 400,
      panelHeightMm: panelH,
      side: "right",
      slideType: QUADRO,
      slideLengthMm: 350,
    });
    expect(holes.length).toBe(6); // 3 linhas x 2 furos
    for (const h of holes) {
      expect(panelH - h.y).toBeGreaterThanOrEqual(41 - 0.05);
      expect([38, 261]).toContain(h.x);
    }
  });

  it("Quadro V6 — cutlist/Viewer/XML partilham o mesmo padrao SSOT", () => {
    const pattern = resolveSlideDrillingPattern({
      slideType: "Quadro V6",
      panelDepthMm: 560,
      preferredLengthMm: 500,
    });
    const rules = getDrawerSlideDrillingRules(QUADRO, "Nenhuma", {
      mode: "pi_module_lateral",
      panelDepthMm: 560,
      slideLengthMm: 500,
    });
    const built = buildEuropeanModuleLateralCorredicaDrilling({
      runnerLinesYMm: [720 - 41],
      panelDepthMm: 560,
      panelHeightMm: 720,
      side: "right",
      slideType: QUADRO,
      slideLengthMm: 500,
    });
    const xsPattern = pattern.holes.map((h) => h.xFromFrontMm);
    const xsRules = rules.holePatternFromFront.map((h) => h.xFromFrontMm);
    const xsBuilt = built.map((h) => h.x).sort((a, b) => a - b);
    expect(xsPattern).toEqual([38, 293]);
    expect(xsRules).toEqual([38, 293]);
    expect(xsBuilt).toEqual([38, 293]);
  });

  it("paridade L/R — espelhamento completo do mark (ArciTech)", () => {
    const rules = getDrawerSlideDrillingRules("Hettich ArciTech", "Nenhuma", {
      mode: "pi_module_lateral",
      panelDepthMm: 560,
      slideLengthMm: 500,
    });
    const depth = 560;
    const yLines = [200];
    const left = computePiModuleLateralCorredicaHoles({
      runnerLinesYMm: yLines,
      panelDepthMm: depth,
      panelHeightMm: 720,
      side: "left",
      rules,
      useLegacyPiOffsets: false,
    });
    const right = computePiModuleLateralCorredicaHoles({
      runnerLinesYMm: yLines,
      panelDepthMm: depth,
      panelHeightMm: 720,
      side: "right",
      rules,
      useLegacyPiOffsets: false,
    });

    expect(left.length).toBe(right.length);
    for (let i = 0; i < right.length; i++) {
      expect(left[i]!.x + right[i]!.x).toBeCloseTo(depth, 5);
      expect(left[i]!.y).toBe(right[i]!.y);
    }
  });

  it("clamp — nenhum furo sai da peca", () => {
    const c = clampHoleToPanel(-10, 9999, 400, 700, 5);
    expect(c.x).toBeGreaterThanOrEqual(3);
    expect(c.x).toBeLessThanOrEqual(400 - 3);
    expect(c.y).toBeLessThanOrEqual(700 - 3);
    expect(c.clamped).toBe(true);
  });

  it("anti-overlap ajusta Y face a DIV/SEP", () => {
    const corredica = [{ x: 37, y: 200, holeType: "corredica" as const }];
    const existing = [{ x: 37, y: 200 }];
    const { holes, unresolved } = resolveCorredicaOverlaps(corredica, existing, 720, 5);
    expect(unresolved).toBe(0);
    expect(holes[0]!.y).not.toBe(200);
  });

  it("buildEuropean — L/R espelhados e dentro do painel", () => {
    const depth = 560;
    const height = 720;
    const common = {
      runnerLinesYMm: [180, 360],
      panelDepthMm: depth,
      panelHeightMm: height,
      slideType: "Hettich ArciTech",
      slideLengthMm: 500,
    } as const;
    const left = buildEuropeanModuleLateralCorredicaDrilling({ ...common, side: "left" });
    const right = buildEuropeanModuleLateralCorredicaDrilling({ ...common, side: "right" });
    expect(left.length).toBeGreaterThan(0);
    expect(left.length).toBe(right.length);
    for (const h of [...left, ...right]) {
      expect(h.x).toBeGreaterThanOrEqual(2);
      expect(h.x).toBeLessThanOrEqual(depth - 2);
      expect(h.y).toBeGreaterThanOrEqual(2);
      expect(h.y).toBeLessThanOrEqual(height - 2);
    }
    for (let i = 0; i < right.length; i++) {
      expect(left[i]!.x + right[i]!.x).toBeCloseTo(depth, 5);
    }
  });

  it("mirrorSlideHoleXFromFront", () => {
    expect(mirrorSlideHoleXFromFront(37, 560, "right", true)).toBe(37);
    expect(mirrorSlideHoleXFromFront(37, 560, "left", true)).toBe(560 - 37);
    expect(mirrorSlideHoleXFromFront(69, 560, "left", true)).toBe(560 - 69);
  });

  it("ArciTech 500 — linha inferior a 41 mm do bordo inferior (painel 560x720)", () => {
    const panelH = 720;
    const panelD = 560;
    const internalH = 720 - 2 * 19;
    const frontH = 178;
    const posY = -internalH / 2 + 10 + frontH / 2;
    const lines = resolveEuropeanModuleRunnerLinesYMm({
      panelHeightMm: panelH,
      boxInternalHeightMm: internalH,
      drawers: [{ posYMm: posY, frontHeightMm: frontH }],
      rules: getDrawerSlideDrillingRules("Hettich ArciTech", "Nenhuma", {
        mode: "pi_module_lateral",
        panelDepthMm: panelD,
        slideLengthMm: 500,
      }),
    });
    expect(lines).toHaveLength(1);
    const yFromBottom = panelH - lines[0]!;
    expect(yFromBottom).toBeCloseTo(41, 5);

    const holes = buildEuropeanModuleLateralCorredicaDrilling({
      runnerLinesYMm: lines,
      panelDepthMm: panelD,
      panelHeightMm: panelH,
      side: "right",
      slideType: "Hettich ArciTech",
      slideLengthMm: 500,
    });
    expect(holes.length).toBeGreaterThan(0);
    for (const h of holes) {
      expect(panelH - h.y).toBeGreaterThanOrEqual(41 - 0.05);
      expect(h.y).toBeGreaterThanOrEqual(41 - 0.05);
    }
  });

  it("gavetas superiores — linhas sobem e nunca Y_from_bottom < 41", () => {
    const panelH = 720;
    const internalH = 720 - 2 * 19;
    const heights = [150, 150, 150];
    const drawers = heights.map((h, i) => {
      let offset = 10;
      for (let j = 0; j < i; j++) offset += heights[j]! + 4;
      return {
        posYMm: -internalH / 2 + offset + h / 2,
        frontHeightMm: h,
      };
    });
    const lines = resolveEuropeanModuleRunnerLinesYMm({
      panelHeightMm: panelH,
      boxInternalHeightMm: internalH,
      drawers,
    });
    expect(lines.length).toBe(3);
    const fromBottom = lines.map((y) => panelH - y);
    expect(fromBottom[0]).toBeGreaterThanOrEqual(41 - 0.05);
    expect(fromBottom[1]).toBeGreaterThan(fromBottom[0]!);
    expect(fromBottom[2]).toBeGreaterThan(fromBottom[1]!);
    for (const yb of fromBottom) {
      expect(yb).toBeGreaterThanOrEqual(41 - 0.05);
    }
  });
});
