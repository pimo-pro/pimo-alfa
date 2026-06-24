import { describe, expect, it } from "vitest";
import { defaultRulesConfig } from "../rules/rulesConfig";
import type { BoxModule, CutListItemComPreco } from "../types";
import { attachQrCodesToCutlist } from "./qrcodeService";
import {
  resolveEtiquetaDisplayCodeV5,
  resolveUnifiedEtiquetaQrCode,
} from "../etiquetas/qr/etiquetaQr";

describe("resolveUnifiedEtiquetaQrCode", () => {
  const boxes: BoxModule[] = [
    {
      id: "box-1",
      nome: "CC4",
      dimensoes: { largura: 600, altura: 720, profundidade: 560 },
      espessura: 19,
      tipoBorda: "reta",
      tipoFundo: "integrado",
      models: [],
      prateleiras: 0,
      portaTipo: "sem_porta",
      gavetas: 0,
      alturaGaveta: 0,
      doorsLayer: [],
      drawersLayer: [],
      cutList: [],
      cutListComPreco: [],
      ferragens: [],
      precoTotalPecas: 0,
      estrutura3D: null,
    },
  ];

  const ctx = {
    projectName: "ANTONIO_NOVO_5",
    boxes,
    rules: defaultRulesConfig,
  };

  const item: CutListItemComPreco = {
    id: "remate-lb",
    nome: "Remate L B",
    tipo: "remate",
    quantidade: 1,
    dimensoes: { largura: 100, altura: 50, profundidade: 19 },
    espessura: 19,
    material: "mdf_branco",
    boxId: "box-1",
    precoUnitario: 0,
    precoTotal: 0,
    metadata: { industrialLabel: "ANTONIO_NOVO_5_CC4_REMATE_L_B_01" },
    pieceNumber: 6,
  };

  it("QR inclui nome industrial completo + número da etiqueta", () => {
    const qr = resolveUnifiedEtiquetaQrCode(item, ctx, new Map(), 0);
    expect(qr).toBe("ANTONIO_NOVO_5_CC4_REMATE_L_B_01-6");
  });

  it("displayCode deriva do nome industrial completo, não do projecto", () => {
    const piecesPerSheet = new Map([["box-1::Remate L B", 4]]);
    const display = resolveEtiquetaDisplayCodeV5(item, ctx, piecesPerSheet, 0);
    expect(display).toBe("ANTONIO_NOVO_5_CC4_REMATE_L_B_01-6");
    expect(display).toBe(resolveUnifiedEtiquetaQrCode(item, ctx, piecesPerSheet, 0));
    expect(display).not.toMatch(/^AN\d+-6$/);
  });

  it("displayCode distingue peças pelo industrialRef (NP2624619)", () => {
    const fornoCtx = {
      projectName: "NP2624619",
      boxes: [
        {
          ...boxes[0],
          id: "forno-1",
          nome: "Caixa Forno",
        },
      ],
      rules: defaultRulesConfig,
    };
    const piecesPerSheet = new Map();

    const sep02: CutListItemComPreco = {
      id: "sep-02",
      nome: "SEP 02",
      tipo: "prateleira",
      quantidade: 1,
      dimensoes: { largura: 400, altura: 300, profundidade: 19 },
      espessura: 19,
      material: "mdf_branco",
      boxId: "forno-1",
      precoUnitario: 0,
      precoTotal: 0,
      metadata: { industrialLabel: "NP2624619_Caixa_Forno_SEP_02" },
      pieceNumber: 2,
    };
    const sep03: CutListItemComPreco = {
      ...sep02,
      id: "sep-03",
      nome: "SEP 03",
      metadata: { industrialLabel: "NP2624619_Caixa_Forno_SEP_03" },
      pieceNumber: 3,
    };
    const porta: CutListItemComPreco = {
      ...sep02,
      id: "porta-sup",
      nome: "porta superior",
      tipo: "porta_simples",
      metadata: { industrialLabel: "NP2624619_Caixa_Forno_porta_superior" },
      pieceNumber: 5,
    };

    expect(resolveEtiquetaDisplayCodeV5(sep02, fornoCtx, piecesPerSheet, 0)).toBe(
      "NP2624619_CAIXA_FORNO_SEP_02-2"
    );
    expect(resolveEtiquetaDisplayCodeV5(sep03, fornoCtx, piecesPerSheet, 1)).toBe(
      "NP2624619_CAIXA_FORNO_SEP_03-3"
    );
    expect(resolveEtiquetaDisplayCodeV5(porta, fornoCtx, piecesPerSheet, 2)).toBe(
      "NP2624619_CAIXA_FORNO_PORTA_SUPERIOR-5"
    );
  });

  it("peça com attachQrCodes — QR ≠ shortCode", () => {
    const [withQr] = attachQrCodesToCutlist(
      [
        {
          ...item,
          metadata: undefined,
          nome: "Lateral esquerda",
          tipo: "lateral_esquerda",
        },
      ],
      ctx
    );
    const qr = resolveUnifiedEtiquetaQrCode(withQr!, ctx, new Map(), 0);
    expect(qr).toContain("-");
    expect(qr).not.toBe(withQr!.shortCode);
  });
});
