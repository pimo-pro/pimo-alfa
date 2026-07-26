/**
 * technicalDrawingMode.ts — Modo de desenho técnico (agrega vistas).
 */

import type { EuropeanDrawerResult } from "../types";
import {
  buildExplodedView,
  buildFrontView,
  buildSideView,
  buildTopView,
  type EuropeanTechnicalView,
} from "./technicalViews";

export type EuropeanTechnicalDrawingMode = {
  mode: "technical-drawing";
  title: string;
  views: EuropeanTechnicalView[];
  viewIds: string[];
};

/**
 * Constrói o pacote de vistas técnicas a partir do resultado (somente leitura).
 */
export function buildTechnicalDrawingMode(
  result: EuropeanDrawerResult
): EuropeanTechnicalDrawingMode {
  const views: EuropeanTechnicalView[] = [
    buildFrontView(result),
    buildSideView(result, "right"),
    buildSideView(result, "left"),
    buildTopView(result),
    buildExplodedView(result),
  ];
  return {
    mode: "technical-drawing",
    title: `Desenho técnico — ${result.model.displayName}`,
    views,
    viewIds: views.map((v) => v.id),
  };
}
