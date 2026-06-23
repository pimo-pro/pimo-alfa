import { describe, expect, it } from "vitest";
import {
  DRAWER_METAL_BOTTOM_THICKNESS_MM,
  drawerLayerItemToCutList,
  extractDrawerIndustrialBomFromLayerItems,
} from "../services/drawerCutlistAdapter";
import { drawerGroupToLayerItems, generateDrawerGroup } from "../core/drawers";
import { settingsDefaults } from "../core/settings/settingsSchema";

const METAL_WOOD_PIECES = [
  "gaveta_frente_int",
  "gaveta_frente_ext",
  "gaveta_fundo",
  "gaveta_traseira",
] as const;

describe("Composição industrial — gaveta metálica", () => {
  it("4 peças de madeira + laterais metálicas (sem lat esq/dir)", () => {
    const settings = {
      ...settingsDefaults.gavetas,
      gavetaTipoCaixaMetalica: "Blum Metabox" as const,
      gavetaAlturaCaixaMetalicaMm: 83,
    };
    const group = generateDrawerGroup({
      boxWidth: 600,
      boxHeight: 400,
      boxDepth: 560,
      boxThickness: 19,
      boxId: "metal-comp",
      drawerCount: 1,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: settings.gavetaProfundidadesDisponiveisMm,
      drawerSettings: settings,
      drawerOverrides: [{ metalBoxType: "Blum Metabox", metalBoxHeightMm: 83 }],
    });
    const [layer] = drawerGroupToLayerItems(group);
    const cutlist = drawerLayerItemToCutList(layer, 0, "mdf_branco-19", "Modulo_Metal");

    expect(cutlist).toHaveLength(4);
    expect(cutlist.map((p) => p.tipo).sort()).toEqual([...METAL_WOOD_PIECES].sort());
    expect(cutlist.some((p) => p.tipo === "gaveta_lat_esq")).toBe(false);
    expect(cutlist.some((p) => p.tipo === "gaveta_lat_dir")).toBe(false);

    const byTipo = Object.fromEntries(cutlist.map((p) => [p.tipo, p]));
    expect(byTipo.gaveta_fundo?.espessura).toBe(DRAWER_METAL_BOTTOM_THICKNESS_MM);
    expect(byTipo.gaveta_traseira?.espessura).toBe(16);
    expect(byTipo.gaveta_frente_ext?.espessura).toBe(19);

    const bom = extractDrawerIndustrialBomFromLayerItems([layer]);
    expect(bom.hardware[0]?.metalBoxType).toBe("Blum Metabox");
    expect(bom.hardware[0]?.slideLengthMm).toBe(layer.bodyDepth);
  });
});
