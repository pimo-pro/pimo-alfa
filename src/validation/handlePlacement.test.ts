import { describe, expect, it } from "vitest";
import { buildPanelDrillingResult } from "../modules/drilling/drillingAdapter";
import { defaultRulesConfig } from "../core/rules/rulesConfig";
import { drawerGroupToLayerItems, generateDrawerGroup } from "../core/drawers";
import { settingsDefaults } from "../core/settings/settingsSchema";
import { resolveHandlePlacementX, resolveHandlePlacementY } from "../core/drawers/handlePlacement";
import { buildDrillFilesForProject } from "../core/drill/drillExport";
import { drawerLayerItemToCutList } from "../services/drawerCutlistAdapter";

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

  it("resolveHandlePlacement — posição percentual e offsets", () => {
    const y = resolveHandlePlacementY({
      larguraMm: 600,
      alturaMm: 200,
      handlePosition: "Percentual",
      handlePositionPercent: 25,
      handleOffsetYMm: 5,
    });
    expect(y).toBeCloseTo(55, 0);

    const x = resolveHandlePlacementX({
      larguraMm: 600,
      alturaMm: 200,
      handleOffsetXMm: 20,
    });
    expect(x).toBeCloseTo(320, 0);
  });

  it("gera furação de puxador com holeType puxador (CC 96)", () => {
    const result = buildPanelDrillingResult(
      {
        tipo: "gaveta_frente_ext",
        larguraMm: 560,
        alturaMm: 198,
        espessuraMm: 19,
        handleType: "Puxador",
        handleCenterDistanceMm: 96,
        handlePosition: "Centro",
        handleOffsetMm: 0,
      },
      defaultRulesConfig
    );

    expect(result.success).toBe(true);
    const handleHoles = result.data?.drillHoles.filter((hole) => hole.holeType === "puxador") ?? [];
    expect(handleHoles).toHaveLength(2);
    expect(handleHoles.every((hole) => hole.face === "B")).toBe(true);
    expect(handleHoles[1].x - handleHoles[0].x).toBeCloseTo(96, 0);
  });

  it("gera rasgo para cava (separado da estrutural)", () => {
    const result = buildPanelDrillingResult(
      {
        tipo: "gaveta_frente_ext",
        larguraMm: 560,
        alturaMm: 198,
        espessuraMm: 19,
        handleType: "Cava",
        handleProfileId: "cava_horizontal",
      },
      defaultRulesConfig
    );

    expect(result.success).toBe(true);
    const structural = result.data?.drillHoles.filter((h) => h.holeType === "fixacao_estrutural") ?? [];
    const groove = result.data?.drillHoles.filter((h) => h.holeSubtype === "groove") ?? [];
    expect(structural.length).toBe(0);
    expect(groove).toHaveLength(1);
    expect(groove[0].holeType).toBe("puxador");
  });

  it("cutlist + XML incluem furação de puxador avançado", () => {
    const group = generateDrawerGroup({
      boxWidth: 600,
      boxHeight: 400,
      boxDepth: 560,
      boxThickness: 19,
      boxId: "xml-handle",
      drawerCount: 1,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm,
      drawerSettings: settingsDefaults.gavetas,
      drawerOverrides: [{ drawerType: "normal" }],
    });
    const [layer] = drawerGroupToLayerItems(group);
    layer.handleType = "Puxador";
    layer.handlePosition = "Centro";
    layer.metadata = {
      handleCenterDistanceMm: 128,
      handleProfileId: "puxador_cc128",
      handleOffsetXMm: 10,
      handleOffsetYMm: 0,
    };

    const cutlist = drawerLayerItemToCutList(layer, 0, "mdf_branco", "Modulo_A");
    const front = cutlist.find((p) => p.tipo === "gaveta_frente_ext");
    expect(front).toBeTruthy();
    expect(front?.metadata?.drawerRules).toMatchObject({
      handleType: "Puxador",
      handleCenterDistanceMm: 128,
    });

    const rules = front!.metadata?.drawerRules as Record<string, unknown>;
    const drilled = buildPanelDrillingResult(
      {
        tipo: front!.tipo,
        larguraMm: front!.dimensoes.largura,
        alturaMm: front!.dimensoes.altura,
        espessuraMm: front!.espessura,
        handleType: rules.handleType as string,
        handleProfileId: rules.handleProfileId as string,
        handleCenterDistanceMm: rules.handleCenterDistanceMm as number,
        handlePosition: rules.handlePosition as "Centro",
        handleOffsetXMm: rules.handleOffsetXMm as number,
        handleOffsetYMm: rules.handleOffsetYMm as number,
      },
      defaultRulesConfig
    );
    const holes = drilled.data?.drillHoles ?? [];
    const puxadorHoles = holes.filter((h) => h.holeType === "puxador");
    expect(puxadorHoles.length).toBe(2);

    const files = buildDrillFilesForProject(
      [
        {
          ...front!,
          drillHoles: holes,
          preco: 0,
          precoTotal: 0,
        },
      ],
      { projectName: "test", boxes: [], workspaceBoxes: [] } as never
    );
    const xml = files.find((f) => f.filenameBase.includes("frente") || f.partName.includes("Frente"))?.xml ?? files[0]?.xml;
    expect(xml).toContain("TypeNo>1</TypeNo>");
    expect(xml).toContain("Diameter>5.00</Diameter>");
    expect(puxadorHoles.every((h) => h.holeType === "puxador")).toBe(true);
  });
});
