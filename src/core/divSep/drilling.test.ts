import { describe, expect, it } from "vitest";
import { buildDivSepDrilling, calcDepthHolePositions } from "./drilling";
import {
  getCavilhaDepthMm,
  getCavilhaDiameterMm,
  getParafusoDistanceFromCavilhaMm,
} from "./cavilhaRules";
import {
  getDivSepInternalDims,
  resolveDivisorCenterX,
  resolveDivisorDimensions,
  resolveSeparadorCenterY,
  resolveSeparadorDimensions,
} from "./dimensions";
import { absoluteYToLateralPanelY } from "./shelfDrilling";
import { DIV_SEP_VERTICAL_CLEARANCE_MM } from "./coupling";
import { CORNER_FF_EDGE_DOWEL_DEPTH_MM } from "../cornerCabinet/cornerFixedFrontDowels";
import { CAVILHA_FACE_DEPTH_MM } from "../drill/cavilha10x40Rule";
import { countDivSepFerragens } from "./ferragens";
import {
  defaultDivisorItem,
  defaultSeparadorItem,
  DIV_SEP_ESPESSURA,
  DIV_SEP_TEST_RULES,
  makeDivSepTestBox,
  roundMm,
} from "./divSepTestHelpers";

const PANEL_EDGE_EPS_MM = 0.5;

function isSeparadorEdgeCavilha(h: { x: number; holeType?: string; topDrillable?: boolean }, larguraMm: number): boolean {
  if (h.holeType !== "cavilha" || h.topDrillable !== false) return false;
  return h.x <= PANEL_EDGE_EPS_MM || h.x >= larguraMm - PANEL_EDGE_EPS_MM;
}

describe("buildDivSepDrilling — SEP", () => {
  const rules = DIV_SEP_TEST_RULES;
  const box = makeDivSepTestBox({ separadores: [defaultSeparadorItem()] });
  const panelIds = box.panelIds!;
  const { getExtraHoles } = buildDivSepDrilling(box, panelIds, rules);
  const sepDims = resolveSeparadorDimensions(box, defaultSeparadorItem());
  const sepCenterY = resolveSeparadorCenterY(box, defaultSeparadorItem());
  const panelLarguraMm = defaultSeparadorItem().larguraMm ?? sepDims.larguraMm;

  it("cria cavilhas na espessura do SEP (XML, profundidade 30 mm)", () => {
    const sepHoles = getExtraHoles("separador", panelIds.separadores[0]);
    const edgeCavilhas = sepHoles.filter((h) => isSeparadorEdgeCavilha(h, panelLarguraMm));
    expect(edgeCavilhas.length).toBeGreaterThan(0);
    for (const h of edgeCavilhas) {
      expect(h.topDrillable).toBe(false);
      expect(roundMm(h.depth)).toBe(CORNER_FF_EDGE_DOWEL_DEPTH_MM);
      expect(roundMm(h.diameter)).toBe(getCavilhaDiameterMm(rules));
    }
  });

  it("não cria parafusos na peça SEP", () => {
    const sepHoles = getExtraHoles("separador", panelIds.separadores[0]);
    expect(sepHoles.some((h) => h.holeType === "parafuso")).toBe(false);
  });

  it("cria cavilhas nas laterais a 60 mm (SEP isolado sem parafusos laterais)", () => {
    const depthPos = calcDepthHolePositions(sepDims.profundidadeMm, rules);
    const latLeft = getExtraHoles("lateral_esquerda");
    const cavilhas = latLeft.filter((h) => h.holeType === "cavilha");
    const parafusos = latLeft.filter((h) => h.holeType === "parafuso");
    expect(cavilhas.every((h) => h.topDrillable === true)).toBe(true);
    expect(parafusos.length).toBe(0);
    expect(cavilhas.map((h) => roundMm(h.x)).sort()).toEqual(depthPos.cavilha.map(roundMm).sort());
    expect(new Set(cavilhas.map((h) => roundMm(h.y)))).toEqual(
      new Set([roundMm(absoluteYToLateralPanelY(box, sepCenterY))])
    );
    for (const c of cavilhas) {
      expect(roundMm(c.depth)).toBe(getCavilhaDepthMm(rules));
    }
  });
});

describe("buildDivSepDrilling — DIV", () => {
  const rules = DIV_SEP_TEST_RULES;
  const box = makeDivSepTestBox({ divisores: [defaultDivisorItem()] });
  const panelIds = box.panelIds!;
  const { getExtraHoles } = buildDivSepDrilling(box, panelIds, rules);
  const divDims = resolveDivisorDimensions(box, defaultDivisorItem());

  it("cria furos de bordo em CIMA e FUNDO (XML)", () => {
    const depthPos = calcDepthHolePositions(divDims.profundidadeMm, rules);
    const cima = getExtraHoles("cima").filter((h) => h.holeType === "cavilha");
    const fundo = getExtraHoles("fundo").filter((h) => h.holeType === "cavilha");
    expect(cima.length).toBeGreaterThan(0);
    expect(fundo.length).toBeGreaterThan(0);
    for (const h of [...cima, ...fundo]) {
      expect(h.topDrillable).toBe(false);
      expect(roundMm(h.depth)).toBe(CORNER_FF_EDGE_DOWEL_DEPTH_MM);
    }
    expect(cima.map((h) => roundMm(h.y)).sort()).toEqual(depthPos.cavilha.map(roundMm).sort());
  });

  it("não cria furos estruturais na peça DIV", () => {
    expect(getExtraHoles("divisorio", panelIds.divisores[0]).length).toBe(0);
  });
});

describe("buildDivSepDrilling — SEP+DIV combinados", () => {
  const rules = DIV_SEP_TEST_RULES;
  const sep = defaultSeparadorItem({ id: "sep-linked", positionMm: 600 });
  const div = defaultDivisorItem({
    id: "div-linked",
    linkedSeparadorId: "sep-linked",
    positionMm: 281,
  });
  const box = makeDivSepTestBox({
    dimensoes: { largura: 600, altura: 720, profundidade: 560 },
    separadores: [sep],
    divisores: [div],
  });
  const panelIds = box.panelIds!;
  const { getExtraHoles } = buildDivSepDrilling(box, panelIds, rules);

  it("ajusta altura do DIV ao SEP ligado", () => {
    const dims = resolveDivisorDimensions(box, div);
    const sepBottom = resolveSeparadorCenterY(box, sep) - resolveSeparadorDimensions(box, sep).alturaMm / 2;
    const expected = Math.floor(
      sepBottom - DIV_SEP_ESPESSURA - DIV_SEP_VERTICAL_CLEARANCE_MM
    );
    expect(dims.alturaMm).toBe(expected);
  });

  it("cria cavilhas na face inferior do SEP para o DIV", () => {
    const sepHoles = getExtraHoles("separador", panelIds.separadores[0]);
    const faceCavilhas = sepHoles.filter((h) => h.holeType === "cavilha" && h.topDrillable === true);
    expect(faceCavilhas.length).toBeGreaterThan(0);
    for (const h of faceCavilhas) {
      // Face SEP: 10×13 (par da aresta DIV 10×30) — SSOT CAVILHA_FACE_DEPTH_MM
      expect(roundMm(h.depth)).toBe(CAVILHA_FACE_DEPTH_MM);
    }
  });

  it("cria cavilhas e parafusos nas laterais quando SEP tem DIV ligado", () => {
    const sepDims = resolveSeparadorDimensions(box, sep);
    const depthPos = calcDepthHolePositions(sepDims.profundidadeMm, rules);
    const sepCenterY = resolveSeparadorCenterY(box, sep);
    const latLeft = getExtraHoles("lateral_esquerda");
    const cavilhas = latLeft.filter((h) => h.holeType === "cavilha");
    const parafusos = latLeft.filter((h) => h.holeType === "parafuso");
    expect(cavilhas.length).toBeGreaterThan(0);
    expect(parafusos.length).toBeGreaterThan(0);
    expect(cavilhas.map((h) => roundMm(h.x)).sort()).toEqual(depthPos.cavilha.map(roundMm).sort());
    expect(parafusos.map((h) => roundMm(h.x)).sort()).toEqual(depthPos.parafuso.map(roundMm).sort());
    expect(new Set(cavilhas.map((h) => roundMm(h.y)))).toEqual(
      new Set([roundMm(absoluteYToLateralPanelY(box, sepCenterY))])
    );
    expect(new Set(parafusos.map((h) => roundMm(h.y)))).toEqual(
      new Set([roundMm(absoluteYToLateralPanelY(box, sepCenterY))])
    );
  });

  it("não cria furos estruturais em CIMA quando DIV está ligado ao SEP", () => {
    const cimaStructural = getExtraHoles("cima").filter(
      (h) => h.holeType === "cavilha" || h.holeType === "parafuso"
    );
    expect(cimaStructural.length).toBe(0);
  });

  it("cria furos de bordo em FUNDO para o DIV ligado", () => {
    const divCenterX = resolveDivisorCenterX(box, div);
    const divDims = resolveDivisorDimensions(box, div);
    const depthPos = calcDepthHolePositions(divDims.profundidadeMm, rules);
    const fundoCavilhas = getExtraHoles("fundo").filter((h) => h.holeType === "cavilha");
    const fundoParafusos = getExtraHoles("fundo").filter((h) => h.holeType === "parafuso");

    expect(fundoCavilhas.length).toBeGreaterThan(0);
    expect(fundoParafusos.length).toBeGreaterThan(0);
    expect(fundoCavilhas.every((h) => roundMm(h.x) === roundMm(divCenterX))).toBe(true);
    expect(fundoParafusos.every((h) => roundMm(h.x) === roundMm(divCenterX))).toBe(true);
    expect(fundoCavilhas.map((h) => roundMm(h.y)).sort()).toEqual(depthPos.cavilha.map(roundMm).sort());
    expect(fundoParafusos.map((h) => roundMm(h.y)).sort()).toEqual(depthPos.parafuso.map(roundMm).sort());
    for (const p of fundoParafusos) {
      expect(roundMm(p.depth)).toBe(DIV_SEP_ESPESSURA);
    }
  });

  it("conta ferragens a partir dos furos gerados", () => {
    const drilling = buildDivSepDrilling(box, panelIds, rules);
    const counts = countDivSepFerragens(box, drilling);
    expect(counts).toEqual(drilling.countFerragens());
    expect(counts.cavilhas10).toBeGreaterThan(0);
    expect(counts.parafusos4x50).toBeGreaterThan(0);
  });
});

describe("buildDivSepDrilling — múltiplos DIV no mesmo SEP", () => {
  const rules = DIV_SEP_TEST_RULES;
  const sep = defaultSeparadorItem({ id: "sep-multi", positionMm: 400 });
  const divLeft = defaultDivisorItem({
    id: "div-left",
    linkedSeparadorId: "sep-multi",
    positionMm: 150,
  });
  const divRight = defaultDivisorItem({
    id: "div-right",
    linkedSeparadorId: "sep-multi",
    positionMm: 450,
  });
  const box = makeDivSepTestBox({
    separadores: [sep],
    divisores: [divLeft, divRight],
  });
  const panelIds = box.panelIds!;
  const { getExtraHoles } = buildDivSepDrilling(box, panelIds, rules);

  it("cria cavilhas na face inferior do SEP para cada DIV ligado", () => {
    const sepHoles = getExtraHoles("separador", panelIds.separadores[0]);
    const faceCavilhas = sepHoles.filter((h) => h.holeType === "cavilha" && h.topDrillable === true);
    const xs = [...new Set(faceCavilhas.map((h) => roundMm(h.x)))].sort((a, b) => a - b);

    const internal = getDivSepInternalDims(box);
    const sepDims = resolveSeparadorDimensions(box, sep);
    const sepLeftX = internal.espessura + (internal.larguraInterna - sepDims.larguraMm) / 2;
    const expectedXs = [divLeft, divRight]
      .map((item) => roundMm(resolveDivisorCenterX(box, item) - sepLeftX))
      .sort((a, b) => a - b);

    expect(xs).toEqual(expectedXs);
  });
});

describe("buildDivSepDrilling — flags Admin", () => {
  it("ignora ligação SEP+DIV quando enableDivSepCombinations=false", () => {
    const rules = { ...DIV_SEP_TEST_RULES, enableDivSepCombinations: false };
    const sep = defaultSeparadorItem({ id: "sep-flag", positionMm: 400 });
    const div = defaultDivisorItem({
      id: "div-flag",
      linkedSeparadorId: "sep-flag",
      positionMm: 281,
    });
    const box = makeDivSepTestBox({ separadores: [sep], divisores: [div] });
    const panelIds = box.panelIds!;
    const { getExtraHoles } = buildDivSepDrilling(box, panelIds, rules);

    const sepHoles = getExtraHoles("separador", panelIds.separadores[0]);
    expect(sepHoles.some((h) => h.topDrillable === true)).toBe(false);

    const cima = getExtraHoles("cima").filter((h) => h.holeType === "cavilha");
    const fundo = getExtraHoles("fundo").filter((h) => h.holeType === "cavilha");
    expect(cima.length).toBeGreaterThan(0);
    expect(fundo.length).toBeGreaterThan(0);
  });
});

describe("calcDepthHolePositions", () => {
  it("posiciona cavilha a 60 mm e parafuso a 90 mm", () => {
    const dist = getParafusoDistanceFromCavilhaMm(DIV_SEP_TEST_RULES);
    expect(dist).toBe(30);
    const pos = calcDepthHolePositions(400, DIV_SEP_TEST_RULES);
    expect(pos.cavilha).toEqual([60, 340]);
    expect(pos.parafuso).toEqual([90, 310]);
  });
});

describe("SEP LAT Y — caso industrial H=720 T=19 pos=600", () => {
  it("Y local LAT = 600 (= sepCenterAbs − T), não 619 absoluto", () => {
    const rules = DIV_SEP_TEST_RULES;
    const sep = defaultSeparadorItem({ id: "sep-720", positionMm: 600 });
    const div = defaultDivisorItem({
      id: "div-720",
      linkedSeparadorId: "sep-720",
      positionMm: 281,
    });
    const box = makeDivSepTestBox({
      dimensoes: { largura: 600, altura: 720, profundidade: 560 },
      espessura: 19,
      separadores: [sep],
      divisores: [div],
    });
    const panelIds = box.panelIds!;
    const { getExtraHoles } = buildDivSepDrilling(box, panelIds, rules);

    const sepCenterAbs = resolveSeparadorCenterY(box, sep);
    expect(roundMm(sepCenterAbs)).toBe(619);
    expect(roundMm(absoluteYToLateralPanelY(box, sepCenterAbs))).toBe(600);

    const latLeft = getExtraHoles("lateral_esquerda");
    const latRight = getExtraHoles("lateral_direita");
    const ys = [...latLeft, ...latRight]
      .filter((h) => h.holeType === "cavilha" || h.holeType === "parafuso")
      .map((h) => roundMm(h.y));

    expect(ys.length).toBeGreaterThan(0);
    expect(new Set(ys)).toEqual(new Set([600]));
    expect(ys.every((y) => y !== 619)).toBe(true);

    const divH = resolveDivisorDimensions(box, div).alturaMm;
    const sepBottom =
      sepCenterAbs - resolveSeparadorDimensions(box, sep).alturaMm / 2;
    expect(divH).toBe(Math.floor(sepBottom - 19 - DIV_SEP_VERTICAL_CLEARANCE_MM));
    expect(sepBottom - (19 + divH)).toBeGreaterThanOrEqual(DIV_SEP_VERTICAL_CLEARANCE_MM);
  });
});
