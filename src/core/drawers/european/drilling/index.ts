/**
 * drilling/ ù Geradores de furos do Sistema Europeu (Modelo B).
 * Laterais + costa: reutiliza pipeline do Modelo A (DrawerDrillingRules).
 * Nùo toca em industrial/**.
 */

import type { PieceType } from "../../../drilling/drillingService";
import type { PanelDrillHole, TechnicalDrillHole } from "../../../types";
import {
  computeDrawerCostaStructuralHoles,
  computeDrawerLateralStructuralHoles,
  computeDrawerPieceCorredicaHoles,
  getDrawerSlideDrillingRules,
} from "../../drilling/DrawerDrillingRules";
import type {
  DrawerEuropeanModel,
  DrawerGeometry,
  EuropeanDrawerBoxConfig,
  EuropeanDrawerBoxInput,
  EuropeanDrawerHole,
} from "../types";
import { buildEuropeanDrawerGeometry } from "../geometry";
import { EUROPEAN_BACK_THICKNESS_MM, EUROPEAN_SIDE_THICKNESS_MM } from "../measures";
import { memo } from "../perf/memo";
import { sanitizeHoles } from "../robustness/safeDrilling";

export type EuropeanDrillingInput = {
  model: DrawerEuropeanModel;
  box: EuropeanDrawerBoxInput;
  config: EuropeanDrawerBoxConfig;
  stackIndex: number;
  stackCount: number;
};

function toEuropeanHole(
  h: { x: number; y: number; diametro: number; profundidade: number; face?: string },
  pieceRef: string,
  holeType: EuropeanDrawerHole["holeType"]
): EuropeanDrawerHole {
  return {
    x: h.x,
    y: h.y,
    z: 0,
    diameter: h.diametro,
    depth: h.profundidade,
    holeType,
    face: "A",
    pieceRef,
  };
}

/**
 * Furos nas laterais da gaveta (gav_lat_esq / gav_lat_dir) via Modelo A.
 * Inclui corrediùa + estrutural (cavilha / costa / rasgo fundo).
 */
export function generateDrawerSideHolesFromModeloA(
  geometry: DrawerGeometry,
  softClose: boolean
): EuropeanDrawerHole[] {
  const rules = getDrawerSlideDrillingRules("Genùrica", "Nenhuma", {
    softClose,
    mode: "drawer_piece",
  });
  const holes: EuropeanDrawerHole[] = [];

  for (const side of [
    { tipo: "gaveta_lat_esq" as PieceType, ref: "gav_lat_esq", sideKey: "esq" as const, piece: geometry.leftSide },
    { tipo: "gaveta_lat_dir" as PieceType, ref: "gav_lat_dir", sideKey: "dir" as const, piece: geometry.rightSide },
  ]) {
    const largura = side.piece.depthMm;
    const altura = side.piece.heightMm;
    if (largura <= 0 || altura <= 0) continue;

    const corredica = computeDrawerPieceCorredicaHoles({
      pieceType: side.tipo,
      largura,
      altura,
      rules,
    });
    for (const h of corredica) {
      holes.push(toEuropeanHole(h, side.ref, "corredica"));
    }

    const structural = computeDrawerLateralStructuralHoles({
      largura,
      altura,
      espessura: EUROPEAN_SIDE_THICKNESS_MM,
      side: side.sideKey,
    });
    for (const h of structural) {
      holes.push(toEuropeanHole(h, side.ref, "fixacao_estrutural"));
    }
  }

  return holes;
}

/** Furos na costa (gav_costa) via Modelo A. */
export function generateDrawerBackHolesFromModeloA(geometry: DrawerGeometry): EuropeanDrawerHole[] {
  const largura = geometry.back.widthMm;
  const altura = geometry.back.heightMm;
  if (largura <= 0 || altura <= 0) return [];

  const structural = computeDrawerCostaStructuralHoles({
    largura,
    altura,
    espessura: EUROPEAN_BACK_THICKNESS_MM,
  });
  return structural.map((h) => toEuropeanHole(h, "gav_costa", "fixacao_estrutural"));
}

/**
 * Furos nas laterais do modulo (sistema 32 mm) ù referùncia de montagem.
 */
export function generateModuleLateralHoles(input: EuropeanDrillingInput): EuropeanDrawerHole[] {
  const { model, box, config, stackIndex, stackCount } = input;
  const geo = buildEuropeanDrawerGeometry(box, model, config, stackIndex, stackCount);
  const pattern = model.holePattern;
  const panelDepth = box.dimensoes.profundidade;
  const holes: EuropeanDrawerHole[] = [];

  const panelHeight = box.dimensoes.altura;
  const yFromBottom =
    panelHeight / 2 + geo.front.originYMm - geo.usefulHeightMm / 2 + pattern.bottomGapMm;

  const xs: number[] = [pattern.setbackFrontMm];
  const rear =
    pattern.setbackFrontMm +
    Math.floor((geo.runnerDepthMm - 80) / pattern.systemPitchMm) * pattern.systemPitchMm;
  if (rear > pattern.setbackFrontMm + pattern.systemPitchMm) {
    xs.push(Math.min(panelDepth - 20, rear));
  } else {
    xs.push(Math.min(panelDepth - 20, pattern.setbackFrontMm + 2 * pattern.systemPitchMm));
  }

  for (const side of ["module_lat_esq", "module_lat_dir"] as const) {
    for (const x of xs) {
      holes.push({
        x: Math.max(0, Math.min(panelDepth, x)),
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

  return holes;
}

/** Furos de fixaùùo da frente. */
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
function generateEuropeanDrawerHolesCore(input: EuropeanDrillingInput): EuropeanDrawerHole[] {
  const geo = buildEuropeanDrawerGeometry(
    input.box,
    input.model,
    input.config,
    input.stackIndex,
    input.stackCount
  );
  return sanitizeHoles([
    ...generateModuleLateralHoles(input),
    ...generateDrawerSideHolesFromModeloA(geo, input.config.softClose),
    ...generateDrawerBackHolesFromModeloA(geo),
    ...generateFrontFixationHoles(input),
    ...generateBottomHoles(input),
  ]);
}

/** Furos memoizados (cùlculos puros ù sem ficheiros industriais). */
export const generateEuropeanDrawerHoles = memo(generateEuropeanDrawerHolesCore, {
  namespace: "eu.drilling",
  maxSize: 256,
});

/** Converte furos de laterais do modulo para PanelDrillHole (cutlist). */
export function europeanHolesToPanelDrillHoles(
  holes: EuropeanDrawerHole[],
  pieceRef: "module_lat_esq" | "module_lat_dir" | "gav_lat_esq" | "gav_lat_dir" | "gav_costa"
) {
  return holes
    .filter((h) => h.pieceRef === pieceRef)
    .map((h) => ({
      x: h.x,
      y: h.y,
      diameter: h.diameter,
      depth: h.depth,
      holeType: (h.holeType === "corredica" ? "corredica" : "fixacao_estrutural") as PanelDrillHole["holeType"],
      face: h.face,
    }));
}

/** Export helper: furos estruturais Modelo A para consumo externo. */
export function europeanDrawerWoodPieceDrillHoles(geometry: DrawerGeometry, softClose: boolean): {
  latEsq: TechnicalDrillHole[];
  latDir: TechnicalDrillHole[];
  costa: TechnicalDrillHole[];
} {
  return {
    latEsq: computeDrawerLateralStructuralHoles({
      largura: geometry.leftSide.depthMm,
      altura: geometry.leftSide.heightMm,
      espessura: EUROPEAN_SIDE_THICKNESS_MM,
      side: "esq",
    }),
    latDir: computeDrawerLateralStructuralHoles({
      largura: geometry.rightSide.depthMm,
      altura: geometry.rightSide.heightMm,
      espessura: EUROPEAN_SIDE_THICKNESS_MM,
      side: "dir",
    }),
    costa: computeDrawerCostaStructuralHoles({
      largura: geometry.back.widthMm,
      altura: geometry.back.heightMm,
      espessura: EUROPEAN_BACK_THICKNESS_MM,
    }),
  };
}
