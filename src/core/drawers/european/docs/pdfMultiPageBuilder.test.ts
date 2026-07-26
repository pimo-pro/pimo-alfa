import { describe, expect, it, vi } from "vitest";
import * as flags from "../../drawerSystemFlags";
import { generateEuropeanDrawer } from "../index";
import { buildMultiPagePdf } from "./pdfMultiPageBuilder";
import { buildEuropeanIndustrialDocs } from "./index";

describe("docs/pdfMultiPageBuilder", () => {
  it("gera 4 páginas lógicas sem substituir pdf existente", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    const box = {
      id: "cx",
      nome: "CX",
      dimensoes: { largura: 538, altura: 720, profundidade: 560 },
      espessura: 19,
      gavetas: 1,
      material: "mdf_branco",
      profundidadeInternaUtilMm: 500,
    };
    const result = generateEuropeanDrawer("hettich-innotech-atira", box, {
      systemId: "hettich-innotech-atira",
      heightMm: 144,
      depthMm: 450,
      softClose: true,
      pushOpen: false,
      count: 1,
    });
    const existingTitle = result.pdf.title;
    const existingPieces = result.pdf.pieceRows.length;
    const multi = buildMultiPagePdf(result, box);
    expect(multi.kind).toBe("european-docs-multipage");
    expect(multi.pages).toHaveLength(4);
    expect(multi.pages.map((p) => p.pageNumber)).toEqual([1, 2, 3, 4]);
    expect(multi.existingPdfTitle).toBe(existingTitle);
    expect(multi.existingPdfPieceRows).toBe(existingPieces);
    // PDF SSOT intacto
    expect(result.pdf.title).toBe(existingTitle);
    expect(result.pdf.pieceRows.length).toBe(existingPieces);

    const docs = buildEuropeanIndustrialDocs(result, box);
    expect(["DOCS_OK", "DOCS_WARN"]).toContain(docs.report.status);
    expect(docs.report.logicalPages).toBe(4);
    expect(result.docs?.report.logicalPages).toBe(4);
    vi.restoreAllMocks();
  });
});
