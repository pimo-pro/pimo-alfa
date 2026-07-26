/**
 * overlayAberturas.ts — Aberturas industriais (documentais).
 */

import type { EuropeanDrawerBoxInput, EuropeanDrawerResult } from "../types";
import {
  EUROPEAN_SIDE_CLEARANCE_EACH_MM,
  calcBoxInternalWidthMm,
} from "../measures";
import type { EuropeanOverlayMeasures } from "./overlayMeasures";

export type EuropeanOverlayAbertura = {
  id: string;
  label: string;
  valueMm: number;
  /** Vista técnica associada. */
  technicalView: "front" | "side_right" | "side_left" | "top" | "exploded";
  axis: "X" | "Y" | "Z";
};

export type EuropeanOverlayAberturas = {
  items: EuropeanOverlayAbertura[];
  frontalMm: number;
  lateralEachMm: number;
  superiorMm: number;
  inferiorMm: number;
};

const STACK_GAP_MM = 6;
const BASE_OFFSET_MM = 41;

/**
 * Aberturas industriais derivadas da geometry/box (sem alterar peças).
 */
export function buildOverlayAberturas(
  result: EuropeanDrawerResult,
  measures: EuropeanOverlayMeasures,
  box?: EuropeanDrawerBoxInput
): EuropeanOverlayAberturas {
  const g = result.geometry;
  const lateralEach = EUROPEAN_SIDE_CLEARANCE_EACH_MM;
  const frontal = measures.frontToBodyDistanceMm;

  let superior = STACK_GAP_MM;
  let inferior = BASE_OFFSET_MM;
  if (box) {
    const internalH = Math.max(0, box.dimensoes.altura - 2 * box.espessura);
    const count = Math.max(1, Math.floor(result.config.count ?? 1));
    const stackH = count * g.usefulHeightMm + (count - 1) * STACK_GAP_MM;
    superior = Math.max(0, internalH - BASE_OFFSET_MM - stackH);
    inferior = BASE_OFFSET_MM;
    void calcBoxInternalWidthMm(box);
  }

  const items: EuropeanOverlayAbertura[] = [
    {
      id: "abertura_frontal",
      label: "Abertura frontal (frente ? corpo)",
      valueMm: frontal,
      technicalView: "top",
      axis: "Z",
    },
    {
      id: "abertura_lateral",
      label: "Abertura lateral (gaveta ? parede)",
      valueMm: lateralEach,
      technicalView: "front",
      axis: "X",
    },
    {
      id: "abertura_superior",
      label: "Abertura superior (gaveta ? topo)",
      valueMm: superior,
      technicalView: "side_right",
      axis: "Y",
    },
    {
      id: "abertura_inferior",
      label: "Abertura inferior (gaveta ? fundo)",
      valueMm: inferior,
      technicalView: "side_left",
      axis: "Y",
    },
  ];

  return {
    items,
    frontalMm: frontal,
    lateralEachMm: lateralEach,
    superiorMm: superior,
    inferiorMm: inferior,
  };
}
