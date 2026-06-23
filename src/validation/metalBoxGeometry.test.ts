import { describe, expect, it } from "vitest";
import { calculateDrawerSpecs } from "../core/drawers/DrawerParametrics";
import { buildDrawerSpecs } from "../3d/objects/DrawerFactory";
import { drawerGroupToLayerItems, generateDrawerGroup } from "../core/drawers";
import { settingsDefaults } from "../core/settings/settingsSchema";

describe("metal box geometry", () => {
  it("DrawerParametrics fixa altura do corpo ao catálogo", () => {
    const specs = calculateDrawerSpecs(
      {
        boxInternalWidth: 562,
        boxExternalWidth: 600,
        boxInternalDepth: 560,
        drawerHeight: 198,
        type: "normal",
        boxThickness: 19,
      },
      settingsDefaults.gavetas,
      settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm,
      {
        metalBoxType: "Blum Legrabox",
        metalBoxHeightMm: 177,
        nominalDepthMm: 500,
      }
    );

    expect(specs.metalBox.enabled).toBe(true);
    expect(specs.metalBox.height).toBe(177);
    expect(specs.metalBox.profileId).toBe("blum_legrabox");
    expect(specs.body.height).toBe(177);
    expect(specs.leftSide.width).toBe(0);
    expect(specs.nominalDepthMm).toBe(500);
  });

  it("3D usa altura metálica e omite laterais de madeira", () => {
    const group = generateDrawerGroup({
      boxWidth: 600,
      boxHeight: 400,
      boxDepth: 560,
      boxThickness: 19,
      boxId: "geo-metal",
      drawerCount: 1,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm,
      drawerSettings: {
        ...settingsDefaults.gavetas,
        gavetaTipoCaixaMetalica: "Hettich ArciTech",
      },
      drawerOverrides: [{ metalBoxType: "Hettich ArciTech", metalBoxHeightMm: 96 }],
    });
    const [layer] = drawerGroupToLayerItems(group);
    layer.metadata = { ...layer.metadata, metalBoxHeightMm: 96 };

    const [spec] = buildDrawerSpecs([layer]);
    expect(spec.metalBoxType).toBe("Hettich ArciTech");
    expect(spec.metalBoxHeightMm).toBe(96);
    expect(spec.bodyHeightM).toBeCloseTo(0.096, 3);
    expect(spec.leftSideWidthM).toBeUndefined();
  });
});
