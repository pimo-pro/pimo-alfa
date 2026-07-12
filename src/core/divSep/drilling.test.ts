import { describe, expect, it } from "vitest";
import { buildDivSepDrilling, calcDepthHolePositions } from "./drilling";
import {
  getCavilhaDepthMm,
  getCavilhaDiameterMm,
  getParafusoDistanceFromCavilhaMm,
} from "./cavilhaRules";
import {
  resolveDivisorDimensions,
  resolveSeparadorCenterY,
  resolveSeparadorDimensions,
} from "./dimensions";
import { CORNER_FF_EDGE_DOWEL_DEPTH_MM } from "../cornerCabinet/cornerFixedFrontDowels";
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

  it("cria cavilhas de face e parafusos nas laterais a 60/90 mm", () => {
    const depthPos = calcDepthHolePositions(sepDims.profundidadeMm, rules);
    const latLeft = getExtraHoles("lateral_esquerda");
    const cavilhas = latLeft.filter((h) => h.holeType === "cavilha");
    const parafusos = latLeft.filter((h) => h.holeType === "parafuso");
    expect(cavilhas.every((h) => h.topDrillable === true)).toBe(true);
    expect(parafusos.every((h) => h.topDrillable === true)).toBe(true);
    expect(cavilhas.map((h) => roundMm(h.x)).sort()).toEqual(depthPos.cavilha.map(roundMm).sort());
    expect(parafusos.map((h) => roundMm(h.x)).sort()).toEqual(depthPos.parafuso.map(roundMm).sort());
    expect(new Set(cavilhas.map((h) => roundMm(h.y)))).toEqual(new Set([roundMm(sepCenterY)]));
    for (const p of parafusos) {
      expect(roundMm(p.depth)).toBe(DIV_SEP_ESPESSURA);
    }
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
    const expected = Math.round(sepBottom - DIV_SEP_ESPESSURA);
    expect(dims.alturaMm).toBe(expected);
  });

  it("cria cavilhas na face inferior do SEP para o DIV", () => {
    const sepHoles = getExtraHoles("separador", panelIds.separadores[0]);
    const faceCavilhas = sepHoles.filter((h) => h.holeType === "cavilha" && h.topDrillable === true);
    expect(faceCavilhas.length).toBeGreaterThan(0);
    for (const h of faceCavilhas) {
      expect(roundMm(h.depth)).toBe(CORNER_FF_EDGE_DOWEL_DEPTH_MM);
    }
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
