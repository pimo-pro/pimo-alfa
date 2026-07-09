import type jsPDF from "jspdf";

/** px CSS @96dpi → pontos jsPDF (≈ font-size em px). */
export function labelPxToPt(px: number): number {
  return px * 0.75;
}

/** Altura de linha em mm para um tamanho de fonte em pontos. */
export function labelLineHeightMm(fontPt: number, lineHeight = 1.15): number {
  return fontPt * 0.352778 * lineHeight;
}

export type LabelTextAutoFitOptions = {
  maxFontPt: number;
  minFontPx?: number;
  boxWidthMm: number;
  boxHeightMm: number;
  fontName?: string;
  fontStyle?: string;
  lineHeight?: number;
};

export type LabelTextAutoFitResult = {
  fontSizePt: number;
  lines: string[];
  lineHeightMm: number;
};

/**
 * Reduz o font-size até o texto caber na caixa (largura + altura), sem clipping.
 * Limite mínimo: 8px (legibilidade na impressão).
 */
export function fitLabelTextInBox(
  doc: jsPDF,
  text: string,
  options: LabelTextAutoFitOptions
): LabelTextAutoFitResult {
  const content = String(text ?? "").trim();
  const minFontPt = labelPxToPt(options.minFontPx ?? 8);
  const fontName = options.fontName ?? "helvetica";
  const fontStyle = options.fontStyle ?? "normal";
  const lineHeight = options.lineHeight ?? 1.15;
  const boxW = Math.max(0.1, options.boxWidthMm);
  const boxH = Math.max(0.1, options.boxHeightMm);

  if (!content) {
    return { fontSizePt: minFontPt, lines: [], lineHeightMm: labelLineHeightMm(minFontPt, lineHeight) };
  }

  let fontPt = Math.max(minFontPt, options.maxFontPt);
  while (fontPt >= minFontPt) {
    doc.setFont(fontName, fontStyle);
    doc.setFontSize(fontPt);
    const lines = doc.splitTextToSize(content, boxW) as string[];
    const lhMm = labelLineHeightMm(fontPt, lineHeight);
    const totalH = lines.length * lhMm;
    const widest = lines.reduce((max, line) => Math.max(max, doc.getTextWidth(line)), 0);
    if (totalH <= boxH + 0.05 && widest <= boxW + 0.05) {
      return { fontSizePt: fontPt, lines, lineHeightMm: lhMm };
    }
    fontPt -= 0.25;
  }

  doc.setFont(fontName, fontStyle);
  doc.setFontSize(minFontPt);
  const lines = doc.splitTextToSize(content, boxW) as string[];
  const lhMm = labelLineHeightMm(minFontPt, lineHeight);
  return { fontSizePt: minFontPt, lines, lineHeightMm: lhMm };
}

/** Desenha texto auto-fit centrado verticalmente na caixa, sem padding interno. */
export function drawAutoFitLabelText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  options: LabelTextAutoFitOptions
): LabelTextAutoFitResult {
  const fit = fitLabelTextInBox(doc, text, options);
  if (fit.lines.length === 0) return fit;

  doc.setFont(options.fontName ?? "helvetica", options.fontStyle ?? "normal");
  doc.setFontSize(fit.fontSizePt);

  const totalH = fit.lines.length * fit.lineHeightMm;
  let textY = y + Math.max(0, (options.boxHeightMm - totalH) / 2) + fit.fontSizePt * 0.35;

  for (const line of fit.lines) {
    doc.text(line, x, textY, { maxWidth: options.boxWidthMm });
    textY += fit.lineHeightMm;
  }

  return fit;
}
