import type { PanelDrillHole } from "../types";
import {
  DRILL_DOWEL_DIAMETER_MM,
  getDrillFrontDistance,
} from "../drill/drillConfig";

/** Profundidade dos furos de cavilha na espessura (lado da peça). */
export const CORNER_FF_EDGE_DOWEL_DEPTH_MM = 30;
/** Profundidade dos furos de cavilha na face da frente fixa. */
export const CORNER_FF_FACE_DOWEL_DEPTH_MM = 13;

export type CornerFixedFrontDowelLayout = {
  fixedFrontWidthMm: number;
  fixedFrontHeightMm: number;
  /** Largura da peça cima/fundo (mm) — para posicionar furos quando a frente fixa está à direita. */
  panelWidthMm: number;
  /** Lado da caixa onde a frente fixa está montada. */
  fixedFrontSide: "left" | "right";
};

export type CornerFixedFrontDowelHolesByPanel = {
  cima: PanelDrillHole[];
  fundo: PanelDrillHole[];
  lateral_esquerda?: PanelDrillHole[];
  lateral_direita?: PanelDrillHole[];
  frente_fixa: PanelDrillHole[];
};

function edgeDowelHole(x: number, y: number): PanelDrillHole {
  return {
    x,
    y,
    diameter: DRILL_DOWEL_DIAMETER_MM,
    depth: CORNER_FF_EDGE_DOWEL_DEPTH_MM,
    holeType: "cavilha",
    topDrillable: false,
    face: "B",
  };
}

function faceDowelHole(x: number, y: number): PanelDrillHole {
  return {
    x,
    y,
    diameter: DRILL_DOWEL_DIAMETER_MM,
    depth: CORNER_FF_FACE_DOWEL_DEPTH_MM,
    holeType: "cavilha",
    topDrillable: true,
    face: "B",
  };
}

function resolveFixedFrontHoleSpanX(
  layout: CornerFixedFrontDowelLayout,
  offset: number
): { xStart: number; xEnd: number; xLateralEdge: number } {
  const ffW = Math.max(offset * 2 + 1, layout.fixedFrontWidthMm);
  if (layout.fixedFrontSide === "left") {
    return { xStart: offset, xEnd: ffW - offset, xLateralEdge: offset };
  }
  const panelW = Math.max(ffW, layout.panelWidthMm);
  return {
    xStart: panelW - ffW + offset,
    xEnd: panelW - offset,
    xLateralEdge: panelW - ffW + offset,
  };
}

/** Mapeia 60 mm do topo/base da lateral para coordenadas Y da frente fixa (Y=0 no topo). */
export function resolveFrenteFixaLateralHoleYFromTop(
  frenteHeightMm: number,
  lateralHeightMm: number,
  offset: number
): { topY: number; bottomY: number } {
  const inset = Math.max(0, (frenteHeightMm - lateralHeightMm) / 2);
  return {
    topY: inset + offset,
    bottomY: inset + Math.max(offset, lateralHeightMm - offset),
  };
}

/**
 * Furos de cavilha entre CIMA/FUNDO/lateral e frente fixa (módulo Canto — Direita Inferior).
 * Frente fixa: 6 ligações na face (2 cima + 2 fundo + 2 lateral), deduplicadas se coincidentes.
 */
export function buildCornerFixedFrontDowelHoles(
  layout: CornerFixedFrontDowelLayout,
  lateralHeightMm: number
): CornerFixedFrontDowelHolesByPanel {
  const offset = getDrillFrontDistance();
  const ffH = Math.max(offset * 2 + 1, layout.fixedFrontHeightMm);
  const { xStart, xEnd, xLateralEdge } = resolveFixedFrontHoleSpanX(layout, offset);
  const yTop = offset;
  const yBottom = ffH - offset;
  const lateralY = resolveFrenteFixaLateralHoleYFromTop(ffH, lateralHeightMm, offset);
  const latTop = Math.max(offset, lateralHeightMm - offset);
  const latBottom = offset;
  const lateralHoles = [edgeDowelHole(offset, latTop), edgeDowelHole(offset, latBottom)];

  const frenteFaceHoles: PanelDrillHole[] = [
    faceDowelHole(xStart, yTop),
    faceDowelHole(xEnd, yTop),
    faceDowelHole(xStart, yBottom),
    faceDowelHole(xEnd, yBottom),
    faceDowelHole(xLateralEdge, lateralY.topY),
    faceDowelHole(xLateralEdge, lateralY.bottomY),
  ];

  const result: CornerFixedFrontDowelHolesByPanel = {
    cima: [edgeDowelHole(xStart, offset), edgeDowelHole(xEnd, offset)],
    fundo: [edgeDowelHole(xStart, offset), edgeDowelHole(xEnd, offset)],
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
