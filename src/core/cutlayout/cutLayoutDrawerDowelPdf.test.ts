/**
 * Garante que o layout PDF usa as mesmas cavilhas SSOT que o XML (drillExport).
 */
import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { cutlistToPieces } from "./cutLayoutEngine";
import { buildCutLayoutPdf, holesForPdf } from "./cutLayoutPdf";
import { applyRotationGeometryToSheets } from "./utils/cutLayoutGeomRotation";
import { computeDrawerLateralStructuralHoles } from "../drawers/drilling/DrawerDrillingRules";
import { buildPanelDrillingResult } from "../../modules/drilling/drillingAdapter";
import { defaultRulesConfig } from "../rules/rulesConfig";
import type { CutListItemComPreco } from "../types";
import type { CutPlacement } from "./cutLayoutTypes";

const LAT = { largura: 500, altura: 150, espessura: 16 } as const;

function latItem(side: "esq" | "dir"): CutListItemComPreco {
  const tipo = side === "esq" ? "gaveta_lat_esq" : "gaveta_lat_dir";
  const drilling = buildPanelDrillingResult(
    {
      tipo,
      larguraMm: LAT.largura,
      alturaMm: LAT.altura,
      espessuraMm: LAT.espessura,
    },
    defaultRulesConfig
  );
  expect(drilling.success).toBe(true);
  return {
    id: tipo,
    nome: tipo,
    tipo,
    quantidade: 1,
    dimensoes: {
      largura: LAT.largura,
      altura: LAT.altura,
      profundidade: LAT.espessura,
    },
    espessura: LAT.espessura,
    material: "MDF Branco 16",
    materialId: "mdf_branco",
    drillHoles: drilling.data!.drillHoles,
    precoUnitario: 0,
    precoTotal: 0,
  };
}

describe("layout PDF  cavilhas SSOT (interlock)", () => {
  it("cutlistToPieces NAO descarta cavilhas de aresta (topDrillable=false)", () => {
    const pieces = cutlistToPieces([latItem("esq")]);
    expect(pieces).toHaveLength(1);
    const holes = pieces[0]!.drillHoles ?? [];
    const cavilhas = holes.filter((h) => h.holeType === "cavilha");
    expect(cavilhas.length).toBe(4);
    const ys = [...new Set(cavilhas.map((h) => h.y))].sort((a, b) => a - b);
    expect(ys).toEqual([30, 39, 111, 120]);
    expect(cavilhas.every((h) => h.depth === 14)).toBe(true);
  });

  it("applyRotationGeometryToSheets preserva furos de aresta X=0/L", () => {
    const pieces = cutlistToPieces([latItem("esq")]);
    const pl: CutPlacement = {
      x_mm: 50,
      y_mm: 50,
      largura_mm: LAT.largura,
      altura_mm: LAT.altura,
      rotacao: 0,
      sheetIndex: 0,
      boxId: "box-1",
      pieceNumber: 1,
      shortCode: "1",
      partName: "LAT_ESQ",
      drillHoles: pieces[0]!.drillHoles,
    };
    applyRotationGeometryToSheets([
      {
        sheet: { largura_mm: 2800, altura_mm: 2070, espessura_mm: 16 },
        placements: [pl],
      },
    ]);
    const orig = pl.originalDrillHoles ?? [];
    const cavilhas = orig.filter((h) => h.holeType === "cavilha");
    expect(cavilhas.length).toBe(4);
    expect(cavilhas.some((h) => h.x === 0)).toBe(true);
    expect(cavilhas.some((h) => h.x === LAT.largura)).toBe(true);
    expect(cavilhas.some((h) => h.y === 39)).toBe(true);
  });

  it("holesForPdf inclui Y=39 e profundidade 14 (SSOT)", () => {
    const structural = computeDrawerLateralStructuralHoles({
      ...LAT,
      side: "esq",
    });
    const cavilhas = structural.filter((h) => h.tipo === "cavilha");
    const pl: CutPlacement = {
      x_mm: 100,
      y_mm: 100,
      largura_mm: LAT.largura,
      altura_mm: LAT.altura,
      rotacao: 0,
      sheetIndex: 0,
      boxId: "box-1",
      pieceNumber: 1,
      partName: "LAT",
      originalDrillHoles: cavilhas.map((h) => ({
        x: h.x,
        y: h.y,
        diameter: h.diametro,
        depth: h.profundidade,
        holeType: h.tipo,
        topDrillable: false,
      })),
    };
    const pdfHoles = holesForPdf(
      pl,
      { largura_mm: 2800, altura_mm: 2070, espessura_mm: 16 },
      false
    );
    expect(pdfHoles).toHaveLength(4);
    expect(pdfHoles.map((h) => h.y).sort((a, b) => a - b)).toEqual([30, 39, 111, 120]);
    expect(pdfHoles.every((h) => h.depth === 14)).toBe(true);
  });

  it("LAT_DIR espelho: traseira em X=0", () => {
    const pieces = cutlistToPieces([latItem("dir")]);
    const cavilhas = (pieces[0]!.drillHoles ?? []).filter((h) => h.holeType === "cavilha");
    // Em espaco cutlist, traseira dir = X=0 (face frente)
    const atZero = cavilhas.filter((h) => h.x === 0);
    expect(atZero.length).toBe(2);
    expect(atZero.map((h) => h.y).sort((a, b) => a - b)).toEqual([39, 111]);
  });

  it("gera PDF de evidencia com cavilhas SSOT (layout_gaveta_cavilhas_ssot.pdf)", async () => {
    const outDir = resolve(process.cwd(), "tmp");
    mkdirSync(outDir, { recursive: true });

    const pieces = cutlistToPieces([latItem("esq"), latItem("dir")]);
    const placements: CutPlacement[] = pieces.map((p, i) => ({
      x_mm: 50 + i * (LAT.largura + 40),
      y_mm: 80,
      largura_mm: p.largura_mm,
      altura_mm: p.altura_mm,
      rotacao: 0,
      sheetIndex: 0,
      boxId: `box-${i}`,
      pieceNumber: i + 1,
      shortCode: String(i + 1),
      partName: i === 0 ? "gav_lat_esq" : "gav_lat_dir",
      drillHoles: p.drillHoles,
    }));

    const sheet = {
      largura_mm: 2800,
      altura_mm: 2070,
      materialId: "mdf_branco",
      materialName: "MDF Branco 16",
      espessura_mm: LAT.espessura,
    };
    applyRotationGeometryToSheets([{ sheet, placements }]);

    const evidence = placements.map((pl) => ({
      part: pl.partName,
      pdfCavilhas: holesForPdf(pl, sheet, false)
        .filter((h) => h.holeType === "cavilha")
        .map((h) => ({ x: h.x, y: h.y, depth: h.depth })),
    }));
    writeFileSync(resolve(outDir, "layout_gaveta_cavilhas_ssot.json"), JSON.stringify(evidence, null, 2));

    const doc = await buildCutLayoutPdf(
      { sheets: [{ sheet, placements }] },
      { projectName: "Evidencia cavilhas SSOT" }
    );
    doc.save(resolve(outDir, "layout_gaveta_cavilhas_ssot.pdf"));

    expect(evidence[0]!.pdfCavilhas.some((h) => h.y === 39 && h.depth === 14)).toBe(true);
    expect(
      evidence[1]!.pdfCavilhas.filter((h) => h.x === 0).map((h) => h.y).sort((a, b) => a - b)
    ).toEqual([39, 111]);
  });
});
