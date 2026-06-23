import { describe, expect, it } from "vitest";
import { settingsDefaults } from "../core/settings/settingsSchema";
import {
  calculateDrawerHeights,
  generateDrawerGroup,
  drawerGroupToLayerItems,
  calculateDrawerSpecs,
} from "../core/drawers";
import { DRAWER_VERTICAL_GAP_MM, DRAWER_BODY_HEIGHT_BELOW_FRONT_MM } from "../core/drawers/drawerGeometryConstants";
import {
  buildDrawerVerticalSlots,
  drawerVerticalSlotsOverlap,
  sumDrawerFrontHeightsAndGaps,
  getDrawerStackUsableHeightMm,
} from "../core/drawers/drawerModuleGeometry";
import {
  resolveDrawerVerticalPosition,
  resolveDrawerVerticalPositions,
  DRAWER_VERTICAL_BASE_OFFSET_MM,
} from "../core/drawers/drawerVerticalPosition";
import { buildDrawerScenario } from "./drawerCertificationTestHelpers";

describe("Geometria da gaveta no módulo", () => {
  const drawerSettings = settingsDefaults.gavetas;
  const boxH = 720;
  const boxW = 600;
  const boxD = 560;
  const boxT = 19;

  describe.each([1, 2, 3])("%i gaveta(s) no módulo", (drawerCount) => {
    it("distribui alturas + folgas verticais = altura útil", () => {
      const heights = calculateDrawerHeights(drawerCount, boxH, "equal");
      const usable = getDrawerStackUsableHeightMm(boxH);
      expect(sumDrawerFrontHeightsAndGaps(heights)).toBeCloseTo(usable, 1);
      expect(heights).toHaveLength(drawerCount);
      heights.forEach((h) => expect(h).toBeGreaterThan(0));
    });

    it("não sobrepõe frentes e respeita folga de 4 mm", () => {
      const heights = calculateDrawerHeights(drawerCount, boxH, "equal");
      const slots = buildDrawerVerticalSlots(
        heights,
        boxH,
        DRAWER_VERTICAL_BASE_OFFSET_MM,
        resolveDrawerVerticalPosition
      );
      expect(drawerVerticalSlotsOverlap(slots)).toBe(false);
      for (let i = 0; i < slots.length - 1; i++) {
        const gap = slots[i + 1]!.bottomMm - slots[i]!.topMm;
        expect(gap).toBeCloseTo(DRAWER_VERTICAL_GAP_MM, 0);
      }
    });

    it("frente flush, alinhada ao corpo e centrada", () => {
      const { layers, group } = buildDrawerScenario({
        boxWidth: boxW,
        boxHeight: boxH,
        boxDepth: boxD,
        boxThickness: boxT,
        drawerCount,
      });

      layers.forEach((layer, i) => {
        const drawer = group.drawers[i]!;
        expect(layer.height).toBeCloseTo(drawer.specs.frontExt.height, 1);
        expect(layer.bodyHeight).toBeCloseTo(drawer.specs.body.height, 1);
        expect(layer.height).toBeGreaterThan(layer.bodyHeight!);
        expect(layer.height! - layer.bodyHeight!).toBeCloseTo(DRAWER_BODY_HEIGHT_BELOW_FRONT_MM, 0);
        expect(layer.posZ).toBeCloseTo(boxD / 2 - layer.frontThickness / 2, 1);
        expect(layer.posX ?? 0).toBeCloseTo(0, 1);
        expect(layer.width).toBe(boxW - 2 * drawerSettings.gavetaFolgaFrenteMm);
        expect(layer.bodyWidth).toBe(
          boxW - 2 * boxT - 2 * drawerSettings.gavetaFolgaLateralMm
        );
      });
    });
  });

  it("modos ergonómicos distribuem alturas sem sobreposição", () => {
    for (const mode of ["ergonomic", "kitchen_zones", "auto"] as const) {
      const heights = calculateDrawerHeights(3, boxH, mode);
      const usable = getDrawerStackUsableHeightMm(boxH);
      expect(sumDrawerFrontHeightsAndGaps(heights)).toBeLessThanOrEqual(usable + 0.5);
      const slots = buildDrawerVerticalSlots(
        heights,
        boxH,
        DRAWER_VERTICAL_BASE_OFFSET_MM,
        resolveDrawerVerticalPosition
      );
      expect(drawerVerticalSlotsOverlap(slots)).toBe(false);
    }
  });

  it("posições Y batem com DrawerGroup e layers", () => {
    const group = generateDrawerGroup({
      boxWidth: boxW,
      boxHeight: boxH,
      boxDepth: boxD,
      boxThickness: boxT,
      boxId: "geom-sync",
      drawerCount: 3,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: drawerSettings.gavetaProfundidadesDisponiveisMm,
      drawerSettings,
    });
    const layers = drawerGroupToLayerItems(group);
    const heights = calculateDrawerHeights(3, boxH, "equal");
    const positions = resolveDrawerVerticalPositions(heights, boxH);
    layers.forEach((layer, i) => {
      expect(layer.posY).toBeCloseTo(positions[i]!, 0);
      expect(layer.posY).toBeCloseTo(group.drawers[i]!.position.y, 0);
    });
  });

  it("profundidade do corpo respeita cavidade útil (P − costa − frente)", () => {
    const usableDepth = 560 - 10 - 19; // 531
    const specs = calculateDrawerSpecs(
      {
        boxInternalWidth: boxW - 2 * boxT,
        boxExternalWidth: boxW,
        boxInternalHeight: boxH,
        boxInternalDepth: usableDepth,
        boxThickness: boxT,
        drawerHeight: 200,
        totalDrawers: 1,
        type: "normal",
      },
      drawerSettings.gavetaProfundidadesDisponiveisMm,
      drawerSettings
    );
    expect(specs.body.depth).toBeLessThanOrEqual(usableDepth - specs.runnerClearanceMm);
    expect(specs.frontExt.height - specs.body.height).toBeCloseTo(DRAWER_BODY_HEIGHT_BELOW_FRONT_MM, 0);
  });
});
