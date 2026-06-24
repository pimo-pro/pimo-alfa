import { describe, expect, it } from "vitest";
import { defaultRulesConfig } from "../rules/rulesConfig";
import type { BoxModule, CutListItemComPreco } from "../types";
import { attachQrCodesToCutlist } from "../qrcode/qrcodeService";
import { resolveIndustrialListNqr, buildIndustrialListPiecesPerSheet } from "../pdf/industrialListQr";
import {
  buildDrillFilesForProject,
  buildDrillXmlFallbackFileName,
  panelFileNameFromPiece,
  pieceHasEtiquetaQr,
} from "./drillExport";

function lateralItem(overrides: Partial<CutListItemComPreco> = {}): CutListItemComPreco {
  return {
    id: "lat-esq",
    nome: "Lateral esquerda",
    tipo: "lateral_esquerda",
    quantidade: 1,
    dimensoes: { largura: 560, altura: 720, profundidade: 19 },
    espessura: 19,
    material: "mdf_branco",
    boxId: "box-1",
    precoUnitario: 0,
    precoTotal: 0,
    ...overrides,
  };
}

describe("drillExport — nomes XML alinhados ao sistema de etiquetas", () => {
  const boxes: BoxModule[] = [
    {
      id: "box-1",
      nome: "CC1",
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

  const project = {
    projectName: "ANTONIO_NOVO_5",
    boxes,
    rules: defaultRulesConfig,
  };

  it("com etiqueta — usa QR v5 (N.º QR), não shortCode legacy compacto", () => {
    const raw = [lateralItem()];
    const items = attachQrCodesToCutlist(raw, project);
    const item = items[0]!;
    const piecesPerSheet = new Map<string, number>();

    expect(pieceHasEtiquetaQr(item)).toBe(true);
    expect(item.shortCode).toBeTruthy();

    const filename = panelFileNameFromPiece(item, project, piecesPerSheet, 0);
    const nQr = resolveIndustrialListNqr(item, project, piecesPerSheet, 0);

    expect(filename).toBe(nQr);
    expect(filename).not.toBe(item.shortCode);
    expect(filename).toMatch(/^[A-Z0-9_]+-\d+$/);
    expect(filename).toContain("_");
  });

  it("com metadata.qrCode — usa exactamente esse valor", () => {
    const item = lateralItem({
      metadata: { qrCode: "C1_LAT_DIR_03" },
      pieceNumber: 3,
    });
    const filename = panelFileNameFromPiece(item, project, new Map(), 0);
    expect(filename).toBe("C1_LAT_DIR_03");
  });

  it("sem etiqueta — nome completo PROJETO_CAIXA_PECA", () => {
    const item = lateralItem({ pieceNumber: undefined, shortCode: undefined });
    expect(pieceHasEtiquetaQr(item)).toBe(false);
    expect(buildDrillXmlFallbackFileName(item, project)).toBe("ANTONIO_NOVO_5_CC1_C1_LAT_ESQ");
    expect(panelFileNameFromPiece(item, project, new Map(), 0)).toBe("ANTONIO_NOVO_5_CC1_C1_LAT_ESQ");
  });

  it("buildDrillFilesForProject — filenameBase alinhado ao QR v5", () => {
    const items = attachQrCodesToCutlist([lateralItem()], project);
    const piecesPerSheet = buildIndustrialListPiecesPerSheet(items);
    const files = buildDrillFilesForProject(items, project);
    expect(files).toHaveLength(1);
    expect(files[0]?.filenameBase).toBe(
      resolveIndustrialListNqr(items[0]!, project, piecesPerSheet, 0)
    );
  });
});
