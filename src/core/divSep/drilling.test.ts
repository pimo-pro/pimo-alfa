import { describe, expect, it } from "vitest";
import { buildDivSepDrilling } from "./drilling";
import {
  calcularPosicoesCavilha,
  getCavilhaDepthMm,
  getCavilhaDiameterMm,
  getParafusoDistanceFromCavilhaMm,
} from "./cavilhaRules";
import {
  resolveDivisorDimensions,
  resolveSeparadorDimensions,
} from "./dimensions";
import {
  defaultDivisorItem,
  defaultSeparadorItem,
  DIV_SEP_ESPESSURA,
  DIV_SEP_TEST_RULES,
  makeDivSepTestBox,
  parafusoOffsetsFromCavilha,
  roundMm,
} from "./divSepTestHelpers";

describe("buildDivSepDrilling — cavilha e parafuso", () => {
  const rules = DIV_SEP_TEST_RULES;
  const parafusoDist = getParafusoDistanceFromCavilhaMm(rules);
  const cavilhaD = getCavilhaDiameterMm(rules);
  const cavilhaDepth = getCavilhaDepthMm(rules);

  const box = makeDivSepTestBox({
    divisores: [defaultDivisorItem()],
    separadores: [defaultSeparadorItem()],
  });

  const panelIds = box.panelIds!;
  const { getExtraHoles } = buildDivSepDrilling(box, panelIds, rules);

  const sepDims = resolveSeparadorDimensions(box, defaultSeparadorItem());
  const divDims = resolveDivisorDimensions(box, defaultDivisorItem());
  const sepDepthCenter = sepDims.profundidadeMm / 2;
  const divDepthCenter = divDims.profundidadeMm / 2;

  it("posiciona cavilhas do SEP nas faixas corretas ao longo da largura", () => {
    const sepHoles = getExtraHoles("separador", panelIds.separadores[0]);
    const expectedX = calcularPosicoesCavilha(sepDims.larguraMm, rules);
    const cavilhaXs = sepHoles.filter((h) => h.holeType === "cavilha").map((h) => roundMm(h.x));
    expect(cavilhaXs.sort((a, b) => a - b)).toEqual(expectedX.map(roundMm).sort((a, b) => a - b));
  });

  it("posiciona cavilhas do DIV nas faixas corretas ao longo da altura", () => {
    const divHoles = getExtraHoles("divisorio", panelIds.divisores[0]);
    const expectedY = calcularPosicoesCavilha(divDims.alturaMm, rules);
    const cavilhaYs = divHoles.filter((h) => h.holeType === "cavilha").map((h) => roundMm(h.y));
    expect(cavilhaYs.sort((a, b) => a - b)).toEqual(expectedY.map(roundMm).sort((a, b) => a - b));
  });

  it("centra cavilhas no eixo de profundidade da peça (profundidade / 2)", () => {
    const sepCavilhas = getExtraHoles("separador", panelIds.separadores[0]).filter(
      (h) => h.holeType === "cavilha"
    );
    for (const h of sepCavilhas) {
      expect(roundMm(h.y)).toBe(roundMm(sepDepthCenter));
    }

    const divCavilhas = getExtraHoles("divisorio", panelIds.divisores[0]).filter(
      (h) => h.holeType === "cavilha"
    );
    for (const h of divCavilhas) {
      expect(roundMm(h.x)).toBe(roundMm(divDepthCenter));
    }
  });

  it("parafuso fica sempre a 30 mm do centro da cavilha (SEP e DIV)", () => {
    const sepResult = parafusoOffsetsFromCavilha(
      getExtraHoles("separador", panelIds.separadores[0]),
      parafusoDist
    );
    expect(sepResult.cavilhaCount).toBeGreaterThan(0);
    expect(sepResult.validPairCount).toBe(sepResult.cavilhaCount);

    const divResult = parafusoOffsetsFromCavilha(
      getExtraHoles("divisorio", panelIds.divisores[0]),
      parafusoDist
    );
    expect(divResult.cavilhaCount).toBeGreaterThan(0);
    expect(divResult.validPairCount).toBe(divResult.cavilhaCount);
  });

  it("profundidade do parafuso na peça receptora = espessura do corpo", () => {
    const sepHoles = getExtraHoles("separador", panelIds.separadores[0]);
    const parafusos = sepHoles.filter((h) => h.holeType === "parafuso");
    expect(parafusos.length).toBeGreaterThan(0);
    for (const p of parafusos) {
      expect(roundMm(p.depth)).toBe(DIV_SEP_ESPESSURA);
    }
  });

  it("cavilhas usam diâmetro 10 mm e profundidade 13 mm", () => {
    const allCavilhas = [
      ...getExtraHoles("separador", panelIds.separadores[0]),
      ...getExtraHoles("divisorio", panelIds.divisores[0]),
      ...getExtraHoles("lateral_esquerda"),
      ...getExtraHoles("lateral_direita"),
      ...getExtraHoles("cima"),
      ...getExtraHoles("fundo"),
    ].filter((h) => h.holeType === "cavilha");

    expect(allCavilhas.length).toBeGreaterThan(0);
    for (const h of allCavilhas) {
      expect(roundMm(h.diameter)).toBe(cavilhaD);
      expect(roundMm(h.depth)).toBe(cavilhaDepth);
    }
  });

  it("SEP gera furos correspondentes nas laterais ESQ/DIR", () => {
    expect(getExtraHoles("lateral_esquerda").some((h) => h.holeType === "cavilha")).toBe(true);
    expect(getExtraHoles("lateral_direita").some((h) => h.holeType === "cavilha")).toBe(true);
  });

  it("DIV gera furos correspondentes em CIMA e FUNDO", () => {
    expect(getExtraHoles("cima").some((h) => h.holeType === "cavilha")).toBe(true);
    expect(getExtraHoles("fundo").some((h) => h.holeType === "cavilha")).toBe(true);
  });
});

describe("buildDivSepDrilling — faixas de comprimento por peça", () => {
  it.each([
    { comprimento: 80, offset: 15 },
    { comprimento: 120, offset: 30 },
    { comprimento: 180, offset: 40 },
    { comprimento: 400, offset: 60 },
  ])("comprimento $comprimento mm → offset $offset mm", ({ comprimento, offset }) => {
    const positions = calcularPosicoesCavilha(comprimento, DIV_SEP_TEST_RULES);
    expect(positions[0]).toBe(offset);
    if (positions.length > 1) {
      expect(positions[1]).toBe(comprimento - offset);
    }
  });
});
