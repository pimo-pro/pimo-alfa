import { describe, expect, it } from "vitest";
import {
  formatThicknessBucket,
  groupCutlistItemsByThickness,
  industrialThicknessEtiquetasPdfFileName,
  industrialThicknessLayoutPdfFileName,
  industrialThicknessLayoutPdfPath,
  sortThicknessKeys,
} from "../cnc/industrialThicknessGroups";
import type { CutlistItemForPieces } from "../cutlayout/cutLayoutEngine";

function item(nome: string, espessura: number): CutlistItemForPieces {
  return {
    nome,
    espessura,
    dimensoes: { largura: 100, altura: 200, profundidade: espessura },
  } as CutlistItemForPieces;
}

describe("industrialThicknessGroups", () => {
  it("formata pastas de espessura", () => {
    expect(formatThicknessBucket(18)).toBe("18mm");
    expect(formatThicknessBucket(19.5)).toBe("19_5mm");
    expect(industrialThicknessLayoutPdfFileName(18)).toBe("layout_18mm.pdf");
    expect(industrialThicknessEtiquetasPdfFileName(18)).toBe("etiquetas_18mm.pdf");
    expect(industrialThicknessLayoutPdfPath(18)).toBe("cnc/18mm/layout_18mm.pdf");
  });

  it("agrupa cutlist por espessura", () => {
    const grouped = groupCutlistItemsByThickness([
      item("A", 18),
      item("B", 19),
      item("C", 18),
      item("D", 15),
    ]);
    expect(sortThicknessKeys(grouped.keys())).toEqual([15, 18, 19]);
    expect(grouped.get(18)?.map((i) => i.nome)).toEqual(["A", "C"]);
    expect(grouped.get(19)?.map((i) => i.nome)).toEqual(["B"]);
  });
});
