import { describe, expect, it } from "vitest";
import { buildDrawerSpecs } from "../3d/objects/DrawerFactory";
import { calculateDrawerSpecs, drawerGroupToLayerItems, generateDrawerGroup } from "../core/drawers";
import { settingsDefaults } from "../core/settings/settingsSchema";

describe("Drawer Rules — corrediças e soft-close", () => {
  it("Blum Tandem usa curso total igual à profundidade do corpo", () => {
    const specs = calculateDrawerSpecs(
      {
        boxInternalWidth: 562,
        boxInternalHeight: 720,
        boxInternalDepth: 560,
        boxThickness: 19,
        drawerHeight: 200,
        totalDrawers: 1,
        type: "normal",
      },
      settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm,
      {
        ...settingsDefaults.gavetas,
        gavetaTipoCorredica: "Blum Tandem",
        gavetaCursoTotalMm: 0,
      }
    );

    expect(specs.slide.type).toBe("Blum Tandem");
    expect(specs.slide.cursoTotalMm).toBe(specs.body.depth);
    expect(specs.positioning.pullDistance).toBe(specs.body.depth);
  });

  it("propaga slideType e softClose até DrawerFactory", () => {
    const group = generateDrawerGroup({
      boxWidth: 600,
      boxHeight: 300,
      boxDepth: 560,
      boxThickness: 19,
      boxId: "slide-box",
      drawerCount: 1,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm,
      drawerSettings: {
        ...settingsDefaults.gavetas,
        gavetaTipoCorredica: "Blum Movento",
        gavetaSoftClose: true,
      },
    });
    const [layer] = drawerGroupToLayerItems(group);
    const [spec] = buildDrawerSpecs([layer]);

    expect(layer.slideType).toBe("Blum Movento");
    expect(layer.softClose).toBe(true);
    expect(spec.slideType).toBe("Blum Movento");
    expect(spec.softClose).toBe(true);
  });
});
