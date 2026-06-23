/**
 * Fase 7 — Testes industriais finais.
 * Referência: docs/matriz-faces-A-B-FINAL.md
 * Valida: getInternalFace, drillFaceToPanelFace, isTopDrillable, furação por tipo,
 * DRILL (cavilha + topDrillable), Viewer (face B), cutlistFromBoxes.
 * Não altera TCN, topDrillable, exportações CNC nem lógica industrial.
 */

import { describe, it, expect } from "vitest";
import {
  getInternalFace,
  drillFaceToPanelFace,
  isTopDrillable,
  type PieceType,
} from "../core/drilling/drillingService";
import {
  buildPanelDrillingResult,
  buildViewerDrillMarkersByPanelResult,
} from "../modules/drilling/drillingAdapter";
import { defaultRulesConfig } from "../core/rules/rulesConfig";
import { cutlistComPrecoFromBox } from "../core/manufacturing/cutlistFromBoxes";
import type { BoxModule, CutListItem } from "../core/types";

// --- 1) Conversão A/B: getInternalFace para todos os PieceTypes (modelo FINAL) ---

const INTERNAL_FACE_MATRIX: Array<{ tipo: PieceType; esperado: string }> = [
  { tipo: "cima", esperado: "fundo" },
  { tipo: "fundo", esperado: "cima" },
  { tipo: "lateral_esquerda", esperado: "direita" },
  { tipo: "lateral_direita", esperado: "esquerda" },
  { tipo: "porta_simples", esperado: "tras" },
  { tipo: "porta_dupla", esperado: "tras" },
  { tipo: "porta_correr", esperado: "tras" },
  { tipo: "porta", esperado: "tras" },
  { tipo: "gaveta_frente_int", esperado: "tras" },
  { tipo: "gaveta_frente_ext", esperado: "frente" },
  { tipo: "gaveta_frente", esperado: "tras" },
  { tipo: "gaveta", esperado: "tras" },
  { tipo: "gaveta_lat_esq", esperado: "direita" },
  { tipo: "gaveta_lat_dir", esperado: "esquerda" },
  { tipo: "gaveta_fundo", esperado: "cima" },
  { tipo: "gaveta_traseira", esperado: "frente" },
  { tipo: "prateleira", esperado: "fundo" },
];

describe("Fase 7 — getInternalFace (modelo FINAL)", () => {
  INTERNAL_FACE_MATRIX.forEach(({ tipo, esperado }) => {
    it(`${tipo} → face interna ${esperado}`, () => {
      expect(getInternalFace(tipo)).toBe(esperado);
    });
  });
});

// --- 2) drillFaceToPanelFace: face interna → B, demais → A ---

describe("Fase 7 — drillFaceToPanelFace (face interna = B)", () => {
  it("cima: fundo (interno) → B, cima → A", () => {
    expect(drillFaceToPanelFace("fundo", "cima")).toBe("B");
    expect(drillFaceToPanelFace("cima", "cima")).toBe("A");
  });
  it("fundo: cima (interno) → B, fundo → A", () => {
    expect(drillFaceToPanelFace("cima", "fundo")).toBe("B");
    expect(drillFaceToPanelFace("fundo", "fundo")).toBe("A");
  });
  it("lateral_esquerda: direita (interno) → B", () => {
    expect(drillFaceToPanelFace("direita", "lateral_esquerda")).toBe("B");
    expect(drillFaceToPanelFace("esquerda", "lateral_esquerda")).toBe("A");
  });
  it("lateral_direita: esquerda (interno) → B", () => {
    expect(drillFaceToPanelFace("esquerda", "lateral_direita")).toBe("B");
    expect(drillFaceToPanelFace("direita", "lateral_direita")).toBe("A");
  });
  it("porta: tras (interno) → B", () => {
    expect(drillFaceToPanelFace("tras", "porta_simples")).toBe("B");
    expect(drillFaceToPanelFace("frente", "porta_simples")).toBe("A");
  });
  it("gaveta_frente_int: tras → B", () => {
    expect(drillFaceToPanelFace("tras", "gaveta_frente_int")).toBe("B");
  });
  it("gaveta_frente_ext: frente (visível) → B", () => {
    expect(drillFaceToPanelFace("frente", "gaveta_frente_ext")).toBe("B");
  });
  it("gaveta_frente: tras → B", () => {
    expect(drillFaceToPanelFace("tras", "gaveta_frente")).toBe("B");
  });
  it("gaveta_fundo: cima → B", () => {
    expect(drillFaceToPanelFace("cima", "gaveta_fundo")).toBe("B");
  });
  it("gaveta_traseira: frente → B", () => {
    expect(drillFaceToPanelFace("frente", "gaveta_traseira")).toBe("B");
  });
  it("prateleira: fundo (face para baixo) → B", () => {
    expect(drillFaceToPanelFace("fundo", "prateleira")).toBe("B");
    expect(drillFaceToPanelFace("cima", "prateleira")).toBe("A");
  });
});

// --- 3) isTopDrillable: apenas cima e fundo ---

describe("Fase 7 — isTopDrillable (inalterado)", () => {
  it("cima e fundo são topDrillable", () => {
    expect(isTopDrillable("cima")).toBe(true);
    expect(isTopDrillable("fundo")).toBe(true);
  });
  it("demais faces não são topDrillable", () => {
    expect(isTopDrillable("frente")).toBe(false);
    expect(isTopDrillable("tras")).toBe(false);
    expect(isTopDrillable("esquerda")).toBe(false);
    expect(isTopDrillable("direita")).toBe(false);
  });
});

// --- 4) Furação por tipo: buildPanelDrillingResult retorna furos com face A ou B ---

describe("Fase 7 — Furação por tipo (buildPanelDrillingResult)", () => {
  const rules = defaultRulesConfig;
  const dim = { larguraMm: 600, alturaMm: 400, espessuraMm: 19 };

  const tipos: Array<string> = [
    "cima",
    "fundo",
    "lateral_esquerda",
    "lateral_direita",
    "prateleira",
    "porta_simples",
    "gaveta",
    "gaveta_frente_int",
    "gaveta_frente_ext",
    "gaveta_frente",
    "gaveta_lat_esq",
    "gaveta_lat_dir",
    "gaveta_fundo",
    "gaveta_traseira",
  ];

  tipos.forEach((tipo) => {
    it(`${tipo}: sucesso e furos com face A ou B`, () => {
      const result = buildPanelDrillingResult(
        { tipo, ...dim },
        rules
      );
      expect(result.success).toBe(true);
      const holes = result.data?.drillHoles ?? [];
      for (const h of holes) {
        expect(["A", "B"]).toContain(h.face);
        expect(typeof h.topDrillable).toBe("boolean");
      }
    });
  });
});

describe("Fase 7 — Regra de furos de prateleira por contexto do módulo", () => {
  const rules = defaultRulesConfig;
  const lateralInput = {
    tipo: "lateral_esquerda",
    larguraMm: 600,
    alturaMm: 800,
    espessuraMm: 19,
  };

  it("gera furos de prateleira quando há prateleiras e não há gavetas", () => {
    const result = buildPanelDrillingResult(
      {
        ...lateralInput,
        hasShelves: true,
        hasDrawers: false,
      },
      rules
    );
    expect(result.success).toBe(true);
    const holes = result.data?.drillHoles ?? [];
    expect(holes.some((h) => h.holeType === "prateleira")).toBe(true);
  });

  it("não gera furos de prateleira quando não há prateleiras", () => {
    const result = buildPanelDrillingResult(
      {
        ...lateralInput,
        hasShelves: false,
        hasDrawers: false,
      },
      rules
    );
    expect(result.success).toBe(true);
    const holes = result.data?.drillHoles ?? [];
    expect(holes.some((h) => h.holeType === "prateleira")).toBe(false);
  });

  it("não gera furos de prateleira quando há gavetas, mesmo com prateleiras", () => {
    const result = buildPanelDrillingResult(
      {
        ...lateralInput,
        hasShelves: true,
        hasDrawers: true,
      },
      rules
    );
    expect(result.success).toBe(true);
    const holes = result.data?.drillHoles ?? [];
    expect(holes.some((h) => h.holeType === "prateleira")).toBe(false);
  });
});

// --- 5) Viewer: overlay apenas face B (onlyInternalFaceHoles) ---

describe("Fase 7 — Viewer (overlay apenas face B)", () => {
  it("buildViewerDrillMarkersByPanelResult filtra furos face A (mostra só B)", () => {
    const cutList: CutListItem[] = [
      {
        id: "cima-1",
        nome: "Cima",
        tipo: "cima",
        quantidade: 1,
        dimensoes: { largura: 600, altura: 300, profundidade: 19 },
        espessura: 19,
        material: "MDF",
        drillHoles: [
          { x: 100, y: 60, diameter: 8, depth: 13, holeType: "cavilha" as const, face: "A", topDrillable: true },
          { x: 200, y: 60, diameter: 8, depth: 13, holeType: "cavilha" as const, face: "B", topDrillable: true },
        ],
      },
    ];
    const result = buildViewerDrillMarkersByPanelResult(cutList);
    expect(result.success).toBe(true);
    const cima = result.data?.cima ?? [];
    expect(cima.length).toBe(1);
  });
});

// --- 6) Cutlist: cutlistFromBoxes gera peças corretas (caixa mínima) ---

describe("Fase 7 — Cutlist (cutlistFromBoxes)", () => {
  it("caixa mínima gera cima, fundo, laterais, COSTA", () => {
    const box: BoxModule = {
      id: "box-1",
      nome: "Caixa 1",
      dimensoes: { largura: 600, altura: 400, profundidade: 300 },
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
    };
    const list = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const tipos = list.map((p) => p.tipo);
    expect(tipos).toContain("cima");
    expect(tipos).toContain("fundo");
    expect(tipos).toContain("lateral_esquerda");
    expect(tipos).toContain("lateral_direita");
    expect(tipos.some((t) => t === "COSTA" || t === "costa")).toBe(true);
    list.forEach((item) => {
      expect(item.drillHoles === undefined || Array.isArray(item.drillHoles)).toBe(true);
      if (item.drillHoles?.length) {
        item.drillHoles.forEach((h) => {
          const face = (h as { face?: string }).face;
          if (face != null) expect(["A", "B"]).toContain(face);
        });
      }
    });
  });

  it("caixa com prateleiras inclui tipo prateleira", () => {
    const box: BoxModule = {
      id: "box-2",
      nome: "Caixa 2",
      dimensoes: { largura: 600, altura: 400, profundidade: 300 },
      espessura: 19,
      tipoBorda: "reta",
      tipoFundo: "integrado",
      models: [],
      prateleiras: 2,
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
    };
    const list = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const prateleiras = list.filter((p) => p.tipo === "prateleira");
    expect(prateleiras.length).toBe(2);
  });
});
