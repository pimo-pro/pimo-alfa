import { describe, it, expect } from "vitest";
import {
  buildEtiquetaCodeV5,
  buildEtiquetaQrPayloadV5,
  buildPiecesPerSheetMap,
  extractProjectSigla,
  formatNumCaixa,
  labelItemSheetKey,
} from "./etiquetaCodeV5";

describe("etiquetaCodeV5", () => {
  it("exemplo 1: NPKCVLD08-1", () => {
    expect(extractProjectSigla("NOVO_PROJETO_KHALED_C2_V3_LAT_DIR")).toBe("NPKCVLD");
    expect(
      buildEtiquetaCodeV5({
        projectName: "NOVO_PROJETO_KHALED_C2_V3_LAT_DIR",
        totalPiecesInSheet: 8,
        pieceSeq: 1,
      })
    ).toBe("NPKCVLD08-1");
  });

  it("exemplo 2: CAP12-5 (sem nome industrial — sufixo legado)", () => {
    expect(extractProjectSigla("COZINHA AZUL PREMIUM")).toBe("CAP");
    expect(
      buildEtiquetaCodeV5({
        projectName: "COZINHA AZUL PREMIUM",
        totalPiecesInSheet: 12,
        pieceSeq: 5,
      })
    ).toBe("CAP12-5");
  });

  it("código curto industrial + NUM_CAIXA (3 dígitos) + seq", () => {
    expect(
      buildEtiquetaCodeV5({
        projectName: "NP262269",
        totalPiecesInSheet: 5,
        pieceSeq: 1,
        boxName: "Caixa 1",
        nomeIndustrial: "C1_top",
      })
    ).toBe("NCT005-1");
    expect(
      buildEtiquetaCodeV5({
        projectName: "NP2624622",
        totalPiecesInSheet: 3,
        pieceSeq: 6,
        boxName: "Caixa Forno",
        nomeIndustrial: "NP2624622_Caixa_Forno_SEP_03",
      })
    ).toBe("NCFS003-6");
  });

  it("metadata industrialLabel — letras dos tokens semânticos", () => {
    expect(
      buildEtiquetaCodeV5({
        projectName: "ANTONIO_NOVO_5",
        totalPiecesInSheet: 4,
        pieceSeq: 6,
        boxName: "CC4",
        nomeIndustrial: "ANTONIO_NOVO_5_CC4_REMATE_L_B_01",
      })
    ).toBe("ANCRLB004-6");
  });

  it("NUM_CAIXA inválido → 00", () => {
    expect(formatNumCaixa(0)).toBe("00");
    expect(formatNumCaixa(-3)).toBe("00");
    expect(
      buildEtiquetaCodeV5({
        projectName: "TESTE",
        totalPiecesInSheet: 0,
        pieceSeq: 1,
      })
    ).toBe("T00-1");
  });

  it("payload QR v5 — nome industrial completo + número", () => {
    expect(
      buildEtiquetaQrPayloadV5({
        industrialPieceRef: "ANTONIO_NOVO_5_CC4_REMATE_L_B_01",
        pieceSeq: 6,
      })
    ).toBe("ANTONIO_NOVO_5_CC4_REMATE_L_B_01-6");
  });
});

describe("buildPiecesPerSheetMap", () => {
  it("4.1 — com placements: totais por sheetIndex", () => {
    const items = [
      { boxId: "b1", nome: "p1" },
      { boxId: "b1", nome: "p2" },
      { boxId: "b2", nome: "p3" },
    ];
    const placements = [
      { boxId: "b1", partName: "p1", sheetIndex: 0 },
      { boxId: "b1", partName: "p2", sheetIndex: 0 },
      { boxId: "b2", partName: "p3", sheetIndex: 1 },
    ];
    const map = buildPiecesPerSheetMap(items, placements);
    expect(map.get(labelItemSheetKey("b1", "p1"))).toBe(2);
    expect(map.get(labelItemSheetKey("b1", "p2"))).toBe(2);
    expect(map.get(labelItemSheetKey("b2", "p3"))).toBe(1);
  });

  it("4.1b — sem match em placements: fallback por boxId", () => {
    const items = [
      { boxId: "b1", nome: "p1" },
      { boxId: "b1", nome: "p_extra" },
    ];
    const placements = [{ boxId: "b1", partName: "p1", sheetIndex: 0 }];
    const map = buildPiecesPerSheetMap(items, placements);
    expect(map.get(labelItemSheetKey("b1", "p1"))).toBe(1);
    expect(map.get(labelItemSheetKey("b1", "p_extra"))).toBe(2);
  });

  it("4.2 — sem placements: agrupa por boxId", () => {
    const items = [
      { boxId: "A", nome: "x" },
      { boxId: "A", nome: "y" },
      { boxId: "B", nome: "z" },
    ];
    const map = buildPiecesPerSheetMap(items);
    expect(map.get(labelItemSheetKey("A", "x"))).toBe(2);
    expect(map.get(labelItemSheetKey("B", "z"))).toBe(1);
  });

  it("4.3 — sem placements e sem boxId: agrupa por nome", () => {
    const items = [{ nome: "lat_esq" }, { nome: "lat_esq" }, { nome: "cima" }];
    const map = buildPiecesPerSheetMap(items);
    expect(map.get(labelItemSheetKey(undefined, "lat_esq"))).toBe(2);
    expect(map.get(labelItemSheetKey(undefined, "cima"))).toBe(1);
  });

  it("4.4 — totalPiecesInSheet = 0 → código com 00", () => {
    expect(
      buildEtiquetaCodeV5({
        projectName: "TESTE",
        totalPiecesInSheet: 0,
        pieceSeq: 3,
      })
    ).toBe("T00-3");
  });
});
