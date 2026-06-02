/** Tipos partilhados Remate (acabamento visual) / Roda Pé (apenas visual — sem industrial). */

export type FinishDimensions = {
  widthMm: number;
  heightMm: number;
  depthMm: number;
};

export type FinishTransform = {
  xMm?: number;
  yMm?: number;
  zMm?: number;
  rotacaoXRad?: number;
  rotacaoYRad?: number;
  rotacaoZRad?: number;
};

export const RODAPE_MAX_LENGTH_MM = 2850;
export const RODAPE_DEFAULT_HEIGHT_MM = 150;
export const HEMATI_DEFAULT_THICKNESS_MM = 19;
export const HEMATI_AVISTA_DEPTH_MM = 100;
