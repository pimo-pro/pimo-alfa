/**
 * overlayGaps.ts — Gaps industriais avançados (documentais).
 */

import type { EuropeanDrawerResult } from "../types";
import {
  EUROPEAN_BODY_DEPTH_SLIDE_CLEARANCE_MM,
  EUROPEAN_SIDE_CLEARANCE_EACH_MM,
} from "../measures";
import type { EuropeanOverlayAberturas } from "./overlayAberturas";

export type EuropeanOverlayGap = {
  id: string;
  label: string;
  valueMm: number;
  technicalView: "front" | "side_right" | "side_left" | "top" | "exploded";
  /** Layer documental sugerido no DXF. */
  dxfLayer: "DIMENSIONS" | "CUT";
};

export type EuropeanOverlayGaps = {
  items: EuropeanOverlayGap[];
  betweenDrawersMm: number;
  frontToBodyMm: number;
  lateralLeftMm: number;
  lateralRightMm: number;
  industrialMinimumMm: number;
  superiorMm: number;
  inferiorMm: number;
};

const STACK_GAP_MM = 6;
/** Gap industrial mínimo documental (folga lateral por lado). */
const INDUSTRIAL_MIN_GAP_MM = EUROPEAN_SIDE_CLEARANCE_EACH_MM;

/**
 * Gaps avançados alinhados às aberturas / regras Modelo B.
 */
export function buildOverlayGaps(
  result: EuropeanDrawerResult,
  aberturas: EuropeanOverlayAberturas
): EuropeanOverlayGaps {
  const betweenDrawersMm = STACK_GAP_MM;
  const frontToBodyMm = EUROPEAN_BODY_DEPTH_SLIDE_CLEARANCE_MM;
  const lateralLeftMm = EUROPEAN_SIDE_CLEARANCE_EACH_MM;
  const lateralRightMm = EUROPEAN_SIDE_CLEARANCE_EACH_MM;

  const items: EuropeanOverlayGap[] = [
    {
      id: "gap_entre_gavetas",
      label: "Gap entre gavetas",
      valueMm: betweenDrawersMm,
      technicalView: "side_right",
      dxfLayer: "DIMENSIONS",
    },
    {
      id: "gap_frente_corpo",
      label: "Gap frente ? corpo",
      valueMm: frontToBodyMm,
      technicalView: "top",
      dxfLayer: "DIMENSIONS",
    },
    {
      id: "gap_lateral_esq",
      label: "Gap lateral esquerdo",
      valueMm: lateralLeftMm,
      technicalView: "front",
      dxfLayer: "DIMENSIONS",
    },
    {
      id: "gap_lateral_dir",
      label: "Gap lateral direito",
      valueMm: lateralRightMm,
      technicalView: "front",
      dxfLayer: "DIMENSIONS",
    },
    {
      id: "gap_industrial_min",
      label: "Gap industrial mínimo",
      valueMm: INDUSTRIAL_MIN_GAP_MM,
      technicalView: "exploded",
      dxfLayer: "CUT",
    },
    {
      id: "gap_superior",
      label: "Gap superior",
      valueMm: aberturas.superiorMm,
      technicalView: "side_right",
      dxfLayer: "DIMENSIONS",
    },
    {
      id: "gap_inferior",
      label: "Gap inferior",
      valueMm: aberturas.inferiorMm,
      technicalView: "side_left",
      dxfLayer: "DIMENSIONS",
    },
  ];

  void result;
  return {
    items,
    betweenDrawersMm,
    frontToBodyMm,
    lateralLeftMm,
    lateralRightMm,
    industrialMinimumMm: INDUSTRIAL_MIN_GAP_MM,
    superiorMm: aberturas.superiorMm,
    inferiorMm: aberturas.inferiorMm,
  };
}
