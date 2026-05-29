import { describe, expect, it } from "vitest";
import { buildPanelDrillingResult } from "../modules/drilling/drillingAdapter";
import { defaultRulesConfig } from "../core/rules/rulesConfig";
import { drawerGroupToLayerItems, generateDrawerGroup } from "../core/drawers";
import { settingsDefaults } from "../core/settings/settingsSchema";

describe("Drawer Rules — handles", () => {
  it("propaga tipo, posição e offset do handle para a layer", () => {
    const group = generateDrawerGroup({
      boxWidth: 600,
      boxHeight: 300,
      boxDepth: 560,
      boxThickness: 19,
      boxId: "handle-box",
      drawerCount: 1,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm,
      drawerSettings: {
        ...settingsDefaults.gavetas,
        gavetaTipoHandle: "Puxador",
        gavetaPosicaoHandle: "Topo",
        gavetaOffsetHandleMm: 8,
      },
    });
    const [layer] = drawerGroupToLayerItems(group);

    expect(layer.handleType).toBe("Puxador");
    expect(layer.handlePosition).toBe("Topo");
    expect(layer.handleOffsetMm).toBe(8);
  });

  it("gera furação de puxador apenas quando handleType é Puxador", () => {
    const result = buildPanelDrillingResult(
      {
        tipo: "gaveta_frente",
        larguraMm: 560,
        alturaMm: 198,
        espessuraMm: 19,
        handleType: "Puxador",
        handlePosition: "Centro",
        handleOffsetMm: 0,
      },
      defaultRulesConfig
    );

    expect(result.success).toBe(true);
    const handleHoles = result.data?.drillHoles.filter((hole) => hole.holeType === "parafuso" && hole.x >= 240 && hole.x <= 320) ?? [];
    expect(handleHoles).toHaveLength(2);
    expect(handleHoles.every((hole) => hole.face === "B")).toBe(true);
  });

  it("não gera furação de handle para cava", () => {
    const result = buildPanelDrillingResult(
      {
        tipo: "gaveta_frente",
        larguraMm: 560,
        alturaMm: 198,
        espessuraMm: 19,
        handleType: "Cava",
      },
      defaultRulesConfig
    );

    expect(result.success).toBe(true);
    const handleHoles = result.data?.drillHoles.filter((hole) => hole.holeType === "parafuso" && hole.x >= 240 && hole.x <= 320) ?? [];
    expect(handleHoles).toHaveLength(0);
  });
});
