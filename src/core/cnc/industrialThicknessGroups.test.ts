import { describe, expect, it } from "vitest";
import {
  formatMaterialFolderToken,
  formatMaterialThicknessFolderName,
  formatThicknessFolderSuffix,
  groupCutlistItemsByMaterialAndThickness,
  groupCutlistItemsByThickness,
  industrialThicknessEtiquetasPdfFileName,
  industrialThicknessLayoutPdfFileName,
  industrialThicknessLayoutPdfPath,
  industrialThicknessTcnDirPath,
  sortThicknessKeys,
} from "../cnc/industrialThicknessGroups";
import type { CutlistItemForPieces } from "../cutlayout/cutLayoutEngine";

function item(
  nome: string,
  espessura: number,
  material?: string,
  materialId?: string
): CutlistItemForPieces {
  return {
    nome,
    espessura,
    material,
    materialId,
    dimensoes: { largura: 100, altura: 200, profundidade: espessura },
  } as CutlistItemForPieces;
}

describe("industrialThicknessGroups", () => {
  it("formata pastas material + espessura em UPPERCASE", () => {
    expect(formatMaterialFolderToken("MDF Branco")).toBe("MDF_BRANCO");
    expect(formatMaterialFolderToken("HDF CRU")).toBe("HDF_CRU");
    expect(formatThicknessFolderSuffix(19)).toBe("19MM");
    expect(formatThicknessFolderSuffix(19.5)).toBe("19_5MM");
    expect(formatMaterialThicknessFolderName("MDF Branco", 19)).toBe("MDF_BRANCO_19MM");
    expect(formatMaterialThicknessFolderName("HDF CRU", 10)).toBe("HDF_CRU_10MM");
    expect(industrialThicknessLayoutPdfFileName("MDF_BRANCO_19MM")).toBe(
      "layout_MDF_BRANCO_19MM.pdf"
    );
    expect(industrialThicknessEtiquetasPdfFileName("MDF_BRANCO_19MM")).toBe(
      "etiquetas_MDF_BRANCO_19MM.pdf"
    );
    expect(industrialThicknessLayoutPdfPath("MDF_BRANCO_19MM")).toBe(
      "cnc/MDF_BRANCO_19MM/layout_MDF_BRANCO_19MM.pdf"
    );
    expect(industrialThicknessTcnDirPath("MDF_CARVALHO_16MM")).toBe(
      "cnc/MDF_CARVALHO_16MM/tcn"
    );
  });

  it("agrupa cutlist por espessura (legado)", () => {
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

  it("agrupa cutlist por material + espessura", () => {
    const grouped = groupCutlistItemsByMaterialAndThickness([
      item("A", 19, "MDF Branco", "mdf_branco"),
      item("B", 19, "HDF CRU", "hdf_cru"),
      item("C", 19, "MDF Branco", "mdf_branco"),
      item("D", 16, "MDF Branco", "mdf_branco"),
    ]);
    expect(grouped.size).toBe(3);
    const keys = [...grouped.keys()];
    expect(keys.some((k) => k.includes("19") && grouped.get(k)?.length === 1)).toBe(true);
    expect(keys.some((k) => k.includes("16"))).toBe(true);
  });
});
