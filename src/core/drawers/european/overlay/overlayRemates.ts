/**
 * overlayRemates.ts — Remates industriais documentais (+ layer REMATE para DXF).
 */

import type { EuropeanDrawerBoxInput, EuropeanDrawerResult } from "../types";

export type EuropeanOverlayRemate = {
  id: string;
  position: "cima" | "baixo" | "lat_dir" | "lat_esq";
  thicknessMm: number;
  recessMm: number;
  lengthMm: number;
  /** Entidade documental para integração DXF (layer REMATE). */
  dxfLayer: "REMATE";
};

export type EuropeanOverlayRemates = {
  items: EuropeanOverlayRemate[];
  defaultThicknessMm: number;
  defaultRecessMm: number;
};

const DEFAULT_REMATE_THICKNESS_MM = 19;
const DEFAULT_REMATE_RECESS_MM = 0;

/**
 * Remates documentais em torno do módulo — não gera peças reais.
 */
export function buildOverlayRemates(
  result: EuropeanDrawerResult,
  box?: EuropeanDrawerBoxInput
): EuropeanOverlayRemates {
  const thickness = box?.espessura && box.espessura > 0 ? box.espessura : DEFAULT_REMATE_THICKNESS_MM;
  const w = box?.dimensoes.largura ?? result.geometry.externalWidthMm + 2 * thickness;
  const h = box?.dimensoes.altura ?? result.geometry.usefulHeightMm + 100;
  const d = box?.dimensoes.profundidade ?? result.geometry.runnerDepthMm + 50;

  const items: EuropeanOverlayRemate[] = [
    {
      id: "remate_cima",
      position: "cima",
      thicknessMm: thickness,
      recessMm: DEFAULT_REMATE_RECESS_MM,
      lengthMm: w,
      dxfLayer: "REMATE",
    },
    {
      id: "remate_baixo",
      position: "baixo",
      thicknessMm: thickness,
      recessMm: DEFAULT_REMATE_RECESS_MM,
      lengthMm: w,
      dxfLayer: "REMATE",
    },
    {
      id: "remate_lat_dir",
      position: "lat_dir",
      thicknessMm: thickness,
      recessMm: DEFAULT_REMATE_RECESS_MM,
      lengthMm: h,
      dxfLayer: "REMATE",
    },
    {
      id: "remate_lat_esq",
      position: "lat_esq",
      thicknessMm: thickness,
      recessMm: DEFAULT_REMATE_RECESS_MM,
      lengthMm: h,
      dxfLayer: "REMATE",
    },
  ];

  void d;
  return {
    items,
    defaultThicknessMm: thickness,
    defaultRecessMm: DEFAULT_REMATE_RECESS_MM,
  };
}
