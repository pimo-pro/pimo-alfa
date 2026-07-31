/**
 * Posição absoluta do gaveta inferior: frontBottom=0, bodyBottom=18.5.
 */
import { describe, expect, it } from "vitest";
import {
  generateDrawerGroup,
  drawerGroupToLayerItems,
  DRAWER_LOWEST_BODY_ABOVE_MODULE_BASE_MM,
  DRAWER_LOWEST_FRONT_BOTTOM_FROM_MODULE_BASE_MM,
  DRAWER_VERTICAL_BASE_OFFSET_MM,
  resolveDrawerFrontStackGeometry,
  resolveDrawerBodyBottomFromModuleBaseMm,
  resolveLowestDrawerBodyElevationFromFrontMm,
} from "../core/drawers";
import { DRAWER_SIDE_BASE_ELEVATION_MM } from "../core/drawers/drawerGeometryConstants";
import { DRAWER_SLIDE_OFFSET_FROM_BOTTOM_MM } from "../core/drawers/drilling/drawerDowelInterlock";
import { computeDrawerFrenteExtStructuralHoles } from "../core/drawers/drilling/DrawerDrillingRules";
import { resolveDrawerWoodBodyHeightMm } from "../core/drawers/drawerViewerLayout";
import { settingsDefaults } from "../core/settings/settingsSchema";

describe("gaveta inferior — posição absoluta corpo/frente", () => {
  it("constantes SSOT", () => {
    expect(DRAWER_LOWEST_FRONT_BOTTOM_FROM_MODULE_BASE_MM).toBe(0);
    expect(DRAWER_VERTICAL_BASE_OFFSET_MM).toBe(0);
    expect(DRAWER_LOWEST_BODY_ABOVE_MODULE_BASE_MM).toBe(18.5);
    expect(resolveLowestDrawerBodyElevationFromFrontMm()).toBe(18.5);
    expect(DRAWER_SLIDE_OFFSET_FROM_BOTTOM_MM).toBe(41);
  });

  it("generateDrawerGroup — frontBottom=0, bodyBottom=18.5; superior elev=17", () => {
    const boxH = 720;
    const group = generateDrawerGroup({
      boxWidth: 600,
      boxHeight: boxH,
      boxDepth: 560,
      boxThickness: 19,
      boxId: "abs-pos",
      drawerCount: 2,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm,
      drawerSettings: settingsDefaults.gavetas,
      espessuraCostaMm: 10,
      costaAtiva: true,
    });
    const layers = drawerGroupToLayerItems(group);
    const heights = layers.map((l) => l.height!);
    const geo0 = resolveDrawerFrontStackGeometry({
      drawerIndex0Based: 0,
      drawerHeights: heights,
      boxInternalHeightMm: boxH,
      posYMm: layers[0]!.posY!,
    });

    expect(geo0.frontBottomFromModuleBaseMm).toBeCloseTo(0, 5);
    expect(layers[0]!.metadata?.sideBaseElevationMm).toBe(18.5);
    expect(layers[1]!.metadata?.sideBaseElevationMm).toBe(DRAWER_SIDE_BASE_ELEVATION_MM);

    const frontH = layers[0]!.height!;
    const bodyH = layers[0]!.bodyHeight!;
    const offsetY = layers[0]!.bodyCenterOffsetY!;
    const moduleBase = -boxH / 2;
    const frontBottom = layers[0]!.posY! - frontH / 2;
    const bodyBottom = layers[0]!.posY! + offsetY - bodyH / 2;

    expect(frontBottom - moduleBase).toBeCloseTo(0, 5);
    expect(bodyBottom - moduleBase).toBeCloseTo(18.5, 5);
    expect(
      resolveDrawerBodyBottomFromModuleBaseMm({
        frontBottomFromModuleBaseMm: geo0.frontBottomFromModuleBaseMm,
        sideBaseElevationMm: 18.5,
      })
    ).toBeCloseTo(18.5, 5);
  });

  it("furos fixos lowest / progressivos highest inalterados", () => {
    const frontH = 358;
    const sideH = resolveDrawerWoodBodyHeightMm(frontH);
    const lowest = computeDrawerFrenteExtStructuralHoles({
      largura: 598,
      altura: frontH,
      espessura: 19,
      stackRole: "lowest",
      sideHeightMm: sideH,
      bodyWidthMm: 548,
      sideThicknessMm: 16,
      bottomThicknessMm: 10,
    });
    const highest = computeDrawerFrenteExtStructuralHoles({
      largura: 598,
      altura: frontH,
      espessura: 19,
      stackRole: "highest",
      isLowestDrawer: false,
      sideHeightMm: sideH,
      bodyWidthMm: 548,
      sideThicknessMm: 16,
      bottomThicknessMm: 10,
      sideBaseElevationMm: DRAWER_SIDE_BASE_ELEVATION_MM,
    });
    expect(lowest.find((h) => h.holeSubtype === "groove")?.y).toBe(56.5);
    expect(lowest.filter((h) => h.tipo === "cavilha").every((h) => h.y === 73.5)).toBe(true);
    expect(highest.find((h) => h.holeSubtype === "groove")?.y).not.toBe(56.5);
  });
});
