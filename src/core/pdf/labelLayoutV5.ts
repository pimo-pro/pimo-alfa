import type { LabelDimensions } from "../labelConfig/labelConfig";

/** Constantes de layout v5 — alinhadas ao renderer PDF. */
export const V5_LAYOUT_PAD_MM = 2.5;
export const V5_LAYOUT_CUT_LINE_MM = 0.5;
export const V5_LAYOUT_QR_GAP_BELOW_MM = 1.2;
export const V5_LAYOUT_MIN_OBS_BLOCK_MM = 3.5;

export type V5LabelLayoutMetrics = {
  pageW: number;
  pageH: number;
  bottomStripMm: number;
  /** Altura da secção superior (até ao início da faixa inferior). */
  topSectionMm: number;
  bottomY: number;
  cutY: number;
  obsY: number;
  qrSizeMm: number;
  gridH: number;
  /** Limite Y máximo do conteúdo (faixa inferior incluída). */
  maxY: number;
};

/**
 * Calcula métricas de layout v5 a partir das dimensões configuradas.
 * Usado pelo renderer PDF e por testes de conformidade 100×50 mm.
 */
export function computeV5LabelLayout(dims: LabelDimensions): V5LabelLayoutMetrics {
  const pageW = dims.totalWidth_mm;
  const pageH = dims.totalHeight_mm;
  const bottomStripMm = dims.bottomStrip_mm;
  const bottomY = pageH - bottomStripMm;
  const cutY = bottomY - V5_LAYOUT_CUT_LINE_MM;
  const obsY = cutY - dims.observationHeight_mm;

  const maxQrSize =
    bottomY - V5_LAYOUT_PAD_MM - V5_LAYOUT_QR_GAP_BELOW_MM - V5_LAYOUT_MIN_OBS_BLOCK_MM - V5_LAYOUT_PAD_MM;
  const qrSizeMm = Math.min(dims.qrSize_mm, maxQrSize);

  const yGrid = V5_LAYOUT_PAD_MM + dims.materialHeight_mm + dims.medidasHeight_mm;
  const gridH = obsY - yGrid;

  return {
    pageW,
    pageH,
    bottomStripMm,
    topSectionMm: bottomY,
    bottomY,
    cutY,
    obsY,
    qrSizeMm,
    gridH,
    maxY: pageH,
  };
}
