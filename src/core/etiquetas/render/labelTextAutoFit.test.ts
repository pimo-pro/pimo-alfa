import { describe, expect, it } from "vitest";
import jsPDF from "jspdf";
import { fitLabelTextInBox, labelPxToPt } from "./labelTextAutoFit";

describe("fitLabelTextInBox", () => {
  it("reduz font-size para texto longo e respeita mínimo de 8px", () => {
    const doc = new jsPDF({ unit: "mm", format: [100, 50] });
    const maxPt = labelPxToPt(14);
    const minPt = labelPxToPt(8);

    const fit = fitLabelTextInBox(
      doc,
      "PROJETO_MUITO_LONGO_CAIXA_FORNO_SEPARADOR_03",
      {
        maxFontPt: maxPt,
        minFontPx: 8,
        boxWidthMm: 40,
        boxHeightMm: 8,
      }
    );

    expect(fit.fontSizePt).toBeLessThanOrEqual(maxPt);
    expect(fit.fontSizePt).toBeGreaterThanOrEqual(minPt);
    expect(fit.lines.length).toBeGreaterThan(0);
  });

  it("mantém font-size máximo quando o texto cabe", () => {
    const doc = new jsPDF({ unit: "mm", format: [100, 50] });
    const maxPt = labelPxToPt(12);

    const fit = fitLabelTextInBox(doc, "CURTO", {
      maxFontPt: maxPt,
      minFontPx: 8,
      boxWidthMm: 60,
      boxHeightMm: 10,
    });

    expect(fit.fontSizePt).toBe(maxPt);
    expect(fit.lines).toEqual(["CURTO"]);
  });
});
