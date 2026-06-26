import { describe, expect, it } from "vitest";
import { buildDrawerSpecs } from "../3d/objects/DrawerFactory";
import { calculateDrawerSpecs, generateDrawerGroup, drawerGroupToLayerItems } from "../core/drawers";
import { defaultRulesConfig } from "../core/rules/rulesConfig";
import { settingsDefaults } from "../core/settings/settingsSchema";
import { buildPanelDrillingResult } from "../modules/drilling/drillingAdapter";
import { extractDrawerCutlistFromLayerItems } from "../services/drawerCutlistAdapter";

describe("Sistema europeu de gavetas", () => {
  const drawerSettings = settingsDefaults.gavetas;

  it("calcula dimensoes europeias a partir de settings.gavetas", () => {
    const specs = calculateDrawerSpecs(
      {
        boxInternalWidth: 562,
        boxInternalHeight: 720,
        boxInternalDepth: 560,
        boxThickness: 19,
        drawerHeight: 200,
        totalDrawers: 3,
        type: "normal",
      },
      drawerSettings.gavetaProfundidadesDisponiveisMm,
      drawerSettings
    );

    expect(specs.front.width).toBe(598);
    expect(specs.front.height).toBe(200);
    expect(specs.front.thickness).toBe(19);
    expect(specs.body.width).toBe(548);
    expect(specs.body.depth).toBe(550);
    expect(specs.body.height).toBe(150);
    expect(specs.leftSide.width).toBe(16);
    expect(specs.rightSide.width).toBe(16);
    expect(specs.back.thickness).toBe(16);
    expect(specs.bottom.thickness).toBe(10);
    expect(specs.positioning.pullDistance).toBe(550);
  });

  it("gera frente externa overlay e abertura limitada", () => {
    const group = generateDrawerGroup({
      boxWidth: 600,
      boxHeight: 600,
      boxDepth: 560,
      boxThickness: 19,
      boxId: "box-gaveta",
      drawerCount: 1,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: drawerSettings.gavetaProfundidadesDisponiveisMm,
      drawerSettings,
    });
    const [layer] = drawerGroupToLayerItems(group);

    expect(layer.posZ).toBe(560 / 2 - 19 / 2);
    expect(layer.frontPosZ).toBe(0);
    expect(layer.pullDistanceMm).toBe(layer.bodyDepth);

    const [spec] = buildDrawerSpecs([layer]);
    expect(spec.z).toBeCloseTo((560 / 2 - 19 / 2) / 1000);
    expect(spec.pullDistanceM).toBeCloseTo((layer.bodyDepth ?? 0) / 1000);

    expect(spec.frontPosZ).toBe(0);
  });

  it("gera cutlist completa com pecas internas europeias", () => {
    const group = generateDrawerGroup({
      boxWidth: 600,
      boxHeight: 600,
      boxDepth: 560,
      boxThickness: 19,
      boxId: "box-cutlist",
      drawerCount: 1,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: drawerSettings.gavetaProfundidadesDisponiveisMm,
      drawerSettings,
    });
    const [layer] = drawerGroupToLayerItems(group);
    const cutlist = extractDrawerCutlistFromLayerItems([layer], "MDF");
    const tipos = cutlist.map((item) => item.tipo);

    expect(tipos).toEqual([
      "gaveta_frente_ext",
      "gaveta_lat_esq",
      "gaveta_lat_dir",
      "gaveta_fundo",
      "gaveta_traseira",
    ]);
    expect(cutlist.find((item) => item.tipo === "gaveta_lat_esq")?.espessura).toBe(16);
    expect(cutlist.find((item) => item.tipo === "gaveta_lat_esq")?.materialId).toBe("mdf_branco-16");
    expect(cutlist.find((item) => item.tipo === "gaveta_fundo")?.espessura).toBe(10);
    expect(cutlist.find((item) => item.tipo === "gaveta_traseira")?.espessura).toBe(16);
    expect(cutlist.find((item) => item.tipo === "gaveta_traseira")?.materialId).toBe("mdf_branco-16");
  });

  it("aplica furacao europeia de corredicas a 41 mm do fundo (3 furos por lateral)", () => {
    const result = buildPanelDrillingResult(
      {
        tipo: "gaveta_lat_esq",
        larguraMm: 530,
        alturaMm: 200,
        espessuraMm: 16,
      },
      defaultRulesConfig
    );

    expect(result.success).toBe(true);
    const holes = result.data?.drillHoles.filter((hole) => hole.holeType === "corredica") ?? [];
    expect(holes).toHaveLength(3);
    expect(holes.map((hole) => hole.x)).toEqual([38, 69, 492]);
    expect(holes.every((hole) => hole.y === 159)).toBe(true);
    expect(holes.every((hole) => hole.depth === 1)).toBe(true);
    expect(holes.every((hole) => hole.face === "B")).toBe(true);
  });

  it("aplica furacao de montagem na lateral (rasgo do fundo)", () => {
    const result = buildPanelDrillingResult(
      {
        tipo: "gaveta_lat_esq",
        larguraMm: 530,
        alturaMm: 185,
        espessuraMm: 16,
      },
      defaultRulesConfig
    );

    expect(result.success).toBe(true);
    const groove = result.data?.drillHoles.filter((hole) => hole.holeSubtype === "groove") ?? [];
    expect(groove).toHaveLength(1);
    expect(groove[0].grooveWidth).toBe(13);
  });
});
