/**
 * Stack 3 gavetas alinhado SolidWorks  alturas, laterais, slides Y = bottom+41.
 */
import { describe, expect, it } from "vitest";
import {
  calculateDrawerHeights,
  calculateDrawerPositions,
  generateDrawerGroup,
  drawerGroupToLayerItems,
  resolveDrawerFrontStackGeometry,
} from "../core/drawers";
import { resolveEuropeanModuleRunnerLinesYMm } from "../core/drawers/drilling/DrawerDrillingRules";
import {
  assertTopFrontCoversCimaWithClearance,
  resolveDrawerWoodBodyHeightForStackRoleMm,
  resolveSolidWorksThreeDrawerFrontBottomsMm,
  resolveSolidWorksThreeDrawerFrontHeightsMm,
} from "../core/drawers/drawerSolidWorksStackGeometry";
import { DRAWER_SLIDE_OFFSET_FROM_BOTTOM_MM } from "../core/drawers/drilling/drawerDowelInterlock";
import { settingsDefaults } from "../core/settings/settingsSchema";

describe("stack SolidWorks 3 gavetas (76219)", () => {
  const H = 762;
  const T = 19;

  it("alturas frente / bottoms / laterais SSOT", () => {
    const fronts = resolveSolidWorksThreeDrawerFrontHeightsMm(H, T);
    const bottoms = resolveSolidWorksThreeDrawerFrontBottomsMm(H, T);
    expect(fronts[0]).toBeCloseTo(258.667, 3);
    expect(fronts[1]).toBeCloseTo(260.667, 3);
    expect(fronts[2]).toBeCloseTo(260.667, 3);
    expect(bottoms[0]).toBeCloseTo(0, 5);
    expect(bottoms[1]).toBeCloseTo(247.667, 3);
    expect(bottoms[2]).toBeCloseTo(514.333, 3);
    expect(resolveDrawerWoodBodyHeightForStackRoleMm(fronts[0], "lowest")).toBeCloseTo(
      177.167,
      3
    );
    expect(resolveDrawerWoodBodyHeightForStackRoleMm(fronts[1], "middle")).toBeCloseTo(
      196.167,
      3
    );
    expect(resolveDrawerWoodBodyHeightForStackRoleMm(fronts[2], "highest")).toBeCloseTo(
      196.167,
      3
    );
  });

  it("calculateDrawerHeights/Positions equal ? slides 41 / 288.667 / 555.333", () => {
    const heights = calculateDrawerHeights(3, H, "equal", undefined, {
      topPanelThicknessMm: T,
    });
    const positions = calculateDrawerPositions(heights, H, 0, { topPanelThicknessMm: T });
    const bottoms = heights.map((h, i) => positions[i]! - (-H / 2) - h / 2);
    const slides = bottoms.map((b) => b + DRAWER_SLIDE_OFFSET_FROM_BOTTOM_MM);
    expect(slides[0]).toBeCloseTo(41, 3);
    expect(slides[1]).toBeCloseTo(288.667, 3);
    expect(slides[2]).toBeCloseTo(555.333, 3);

    const runnerFromTop = resolveEuropeanModuleRunnerLinesYMm({
      panelHeightMm: H - 2 * T,
      boxInternalHeightMm: H,
      drawers: positions.map((posY, i) => ({
        posYMm: posY,
        frontHeightMm: heights[i]!,
      })),
    });
    const panelH = H - 2 * T;
    const fromBottom = runnerFromTop.map((yTop) => panelH - yTop);
    expect(fromBottom[0]).toBeCloseTo(41, 3);
    expect(fromBottom[1]).toBeCloseTo(288.667, 3);
    expect(fromBottom[2]).toBeCloseTo(555.333, 3);
  });

  it("frente superior cobre CIMA e desce ? 2 mm abaixo", () => {
    const cover = assertTopFrontCoversCimaWithClearance({
      boxExternalHeightMm: H,
      topPanelThicknessMm: T,
    });
    expect(cover.ok).toBe(true);
    expect(cover.extendsBelowUndersideMm).toBeGreaterThanOrEqual(2);
    expect(cover.coverThroughCimaMm).toBeGreaterThanOrEqual(T);
  });

  it("generateDrawerGroup produz laterais SW e gap 4 entre frentes mid", () => {
    const group = generateDrawerGroup({
      boxWidth: 600,
      boxHeight: H,
      boxDepth: 500,
      boxThickness: T,
      boxId: "sw-3",
      drawerCount: 3,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm,
      drawerSettings: settingsDefaults.gavetas,
      espessuraCostaMm: 10,
      costaAtiva: true,
    });
    const layers = drawerGroupToLayerItems(group);
    expect(layers[0]!.height).toBeCloseTo(258.667, 3);
    expect(layers[1]!.height).toBeCloseTo(260.667, 3);
    expect(layers[2]!.height).toBeCloseTo(260.667, 3);
    expect(layers[0]!.bodyHeight).toBeCloseTo(177.167, 3);
    expect(layers[1]!.bodyHeight).toBeCloseTo(196.167, 3);
    expect(layers[2]!.bodyHeight).toBeCloseTo(196.167, 3);

    const geo2 = resolveDrawerFrontStackGeometry({
      drawerIndex0Based: 2,
      drawerHeights: layers.map((l) => l.height!),
      boxInternalHeightMm: H,
      posYMm: layers[2]!.posY!,
    });
    const elev = layers[2]!.metadata?.sideBaseElevationMm ?? 17;
    const lateralTop =
      geo2.frontBottomFromModuleBaseMm + elev + (layers[2]!.bodyHeight ?? 0);
    const cimaUnderside = H - T;
    expect(cimaUnderside - lateralTop).toBeGreaterThan(10);
  });
});
