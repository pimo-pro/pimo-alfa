/**
 * Pairing industrial de cavilhas em módulos clássicos (CIMA/FUNDO ? laterais).
 * Regra global: 10×30 (espessura lateral) ? 10×13 (face cima/fundo) + CAVILHA_10x40.
 */

import type { PanelDrillHole, TechnicalDrillHole, DrillFace } from "../types";
import {
  CAVILHA_10x40_DIAMETER_MM,
  CAVILHA_10x40_FERRAGEM_ID,
  CAVILHA_EDGE_DEPTH_MM,
  CAVILHA_EDGE_HOLE_TYPE_ID,
  CAVILHA_FACE_DEPTH_MM,
  CAVILHA_FACE_HOLE_TYPE_ID,
} from "./cavilha10x40Rule";
import {
  DRILL_DOWEL_DEFAULT_BACK_MM,
  DRILL_DOWEL_DEFAULT_FRONT_MM,
  getDrillBackDistance,
  getDrillFrontDistance,
} from "./drillConfig";
import { calcLateralDowelHoles } from "./lateralDowels";

export type ModuleCavilhaSide = "le" | "ld";
export type ModuleCavilhaEdge = "top" | "bottom";
export type ModuleCavilhaDepthEnd = "front" | "back";

/** Chave estável do par lateral ? cima/fundo. */
export function moduleCavilhaPairKey(
  side: ModuleCavilhaSide,
  edge: ModuleCavilhaEdge,
  depthEnd: ModuleCavilhaDepthEnd
): string {
  return `mod-${side}-${edge}-${depthEnd}`;
}

export function resolveModuleCavilhaFrontBackMm(panelDepthMm: number): {
  frontMm: number;
  backMm: number;
  xFront: number;
  xBack: number;
} {
  const frontMm = getDrillFrontDistance() || DRILL_DOWEL_DEFAULT_FRONT_MM;
  const backMm = getDrillBackDistance() || DRILL_DOWEL_DEFAULT_BACK_MM;
  return {
    frontMm,
    backMm,
    xFront: frontMm,
    xBack: Math.max(frontMm, panelDepthMm - backMm),
  };
}

function depthEndFromX(x: number, xFront: number, xBack: number): ModuleCavilhaDepthEnd {
  return Math.abs(x - xFront) <= Math.abs(x - xBack) ? "front" : "back";
}

/**
 * Furos 10×30 na espessura das laterais (aresta cima/fundo).
 * Y = espessura/2 a partir da aresta (não 0/H — evita furo fora do painel).
 */
export function buildModuleLateralEdgeCavilhaHoles(params: {
  panelDepthMm: number;
  panelHeightMm: number;
  thicknessMm: number;
  side: "lateral_esquerda" | "lateral_direita";
}): PanelDrillHole[] {
  const { panelDepthMm, panelHeightMm, thicknessMm, side } = params;
  if (panelDepthMm <= 0 || panelHeightMm <= 0) return [];
  const sideKey: ModuleCavilhaSide = side === "lateral_esquerda" ? "le" : "ld";
  const edgeOffset = Math.max(0.5, thicknessMm / 2);
  const { xFront, xBack } = resolveModuleCavilhaFrontBackMm(panelDepthMm);
  const dowels = calcLateralDowelHoles(panelDepthMm);

  return dowels.map((h) => {
    const depthEnd = depthEndFromX(h.x, xFront, xBack);
    return {
      x: h.x,
      y: h.edge === "top" ? panelHeightMm - edgeOffset : edgeOffset,
      diameter: CAVILHA_10x40_DIAMETER_MM,
      depth: CAVILHA_EDGE_DEPTH_MM,
      holeType: "cavilha" as const,
      topDrillable: false,
      face: "B" as const,
      holeCatalogId: CAVILHA_EDGE_HOLE_TYPE_ID,
      ferragemId: CAVILHA_10x40_FERRAGEM_ID,
      pairedHoleKey: moduleCavilhaPairKey(sideKey, h.edge, depthEnd),
    };
  });
}

/**
 * Furos 10×13 na face de CIMA/FUNDO — pares das arestas das laterais.
 * CIMA ? edge "top"; FUNDO ? edge "bottom".
 */
export function buildModuleTopBottomFaceCavilhaHoles(params: {
  tipo: "cima" | "fundo";
  larguraMm: number;
  profundidadeMm: number;
  thicknessMm: number;
  face: DrillFace;
}): TechnicalDrillHole[] {
  const { tipo, larguraMm, profundidadeMm, thicknessMm, face } = params;
  if (larguraMm <= 0 || profundidadeMm <= 0) return [];

  const inset = Math.max(0.5, thicknessMm / 2);
  const { xFront, xBack } = resolveModuleCavilhaFrontBackMm(profundidadeMm);
  const yFront = xFront;
  const yBack = xBack;
  const xLeft = inset;
  const xRight = larguraMm - inset;
  const edge: ModuleCavilhaEdge = tipo === "cima" ? "top" : "bottom";

  const specs: Array<{ x: number; y: number; side: ModuleCavilhaSide; depthEnd: ModuleCavilhaDepthEnd }> = [
    { x: xLeft, y: yFront, side: "le", depthEnd: "front" },
    { x: xLeft, y: yBack, side: "le", depthEnd: "back" },
    { x: xRight, y: yFront, side: "ld", depthEnd: "front" },
    { x: xRight, y: yBack, side: "ld", depthEnd: "back" },
  ];

  return specs.map((s) => ({
    x: s.x,
    y: s.y,
    diametro: CAVILHA_10x40_DIAMETER_MM,
    profundidade: Math.min(CAVILHA_FACE_DEPTH_MM, Math.max(1, thicknessMm - 1)),
    tipo: "cavilha" as const,
    face,
    topDrillable: true,
    holeCatalogId: CAVILHA_FACE_HOLE_TYPE_ID,
    ferragemId: CAVILHA_10x40_FERRAGEM_ID,
    pairedHoleKey: moduleCavilhaPairKey(s.side, edge, s.depthEnd),
  }));
}
