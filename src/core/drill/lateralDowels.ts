import type { CutListItemComPreco } from "../types";
import {
  DRILL_DOWEL_DIAMETER_MM,
  DRILL_DOWEL_DEPTH_MM,
  getDrillFrontDistance,
  getDrillBackDistance,
} from "./drillConfig";

export type LateralDowelHole = {
  x: number; // posição ao longo do comprimento da lateral (mm)
  edge: "top" | "bottom"; // top = ligação a cima, bottom = ligação a fundo
  diameter: number;
  depth: number;
};

/**
 * Calcula os 4 furos de cavilha para uma peça lateral de MÓDULO (cutlist frame).
 * x1 = frontDistance (ex: 60mm) ao longo da **profundidade** (cutlist.largura)
 * x2 = panelDepth - backDistance
 * edge "top"/"bottom" = ligação a cima/fundo (eixo da **altura** no cutlist)
 *
 * No XML DRILL (golden módulo) estes furos são remapeados para:
 *   PanelLength=altura, PanelWidth=profundidade, X∈{0,L}, Y=x_cutlist.
 */
export function calcLateralDowelHoles(panelLengthMm: number): LateralDowelHole[] {
  const front = getDrillFrontDistance();
  const back = getDrillBackDistance();
  const x1 = front;
  const x2 = panelLengthMm - back;
  const holes: LateralDowelHole[] = [
    { x: x1, edge: "top", diameter: DRILL_DOWEL_DIAMETER_MM, depth: DRILL_DOWEL_DEPTH_MM },
    { x: x2, edge: "top", diameter: DRILL_DOWEL_DIAMETER_MM, depth: DRILL_DOWEL_DEPTH_MM },
    { x: x1, edge: "bottom", diameter: DRILL_DOWEL_DIAMETER_MM, depth: DRILL_DOWEL_DEPTH_MM },
    { x: x2, edge: "bottom", diameter: DRILL_DOWEL_DIAMETER_MM, depth: DRILL_DOWEL_DEPTH_MM },
  ];
  return holes;
}

/**
 * Devolve true se o item é uma peça lateral (esquerda ou direita).
 */
export function isLateralPanel(item: CutListItemComPreco): boolean {
  return item.tipo === "lateral_esquerda" || item.tipo === "lateral_direita";
}
