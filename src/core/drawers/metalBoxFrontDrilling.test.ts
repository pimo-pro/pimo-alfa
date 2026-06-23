import { describe, expect, it } from "vitest";
import { buildPanelDrillingResult } from "../../modules/drilling/drillingAdapter";
import { defaultRulesConfig } from "../rules/rulesConfig";
import { buildDrillFilesForProject } from "../drill/drillExport";
import { drawerGroupToLayerItems, generateDrawerGroup } from "./index";
import { settingsDefaults } from "../settings/settingsSchema";
import { drawerLayerItemToCutList } from "../../services/drawerCutlistAdapter";
import { computeDrawerMetalBoxFrontHoles } from "./drilling/DrawerMetalBoxFrontDrilling";

function metalDrawerLayer(
  metalBoxType: "Blum Legrabox" | "Hettich ArciTech",
  heightMm: number,
  depthMm: number
) {
  const settings = {
    ...settingsDefaults.gavetas,
    gavetaTipoCaixaMetalica: metalBoxType,
    gavetaAlturaCaixaMetalicaMm: heightMm,
  };
  const group = generateDrawerGroup({
    boxWidth: 600,
    boxHeight: 400,
    boxDepth: depthMm + 40,
    boxThickness: 19,
    boxId: `metal-${metalBoxType}`,
    drawerCount: 1,
    drawerType: "normal",
    heightMode: "equal",
    availableDepths: settings.gavetaProfundidadesDisponiveisMm,
    drawerSettings: settings,
    drawerOverrides: [
      {
        metalBoxType,
        metalBoxHeightMm: heightMm,
        nominalDepthMm: depthMm,
      },
    ],
  });
  const [layer] = drawerGroupToLayerItems(group);
  layer.metadata = {
    ...layer.metadata,
    metalBoxHeightMm: heightMm,
    nominalDepth: depthMm,
  };
  return layer;
}

describe("computeDrawerMetalBoxFrontHoles", () => {
  const base = {
    tipo: "gaveta_frente_int" as const,
    largura: 562,
    altura: 198,
    espessura: 19,
  };

  it("gera 2 furos fixacao_metalica em x=37 e x=L-37", () => {
    const holes = computeDrawerMetalBoxFrontHoles({
      ...base,
      metalBoxType: "Blum Legrabox",
      metalBoxHeightMm: 128,
    });
    expect(holes).toHaveLength(2);
    expect(holes.every((h) => h.tipo === "fixacao_metalica" && h.face === "tras")).toBe(true);
    expect(holes[0].x).toBeCloseTo(37, 0);
    expect(holes[1].x).toBeCloseTo(525, 0);
    expect(holes[0].diametro).toBe(5);
  });

  it("não gera furos estruturais de madeira quando metal activo", () => {
    const result = buildPanelDrillingResult(
      {
        tipo: "gaveta_frente_int",
        larguraMm: 562,
        alturaMm: 198,
        espessuraMm: 19,
        metalBoxType: "Hettich ArciTech",
        metalBoxHeightMm: 128,
      },
      defaultRulesConfig
    );
    const holes = result.data?.drillHoles ?? [];
    const structural = holes.filter((h) => h.holeType === "fixacao_estrutural");
    const metal = holes.filter((h) => h.holeType === "fixacao_metalica");
    expect(structural).toHaveLength(0);
    expect(metal).toHaveLength(2);
    expect(metal.every((h) => h.topDrillable === true)).toBe(true);
  });
});

describe("metal box cutlist + XML", () => {
  it("Blum Legrabox — só frente + BOM metálico", () => {
    const layer = metalDrawerLayer("Blum Legrabox", 128, 500);
    const cutlist = drawerLayerItemToCutList(layer, 0, "mdf_branco", "Modulo_A");
    expect(cutlist.map((p) => p.tipo)).toEqual(["gaveta_frente_int", "gaveta_frente_ext"]);
    const frontInt = cutlist.find((p) => p.tipo === "gaveta_frente_int")!;
    const hw = frontInt.metadata?.drawerHardware as Array<{ tipo: string; nome: string }>;
    expect(hw.some((h) => h.tipo === "caixa_metalica" && h.nome === "Blum Legrabox")).toBe(true);
    expect(hw.some((h) => h.tipo === "corredica")).toBe(true);

    const rules = frontInt.metadata?.drawerRules as Record<string, unknown>;
    const drilled = buildPanelDrillingResult(
      {
        tipo: "gaveta_frente_int",
        larguraMm: frontInt.dimensoes.largura,
        alturaMm: frontInt.dimensoes.altura,
        espessuraMm: frontInt.espessura,
        metalBoxType: rules.metalBoxType as string,
        metalBoxProfileId: rules.metalBoxProfileId as string,
        metalBoxHeightMm: rules.metalBoxHeightMm as number,
      },
      defaultRulesConfig
    );
    const holes = drilled.data?.drillHoles ?? [];
    const metalHoles = holes.filter((h) => h.holeType === "fixacao_metalica");
    expect(metalHoles).toHaveLength(2);

    const files = buildDrillFilesForProject(
      [{ ...frontInt, drillHoles: holes, preco: 0, precoTotal: 0 }],
      { projectName: "legrabox", boxes: [], workspaceBoxes: [] } as never
    );
    const xml = files[0]?.xml ?? "";
    expect(xml).toContain("TypeNo>1</TypeNo>");
    expect(xml).toContain("Diameter>5.00</Diameter>");
    expect(xml.match(/TypeNo>1<\/TypeNo>/g)?.length).toBe(2);
  });

  it("Hettich ArciTech — profundidade e altura do catálogo", () => {
    const layer = metalDrawerLayer("Hettich ArciTech", 128, 450);
    expect(layer.metadata?.metalBoxProfileId).toBe("hettich_arcitech");
    expect(layer.bodyHeight).toBe(128);
    expect(layer.leftSideWidth).toBe(0);

    const cutlist = drawerLayerItemToCutList(layer, 0, "mdf_branco", "Modulo_B");
    const frontInt = cutlist.find((p) => p.tipo === "gaveta_frente_int")!;
    const rules = frontInt.metadata?.drawerRules as Record<string, unknown>;
    expect(rules.metalBoxType).toBe("Hettich ArciTech");
    expect(rules.metalBoxHeightMm).toBe(128);

    const drilled = buildPanelDrillingResult(
      {
        tipo: "gaveta_frente_int",
        larguraMm: frontInt.dimensoes.largura,
        alturaMm: frontInt.dimensoes.altura,
        espessuraMm: frontInt.espessura,
        metalBoxType: "Hettich ArciTech",
        metalBoxHeightMm: 128,
      },
      defaultRulesConfig
    );
    const xml = buildDrillFilesForProject(
      [{ ...frontInt, drillHoles: drilled.data?.drillHoles ?? [], preco: 0, precoTotal: 0 }],
      { projectName: "arcitech", boxes: [], workspaceBoxes: [] } as never
    )[0]?.xml;
    expect(xml).toContain("Vertical Hole");
    expect(xml).not.toContain("fixacao_estrutural");
  });
});
