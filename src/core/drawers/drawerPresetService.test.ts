import { describe, expect, it } from "vitest";
import {
  applyDrawerPresetToBox,
  drawerConfigFromLayerItem,
  extractDrawerPresetFromBox,
  mergeDrawerPresetDrawerConfigOntoLayer,
} from "./drawerPresetService";
import { regenerateLayersForBox } from "../../services/boxLayersService";
import { minimalBoxWithDrawers } from "../../validation/drawerCertificationTestHelpers";
import type { DrawerLayerItem } from "../../models/BoxLayers";
import { generateDrawerGroup, drawerGroupToLayerItems } from "./index";
import { settingsDefaults } from "../settings/settingsSchema";

const DRAWER_SETTINGS = settingsDefaults.gavetas;

function buildDrawerLayers(count: number): DrawerLayerItem[] {
  const group = generateDrawerGroup({
    boxWidth: 600,
    boxHeight: 720,
    boxDepth: 560,
    boxThickness: 19,
    boxId: "preset-test",
    drawerCount: count,
    drawerType: "normal",
    heightMode: "equal",
    availableDepths: DRAWER_SETTINGS.gavetaProfundidadesDisponiveisMm,
    drawerSettings: DRAWER_SETTINGS,
  });
  return drawerGroupToLayerItems(group);
}

describe("drawerPresetService", () => {
  it("drawerConfigFromLayerItem — captura metadata e ferragens", () => {
    const [layer] = buildDrawerLayers(1);
    layer.metadata = {
      frontHeightMm: 180,
      drawerGroupName: "GAV_INF",
      frontPieceName: "FRENTE_01",
    };
    layer.slideType = "telescopic";
    layer.softClose = true;
    layer.handleType = "Puxador";

    const config = drawerConfigFromLayerItem(layer);
    expect(config.metadata?.frontHeightMm).toBe(180);
    expect(config.metadata?.drawerGroupName).toBe("GAV_INF");
    expect(config.slideType).toBe("telescopic");
    expect(config.softClose).toBe(true);
    expect(config.handleType).toBe("Puxador");
  });

  it("mergeDrawerPresetDrawerConfigOntoLayer — aplica por índice e altura de frente", () => {
    const [layer] = buildDrawerLayers(1);
    const merged = mergeDrawerPresetDrawerConfigOntoLayer(layer, {
      metadata: { frontHeightMm: 210, drawerGroupName: "CUSTOM" },
      softClose: true,
      bodyHeight: 195,
    });
    expect(merged.metadata?.drawerGroupName).toBe("CUSTOM");
    expect(merged.metadata?.frontHeightMm).toBe(210);
    expect(merged.softClose).toBe(true);
    expect(merged.bodyHeight).toBe(195);
    expect(merged.height).toBe(210);
  });

  it("extractDrawerPresetFromBox — snapshot completo", () => {
    const layers = buildDrawerLayers(2);
    layers[0].metadata = { drawerGroupName: "A" };
    layers[1].metadata = { drawerGroupName: "B" };
    const box = minimalBoxWithDrawers(layers, {
      gavetas: 2,
      drawerHeightMode: "custom",
    });

    const preset = extractDrawerPresetFromBox(box, "Teste 2 gavetas");
    expect(preset).not.toBeNull();
    expect(preset!.drawerCount).toBe(2);
    expect(preset!.drawerHeightMode).toBe("custom");
    expect(preset!.drawers).toHaveLength(2);
    expect(preset!.drawers[0].metadata?.drawerGroupName).toBe("A");
    expect(preset!.drawers[1].metadata?.drawerGroupName).toBe("B");
  });

  it("applyDrawerPresetToBox — altera contagem, modo e preserva metadata por índice", () => {
    const sourceLayers = buildDrawerLayers(3);
    sourceLayers.forEach((layer, i) => {
      layer.metadata = { drawerGroupName: `GAV_${i + 1}` };
      layer.softClose = i % 2 === 0;
    });
    const sourceBox = minimalBoxWithDrawers(sourceLayers, {
      gavetas: 3,
      drawerHeightMode: "equal",
    });
    const preset = extractDrawerPresetFromBox(sourceBox, "3 iguais")!;

    const targetLayers = buildDrawerLayers(1);
    let targetBox = minimalBoxWithDrawers(targetLayers, { gavetas: 1 });

    const result = applyDrawerPresetToBox(targetBox, preset);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    targetBox = result.box;
    expect(targetBox.gavetas).toBe(3);
    expect(targetBox.drawerHeightMode).toBe("equal");
    expect(targetBox.drawersLayer).toHaveLength(3);
    expect(targetBox.drawersLayer![0].metadata?.drawerGroupName).toBe("GAV_1");
    expect(targetBox.drawersLayer![2].metadata?.drawerGroupName).toBe("GAV_3");
    expect(targetBox.drawersLayer![0].softClose).toBe(true);
    expect(targetBox.drawersLayer![1].softClose).toBe(false);

    const regenerated = regenerateLayersForBox(targetBox);
    expect(regenerated.drawersLayer).toHaveLength(3);
    expect(regenerated.drawersLayer![0].metadata?.drawerGroupName).toBe("GAV_1");
  });

  it("applyDrawerPresetToBox — falha quando contagem impossível", () => {
    const layers = buildDrawerLayers(1);
    const box = minimalBoxWithDrawers(layers, { gavetas: 1 });
    const preset = {
      id: "x",
      nome: "Impossível",
      drawerCount: 20,
      drawerHeightMode: "equal" as const,
      drawers: [],
    };
    const result = applyDrawerPresetToBox(box, preset);
    expect(result.ok).toBe(false);
  });
});
