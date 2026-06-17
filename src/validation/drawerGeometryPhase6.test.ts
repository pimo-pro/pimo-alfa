import { describe, expect, it } from "vitest";
import { calculateDrawerSpecs, generateDrawerGroup, drawerGroupToLayerItems } from "../core/drawers";
import { gerarGavetas, gerarPaineis } from "../core/manufacturing/boxManufacturing";
import { settingsDefaults } from "../core/settings/settingsSchema";
import { defaultRulesConfig } from "../core/rules/rulesConfig";
import type { BoxModule } from "../core/types";

describe("FASE 6 — geometria industrial + overrides UI", () => {
  const drawerSettings = settingsDefaults.gavetas;

  const baseDims = {
    boxInternalWidth: 562,
    boxInternalHeight: 720,
    boxInternalDepth: 560,
    boxThickness: 19,
    drawerHeight: 200,
    totalDrawers: 3,
    type: "normal" as const,
  };

  it("usa gavetaRecuoProfundidadeCorredicaMm de settings no bodyDepth", () => {
    const specs = calculateDrawerSpecs(
      baseDims,
      drawerSettings.gavetaProfundidadesDisponiveisMm,
      { ...drawerSettings, gavetaRecuoProfundidadeCorredicaMm: 25 }
    );

    expect(specs.nominalDepthMm).toBe(550);
    expect(specs.runnerClearanceMm).toBe(25);
    expect(specs.body.depth).toBe(525);
  });

  it("aplica metadata.nominalDepth como override de profundidade", () => {
    const specs = calculateDrawerSpecs(
      baseDims,
      drawerSettings.gavetaProfundidadesDisponiveisMm,
      drawerSettings,
      { nominalDepthMm: 400 }
    );

    expect(specs.nominalDepthMm).toBe(400);
    expect(specs.body.depth).toBe(380);
  });

  it("aplica overrides UI de slideType, metalBox e softClose", () => {
    const specs = calculateDrawerSpecs(
      baseDims,
      drawerSettings.gavetaProfundidadesDisponiveisMm,
      drawerSettings,
      {
        slideType: "Blum Movento",
        metalBoxType: "Blum Metabox",
        softClose: true,
        drawerType: "pro",
      }
    );

    expect(specs.slide.type).toBe("Blum Movento");
    expect(specs.slide.softClose).toBe(true);
    expect(specs.metalBox.type).toBe("Blum Metabox");
    expect(specs.metalBox.enabled).toBe(true);
  });

  it("propaga overrides via generateDrawerGroup.drawerOverrides", () => {
    const group = generateDrawerGroup({
      boxWidth: 600,
      boxHeight: 600,
      boxDepth: 560,
      boxThickness: 19,
      boxId: "box-phase6",
      drawerCount: 1,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: drawerSettings.gavetaProfundidadesDisponiveisMm,
      drawerSettings,
      drawerOverrides: [{ nominalDepthMm: 450, slideType: "Hettich InnoTech" }],
    });

    const [layer] = drawerGroupToLayerItems(group);
    expect(layer.bodyDepth).toBe(430);
    expect(layer.slideType).toBe("Hettich InnoTech");
    expect(layer.metadata?.nominalDepth).toBe(450);
  });

  it("gerarGavetas legado retorna vazio para caixas não-PI", () => {
    const box = {
      id: "box-legacy",
      nome: "Teste",
      gavetas: 3,
      dimensoes: { largura: 600, altura: 720, profundidade: 560 },
      espessura: 19,
      portaTipo: "sem_porta",
      prateleiras: 0,
      drawersLayer: [{ id: "d1" }],
    } as unknown as BoxModule;

    expect(gerarGavetas(box, defaultRulesConfig)).toEqual([]);
  });

  it("gerarPaineis não gera gaveta_frente legado", () => {
    const box = {
      id: "box-paineis",
      nome: "Teste",
      gavetas: 2,
      alturaGaveta: 150,
      dimensoes: { largura: 600, altura: 720, profundidade: 560 },
      espessura: 19,
      portaTipo: "sem_porta",
      prateleiras: 0,
    } as unknown as BoxModule;

    const paineis = gerarPaineis(box, defaultRulesConfig);
    expect(paineis.some((p) => p.tipo === "gaveta_frente")).toBe(false);
  });
});
