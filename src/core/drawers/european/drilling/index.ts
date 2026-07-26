/**
 * drilling/ — Geradores de furos do Sistema Europeu (Modelo B).
 * Devolve coordenadas X/Y/Z + diametro + profundidade. Nao toca em industrial/**.
 */

import type {
  DrawerEuropeanModel,
  EuropeanDrawerBoxConfig,
  EuropeanDrawerBoxInput,
  EuropeanDrawerHole,
} from "../types";
import { calcBoxInternalWidthMm } from "../measures";
import { buildEuropeanDrawerGeometry } from "../geometry";

export type EuropeanDrillingInput = {
  model: DrawerEuropeanModel;
  box: EuropeanDrawerBoxInput;
  config: EuropeanDrawerBoxConfig;
  stackIndex: number;
  stackCount: number;
};

/**
 * Furos nas laterais do modulo (sistema 32 mm).
 * X: setback frontal + multiplos de 32 mm ao longo da profundidade.
 * Y: bottom gap + centro da gaveta empilhada.
 */
export function generateModuleLateralHoles(input: EuropeanDrillingInput): EuropeanDrawerHole[] {
  const { model, box, config, stackIndex, stackCount } = input;
  const geo = buildEuropeanDrawerGeometry(box, model, config, stackIndex, stackCount);
  const pattern = model.holePattern;
  const panelDepth = box.dimensoes.profundidade;
  const holes: EuropeanDrawerHole[] = [];

  const y =
    geo.front.originYMm -
    box.dimensoes.altura / 2 +
    box.dimensoes.altura / 2 +
    (pattern.bottomGapMm - geo.usefulHeightMm / 2);

  // Y no sistema do painel lateral: distancia a base do painel
  const panelHeight = box.dimensoes.altura;
  const yFromBottom =
    panelHeight / 2 +
    geo.front.originYMm -
    geo.usefulHeightMm / 2 +
    pattern.bottomGapMm;

  const xs: number[] = [pattern.setbackFrontMm];
  // Linha adicional a ~2/3 da profundidade util (sistema 32)
  const rear = pattern.setbackFrontMm + Math.floor((geo.runnerDepthMm - 80) / pattern.systemPitchMm) * pattern.systemPitchMm;
  if (rear > pattern.setbackFrontMm + pattern.systemPitchMm) {
    xs.push(Math.min(panelDepth - 20, rear));
  } else {
    xs.push(Math.min(panelDepth - 20, pattern.setbackFrontMm + 2 * pattern.systemPitchMm));
  }

  for (const side of ["module_lat_esq", "module_lat_dir"] as const) {
    for (const x of xs) {
      holes.push({
        x: Math.max(0, Math.min(panelDepth, x + (side === "module_lat_dir" ? 0 : 0))),
        y: Math.max(0, Math.min(panelHeight, yFromBottom)),
        z: pattern.lateralOffsetMm,
        diameter: pattern.runnerHoleDiameterMm,
        depth: pattern.runnerHoleDepthMm,
        holeType: "corredica",
        face: side === "module_lat_esq" ? "A" : "B",
        pieceRef: side,
      });
    }
  }

  void y;
  void calcBoxInternalWidthMm;
  return holes;
}

/** Furos de fixacao da frente na caixa metalica. */
export function generateFrontFixationHoles(input: EuropeanDrillingInput): EuropeanDrawerHole[] {
  const { model, box, config, stackIndex, stackCount } = input;
  const geo = buildEuropeanDrawerGeometry(box, model, config, stackIndex, stackCount);
  const pattern = model.holePattern;
  const w = geo.front.widthMm;
  const h = geo.front.heightMm;

  return [
    {
      x: pattern.setbackFrontMm,
      y: h / 2,
      z: 0,
      diameter: pattern.frontFixDiameterMm,
      depth: pattern.frontFixDepthMm,
      holeType: "fixacao_metalica",
      face: "B",
      pieceRef: "front",
    },
    {
      x: w - pattern.setbackFrontMm,
      y: h / 2,
      z: 0,
      diameter: pattern.frontFixDiameterMm,
      depth: pattern.frontFixDepthMm,
      holeType: "fixacao_metalica",
      face: "B",
      pieceRef: "front",
    },
  ];
}

/** Furos / referencias de encaixe do fundo (informativos para montagem). */
export function generateBottomHoles(input: EuropeanDrillingInput): EuropeanDrawerHole[] {
  const { model, box, config, stackIndex, stackCount } = input;
  const geo = buildEuropeanDrawerGeometry(box, model, config, stackIndex, stackCount);
  const inset = 20;
  return [
    {
      x: inset,
      y: geo.bottom.widthMm / 2,
      z: 0,
      diameter: 3,
      depth: Math.min(8, model.recommendedBottomThicknessMm),
      holeType: "fundo",
      face: "A",
      pieceRef: "bottom",
    },
    {
      x: geo.bottom.depthMm - inset,
      y: geo.bottom.widthMm / 2,
      z: 0,
      diameter: 3,
      depth: Math.min(8, model.recommendedBottomThicknessMm),
      holeType: "fundo",
      face: "A",
      pieceRef: "bottom",
    },
  ];
}

/** Agrega todos os furos do sistema para uma gaveta. */
export function generateEuropeanDrawerHoles(input: EuropeanDrillingInput): EuropeanDrawerHole[] {
  return [
    ...generateModuleLateralHoles(input),
    ...generateFrontFixationHoles(input),
    ...generateBottomHoles(input),
  ];
}

/** Converte furos de laterais do modulo para PanelDrillHole (cutlist). */
export function europeanHolesToPanelDrillHoles(
  holes: EuropeanDrawerHole[],
  pieceRef: "module_lat_esq" | "module_lat_dir"
) {
  return holes
    .filter((h) => h.pieceRef === pieceRef && h.holeType === "corredica")
    .map((h) => ({
      x: h.x,
      y: h.y,
      diameter: h.diameter,
      depth: h.depth,
      holeType: "corredica" as const,
      face: h.face,
    }));
}
