import type { PanelDrillHole } from "../types";
import {
  DRILL_DOWEL_DIAMETER_MM,
  getDrillFrontDistance,
} from "../drill/drillConfig";
import {
  CAVILHA_10x40_FERRAGEM_ID,
  CAVILHA_EDGE_DEPTH_MM,
  CAVILHA_EDGE_HOLE_TYPE_ID,
  CAVILHA_FACE_DEPTH_MM,
  CAVILHA_FACE_HOLE_TYPE_ID,
} from "../drill/cavilha10x40Rule";

/** Profundidade dos furos de cavilha na espessura (lado da peça). */
export const CORNER_FF_EDGE_DOWEL_DEPTH_MM = CAVILHA_EDGE_DEPTH_MM;
/** Profundidade dos furos de cavilha na face da frente fixa. */
export const CORNER_FF_FACE_DOWEL_DEPTH_MM = CAVILHA_FACE_DEPTH_MM;

export type CornerFixedFrontDowelLayout = {
  fixedFrontWidthMm: number;
  fixedFrontHeightMm: number;
  /** Largura da peça cima/fundo (mm) — para posicionar furos quando a frente fixa está à direita. */
  panelWidthMm: number;
  /** Lado da caixa onde a frente fixa está montada. */
  fixedFrontSide: "left" | "right";
  /** Espessura do material (mm) — distância à borda = espessura/2. */
  thicknessMm?: number;
};

export type CornerFixedFrontDowelHolesByPanel = {
  cima: PanelDrillHole[];
  fundo: PanelDrillHole[];
  lateral_esquerda?: PanelDrillHole[];
  lateral_direita?: PanelDrillHole[];
  frente_fixa: PanelDrillHole[];
};

export type CornerDowelOffsets = {
  /** Centro do furo a espessura/2 da borda perpendicular (mm). */
  edgeOffset: number;
  /** 60 mm para dentro a partir da face frontal (mm). */
  depthOffset: number;
};

export function resolveCornerDowelOffsets(thicknessMm: number): CornerDowelOffsets {
  const thickness = Math.max(1, thicknessMm);
  return {
    edgeOffset: thickness / 2,
    depthOffset: getDrillFrontDistance(),
  };
}

function edgeDowelHole(x: number, y: number, pairKey: string): PanelDrillHole {
  return {
    x,
    y,
    diameter: DRILL_DOWEL_DIAMETER_MM,
    depth: CORNER_FF_EDGE_DOWEL_DEPTH_MM,
    holeType: "cavilha",
    topDrillable: false,
    face: "B",
    pairedHoleKey: pairKey,
    holeCatalogId: CAVILHA_EDGE_HOLE_TYPE_ID,
    ferragemId: CAVILHA_10x40_FERRAGEM_ID,
  };
}

function faceDowelHole(x: number, y: number, pairKey: string): PanelDrillHole {
  return {
    x,
    y,
    diameter: DRILL_DOWEL_DIAMETER_MM,
    depth: CORNER_FF_FACE_DOWEL_DEPTH_MM,
    holeType: "cavilha",
    topDrillable: true,
    face: "B",
    pairedHoleKey: pairKey,
    holeCatalogId: CAVILHA_FACE_HOLE_TYPE_ID,
    ferragemId: CAVILHA_10x40_FERRAGEM_ID,
  };
}

function resolveFixedFrontHoleSpanX(
  layout: CornerFixedFrontDowelLayout,
  depthOffset: number,
  edgeOffset: number
): { xStart: number; xEnd: number; xLateralEdge: number; ffOriginX: number } {
  const ffW = Math.max(depthOffset * 2 + 1, layout.fixedFrontWidthMm);
  if (layout.fixedFrontSide === "left") {
    return {
      xStart: depthOffset,
      xEnd: ffW - depthOffset,
      xLateralEdge: edgeOffset,
      ffOriginX: 0,
    };
  }
  const panelW = Math.max(ffW, layout.panelWidthMm);
  const ffOriginX = panelW - ffW;
  return {
    xStart: ffOriginX + depthOffset,
    xEnd: panelW - depthOffset,
    xLateralEdge: ffOriginX + edgeOffset,
    ffOriginX,
  };
}

/**
 * Coordenadas Y da frente fixa alinhadas à lateral (origem Y=0 na base — Layout PRO / cutlist).
 * edgeOffset = espessura/2 da borda superior/inferior da lateral.
 */
export function resolveFrenteFixaLateralHoleYFromTop(
  frenteHeightMm: number,
  lateralHeightMm: number,
  edgeOffset: number
): { topY: number; bottomY: number } {
  const inset = Math.max(0, (frenteHeightMm - lateralHeightMm) / 2);
  return {
    topY: inset + Math.max(edgeOffset, lateralHeightMm - edgeOffset),
    bottomY: inset + edgeOffset,
  };
}

/**
 * Furos de cavilha entre CIMA/FUNDO/lateral e frente fixa (módulo Canto — Direita Inferior).
 * Cada furo 10×30 na espessura tem par 10×13 na face (mesmo `pairedHoleKey` + CAVILHA_10x40).
 */
export function buildCornerFixedFrontDowelHoles(
  layout: CornerFixedFrontDowelLayout,
  lateralHeightMm: number
): CornerFixedFrontDowelHolesByPanel {
  const { edgeOffset, depthOffset } = resolveCornerDowelOffsets(layout.thicknessMm ?? 19);
  const ffH = Math.max(edgeOffset * 2 + 1, layout.fixedFrontHeightMm);
  const { xStart, xEnd, xLateralEdge } = resolveFixedFrontHoleSpanX(
    layout,
    depthOffset,
    edgeOffset
  );

  const yTop = ffH - edgeOffset;
  const yBottom = edgeOffset;
  const lateralY = resolveFrenteFixaLateralHoleYFromTop(ffH, lateralHeightMm, edgeOffset);

  const latTopY = Math.max(edgeOffset, lateralHeightMm - edgeOffset);
  const latBottomY = edgeOffset;

  const pairCimaL = "ff-cima-l";
  const pairCimaR = "ff-cima-r";
  const pairFundoL = "ff-fundo-l";
  const pairFundoR = "ff-fundo-r";
  const pairLatTop = "ff-lat-top";
  const pairLatBot = "ff-lat-bot";

  const lateralHoles = [
    edgeDowelHole(depthOffset, latTopY, pairLatTop),
    edgeDowelHole(depthOffset, latBottomY, pairLatBot),
  ];

  const frenteFaceHoles: PanelDrillHole[] = [
    faceDowelHole(xStart, yTop, pairCimaL),
    faceDowelHole(xEnd, yTop, pairCimaR),
    faceDowelHole(xStart, yBottom, pairFundoL),
    faceDowelHole(xEnd, yBottom, pairFundoR),
    faceDowelHole(xLateralEdge, lateralY.topY, pairLatTop),
    faceDowelHole(xLateralEdge, lateralY.bottomY, pairLatBot),
  ];

  const result: CornerFixedFrontDowelHolesByPanel = {
    cima: [
      edgeDowelHole(xStart, depthOffset, pairCimaL),
      edgeDowelHole(xEnd, depthOffset, pairCimaR),
    ],
    fundo: [
      edgeDowelHole(xStart, depthOffset, pairFundoL),
      edgeDowelHole(xEnd, depthOffset, pairFundoR),
    ],
    frente_fixa: dedupePanelDrillHoles(frenteFaceHoles),
  };

  if (layout.fixedFrontSide === "left") {
    result.lateral_esquerda = lateralHoles;
  } else {
    result.lateral_direita = lateralHoles;
  }

  return result;
}

const HINGE_HOLE_TYPES = new Set([
  "dobradica",
  "dobradica_fixacao",
  "dobradica_parafuso_uniao",
]);

export function stripCornerFixedFrontHingeHoles(holes: PanelDrillHole[]): PanelDrillHole[] {
  return holes.filter((h) => !HINGE_HOLE_TYPES.has(h.holeType ?? ""));
}

/** Remove furos coincidentes (tolerância 0,5 mm) — evita dupla perfuração no TXML. */
export function dedupePanelDrillHoles(holes: PanelDrillHole[]): PanelDrillHole[] {
  const out: PanelDrillHole[] = [];
  for (const hole of holes) {
    const dup = out.some(
      (h) =>
        Math.abs(h.x - hole.x) < 0.5 &&
        Math.abs(h.y - hole.y) < 0.5 &&
        h.topDrillable === hole.topDrillable
    );
    if (!dup) out.push(hole);
  }
  return out;
}

/** Conta ligações lógicas (2 cima + 2 fundo + 2 lateral) antes de deduplicar. */
export function countCornerFixedFrontFaceDowelConnections(): number {
  return 6;
}
