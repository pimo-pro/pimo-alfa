import { describe, it, expect } from "vitest";
import { cutlistComPrecoFromBox } from "../core/manufacturing/cutlistFromBoxes";
import { defaultRulesConfig, getHingeYPositions, getNumDobradicas } from "../core/rules/rulesConfig";
import type { BoxModule } from "../core/types";
import { buildPanelDrillingResult } from "../modules/drilling/drillingAdapter";

describe("Door drilling — porta não pode perder furos de dobradiça", () => {
  it("cutlistFromBoxes mantém holeType=dobradica na porta", () => {
    const box = {
      id: "box-door-1",
      nome: "Caixa com porta",
      dimensoes: { largura: 600, altura: 2000, profundidade: 300 },
      espessura: 19,
      tipoBorda: "reta",
      tipoFundo: "integrado",
      models: [],
      prateleiras: 0,
      portaTipo: "porta_simples",
      gavetas: 0,
      alturaGaveta: 0,
      doorsLayer: [{ hingeSide: "left" }],
      drawersLayer: [],
      cutList: [],
      cutListComPreco: [],
      ferragens: [],
      precoTotalPecas: 0,
      estrutura3D: null,
    } as unknown as BoxModule;

    const list = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const door = list.find((i) => i.tipo === "porta_simples");
    expect(door).toBeTruthy();
    const holes = door?.drillHoles ?? [];
    const hingeCups = holes.filter((h) => h.holeType === "dobradica");
    expect(hingeCups.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Viewer alignment — porta vs lateral (mesma altura visual)", () => {
  it("porta e lateral têm os mesmos Y finais no Viewer para parafuso união vs caneco", () => {
    const box = {
      id: "box-door-align-1",
      nome: "Caixa com porta",
      dimensoes: { largura: 600, altura: 2000, profundidade: 300 },
      espessura: 19,
      tipoBorda: "reta",
      tipoFundo: "integrado",
      models: [],
      prateleiras: 0,
      portaTipo: "porta_simples",
      gavetas: 0,
      alturaGaveta: 0,
      doorsLayer: [{ hingeSide: "left" }],
      drawersLayer: [],
      cutList: [],
      cutListComPreco: [],
      ferragens: [],
      precoTotalPecas: 0,
      estrutura3D: null,
    } as unknown as BoxModule;

    const list = cutlistComPrecoFromBox(box, defaultRulesConfig);
    const door = list.find((i) => i.tipo === "porta_simples");
    const lat = list.find((i) => i.tipo === "lateral_esquerda");
    expect(door).toBeTruthy();
    expect(lat).toBeTruthy();
    const doorHeightMm = door?.dimensoes?.altura ?? 0;
    const latHeightMm = lat?.dimensoes?.altura ?? 0;
    expect(doorHeightMm).toBeGreaterThan(0);
    expect(latHeightMm).toBeGreaterThan(0);

    // Comparar em um eixo global do vão: no Viewer, door leaf é deslocada dentro do vão por uma folga.
    // Aproximação (simétrica): topGap = (alturaLateral - alturaPorta) / 2 (pode ser negativo em overlay).
    const openingHeightMm = latHeightMm;
    const topGapMm = (openingHeightMm - doorHeightMm) / 2;
    const doorHingeYsGlobal = (door?.drillHoles ?? [])
      .filter((h) => h.holeType === "dobradica")
      .map((h) => Math.round((h.y + topGapMm) * 1000) / 1000)
      .sort((a, b) => a - b);
    const latUniaoYsGlobal = (lat?.drillHoles ?? [])
      .filter((h) => h.holeType === "dobradica_parafuso_uniao")
      .map((h) => Math.round(h.y * 1000) / 1000)
      .sort((a, b) => a - b);
    expect(doorHingeYsGlobal.length).toBeGreaterThanOrEqual(2);
    expect(latUniaoYsGlobal.length).toBe(doorHingeYsGlobal.length);
    expect(latUniaoYsGlobal).toEqual(doorHingeYsGlobal);
  });
});

describe("Viewer alignment — vão 1000, porta 998, folgas 1/1", () => {
  it("doorHingeYs === lateralHingeYs mesmo com alturas diferentes", () => {
    const rules = defaultRulesConfig;
    const openingHeightMm = 1000;
    const doorHeightMm = 998;
    const bottomGapMm = 1;
    const topGapMm = 1;
    const doorWidthMm = 600;
    const espessuraMm = 19;
    const globalOffsets = getHingeYPositions(openingHeightMm, getNumDobradicas(openingHeightMm, rules), rules);

    const door = buildPanelDrillingResult(
      {
        tipo: "porta_simples",
        larguraMm: doorWidthMm,
        alturaMm: doorHeightMm,
        espessuraMm,
        hingeSide: "left",
        openingHeightMm,
        bottomGapMm,
        topGapMm,
        hingePositionsMm: globalOffsets,
      },
      rules
    );
    expect(door.success).toBe(true);
    const doorYs = (door.data?.drillHoles ?? [])
      .filter((h) => h.holeType === "dobradica")
      .map((h) => h.y)
      .sort((a, b) => a - b);
    expect(doorYs.length).toBeGreaterThanOrEqual(2);

    const lateral = buildPanelDrillingResult(
      {
        tipo: "lateral_esquerda",
        larguraMm: 300,
        alturaMm: openingHeightMm,
        espessuraMm,
        hingeSide: "left",
        openingHeightMm,
        hingePositionsMm: globalOffsets,
        portaTipo: "porta_simples",
        doorsLayerCount: 1,
      },
      rules
    );
    expect(lateral.success).toBe(true);
    const latYs = (lateral.data?.drillHoles ?? [])
      .filter((h) => h.holeType === "dobradica_parafuso_uniao")
      .map((h) => h.y)
      .sort((a, b) => a - b);

    const doorYsGlobal = doorYs.map((y) => y + topGapMm).sort((a, b) => a - b);
    expect(latYs).toEqual(doorYsGlobal);
  });
});

