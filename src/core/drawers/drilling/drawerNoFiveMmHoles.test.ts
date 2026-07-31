/**
 * Garante que peùas da gaveta NUNCA recebem furos ù5 / corrediùa.
 * Corrediùas = apenas laterais do mùdulo.
 */
import { describe, expect, it } from "vitest";
import { calculateTechnicalDrillingsForPiece } from "../../drilling/drillingService";
import { buildPanelDrillingResult } from "../../../modules/drilling/drillingAdapter";
import { defaultRulesConfig } from "../../rules/rulesConfig";
import {
  computeDrawerPieceCorredicaHoles,
  getDrawerSlideDrillingRules,
} from "./DrawerDrillingRules";
import { cutlistToPieces } from "../../cutlayout/cutLayoutEngine";
import { holesForPdf } from "../../cutlayout/cutLayoutPdf";
import type { CutListItemComPreco } from "../../types";
import type { CutPlacement } from "../../cutlayout/cutLayoutTypes";

const TYPES = ["gaveta_lat_esq", "gaveta_lat_dir", "gaveta_traseira"] as const;
const DIM = { L: 500, H: 150, T: 16 };

function assertNoFiveMm(holes: Array<{ diameter?: number; diametro?: number; holeType?: string; tipo?: string }>) {
  for (const h of holes) {
    const d = h.diameter ?? h.diametro;
    expect(d).not.toBe(5);
    expect(h.holeType ?? h.tipo).not.toBe("corredica");
  }
}

describe("gaveta ù sem furos ù5 / corrediùa (SSOT ? PDF ? XML)", () => {
  it("computeDrawerPieceCorredicaHoles retorna sempre []", () => {
    const rules = getDrawerSlideDrillingRules("Hettich ArciTech", "Nenhuma", {
      mode: "drawer_piece",
      panelDepthMm: DIM.L,
    });
    for (const tipo of TYPES) {
      expect(
        computeDrawerPieceCorredicaHoles({
          pieceType: tipo,
          largura: DIM.L,
          altura: DIM.H,
          rules,
        })
      ).toEqual([]);
    }
  });

  it.each(TYPES)("%s ù calculateTechnicalDrillingsForPiece sem ù5", (tipo) => {
    const holes = calculateTechnicalDrillingsForPiece(
      { tipo, largura: DIM.L, altura: DIM.H, espessura: DIM.T },
      defaultRulesConfig
    );
    assertNoFiveMm(holes);
    expect(holes.some((h) => h.tipo === "cavilha")).toBe(true);
  });

  it.each(TYPES)("%s ù adapter cutlist sem ù5", (tipo) => {
    const result = buildPanelDrillingResult(
      { tipo, larguraMm: DIM.L, alturaMm: DIM.H, espessuraMm: DIM.T },
      defaultRulesConfig
    );
    expect(result.success).toBe(true);
    assertNoFiveMm(result.data!.drillHoles);
  });

  it("lat_esq ù cutlistToPieces + holesForPdf sù cavilhas (+ rasgo se presente)", () => {
    const result = buildPanelDrillingResult(
      { tipo: "gaveta_lat_esq", larguraMm: DIM.L, alturaMm: DIM.H, espessuraMm: DIM.T },
      defaultRulesConfig
    );
    const item: CutListItemComPreco = {
      id: "lat",
      nome: "lat",
      tipo: "gaveta_lat_esq",
      quantidade: 1,
      dimensoes: { largura: DIM.L, altura: DIM.H, profundidade: DIM.T },
      espessura: DIM.T,
      material: "MDF",
      materialId: "mdf",
      drillHoles: result.data!.drillHoles,
      precoUnitario: 0,
      precoTotal: 0,
    };
    const pieces = cutlistToPieces([item]);
    assertNoFiveMm(pieces[0]!.drillHoles ?? []);

    const pl: CutPlacement = {
      x_mm: 50,
      y_mm: 50,
      largura_mm: DIM.L,
      altura_mm: DIM.H,
      rotacao: 0,
      sheetIndex: 0,
      boxId: "b",
      partName: "gav_lat_esq",
      originalDrillHoles: pieces[0]!.drillHoles,
    };
    const forPdf = holesForPdf(pl, { largura_mm: 2800, altura_mm: 2070, espessura_mm: 16 }, false);
    assertNoFiveMm(forPdf);
    expect(forPdf.filter((h) => h.holeType === "cavilha")).toHaveLength(4);
  });
});
