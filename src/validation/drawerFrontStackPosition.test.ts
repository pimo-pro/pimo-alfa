/**
 * Frentes de gaveta alinhadas à posição no módulo (inferior / superior / intermédia).
 */
import { describe, expect, it } from "vitest";
import {
  calculateDrawerHeights,
  calculateDrawerPositions,
  generateDrawerGroup,
  drawerGroupToLayerItems,
  DRAWER_VERTICAL_BASE_OFFSET_MM,
  resolveDrawerFrontStackGeometry,
  resolveDrawerStackRole,
} from "../core/drawers";
import {
  DRAWER_SIDE_BASE_ELEVATION_MM,
  DRAWER_VERTICAL_GAP_MM,
} from "../core/drawers/drawerGeometryConstants";
import { resolveDrawerWoodBodyHeightMm } from "../core/drawers/drawerViewerLayout";
import { getDrawerFrontDowelYPositionsMm } from "../core/drawers/drilling/drawerDowelInterlock";
import { computeDrawerFrenteExtStructuralHoles } from "../core/drawers/drilling/DrawerDrillingRules";
import { cutlistComPrecoFromBox } from "../core/manufacturing/cutlistFromBoxes";
import { defaultRulesConfig } from "../core/rules/rulesConfig";
import { buildDrillStationXmlFilesForProject } from "../core/drill/drillExport";
import { isDrawerPieceTipo } from "../services/drawerCutlistAdapter";
import { settingsDefaults } from "../core/settings/settingsSchema";
import {
  buildDrawerScenario,
  minimalBoxWithDrawers,
} from "./drawerCertificationTestHelpers";

describe("gav_frente — stack vertical por posição no módulo", () => {
  it("offset de base = 0 (frente inferior flush ao piso do vão)", () => {
    expect(DRAWER_VERTICAL_BASE_OFFSET_MM).toBe(0);
  });

  it("módulo 2 gavetas iguais 720 mm — frentes (H-gap)/2; flush base e CIMA", () => {
    const boxH = 720;
    const heights = calculateDrawerHeights(2, boxH, "equal");
    const expectedEach = (boxH - DRAWER_VERTICAL_GAP_MM) / 2;
    expect(heights).toEqual([expectedEach, expectedEach]);

    const positions = calculateDrawerPositions(heights, boxH);
    const lower = resolveDrawerFrontStackGeometry({
      drawerIndex0Based: 0,
      drawerHeights: heights,
      boxInternalHeightMm: boxH,
      posYMm: positions[0]!,
    });
    const upper = resolveDrawerFrontStackGeometry({
      drawerIndex0Based: 1,
      drawerHeights: heights,
      boxInternalHeightMm: boxH,
      posYMm: positions[1]!,
    });

    expect(lower.role).toBe("lowest");
    expect(upper.role).toBe("highest");
    expect(lower.flushToModuleBase).toBe(true);
    expect(upper.flushToModuleTop).toBe(true);
    expect(lower.frontBottomFromModuleBaseMm).toBeCloseTo(0, 5);
    expect(upper.frontTopFromModuleBaseMm).toBeCloseTo(boxH, 5);
  });

  it("furos/rasgo — highest alinhado às laterais; lowest usa medidas fixas", () => {
    const frontH = 358;
    const sideH = resolveDrawerWoodBodyHeightMm(frontH);
    const elev = DRAWER_SIDE_BASE_ELEVATION_MM;

    const holesLowest = computeDrawerFrenteExtStructuralHoles({
      largura: 598,
      altura: frontH,
      espessura: 19,
      stackRole: "lowest",
      sideHeightMm: sideH,
      bodyWidthMm: 548,
      sideThicknessMm: 16,
      bottomThicknessMm: 10,
    });
    const holesUpper = computeDrawerFrenteExtStructuralHoles({
      largura: 598,
      altura: frontH,
      espessura: 19,
      stackRole: "highest",
      isLowestDrawer: false,
      sideHeightMm: sideH,
      bodyWidthMm: 548,
      sideThicknessMm: 16,
      bottomThicknessMm: 10,
      sideBaseElevationMm: elev,
    });

    expect(holesLowest.find((h) => h.holeSubtype === "groove")?.y).toBe(56.5);
    expect(holesLowest.filter((h) => h.tipo === "cavilha").every((h) => h.y === 73.5)).toBe(true);

    const ysUpper = [...new Set(holesUpper.filter((h) => h.tipo === "cavilha").map((h) => h.y))].sort(
      (a, b) => a - b
    );
    expect(ysUpper).toEqual(getDrawerFrontDowelYPositionsMm(sideH, false).map((y) => y + elev));
    expect(holesUpper.find((h) => h.holeSubtype === "groove")?.y).toBe(elev + sideH - 13);
  });

  it("pipeline 2 gavetas — cutlist + DRILL: roles e furos", () => {
    const boxH = 720;
    const { layers } = buildDrawerScenario({
      boxWidth: 600,
      boxHeight: boxH,
      boxDepth: 560,
      drawerCount: 2,
    });
    const box = minimalBoxWithDrawers(layers);
    const cutlist = cutlistComPrecoFromBox(box, defaultRulesConfig).filter((p) =>
      isDrawerPieceTipo(p.tipo)
    );
    const fronts = cutlist
      .filter((p) => p.tipo === "gaveta_frente_ext")
      .sort(
        (a, b) =>
          (Number(a.metadata?.drawerIndex) || 0) - (Number(b.metadata?.drawerIndex) || 0)
      );
    expect(fronts).toHaveLength(2);
    expect(fronts[0]!.metadata?.drawerRules).toMatchObject({ stackRole: "lowest" });
    expect(fronts[1]!.metadata?.drawerRules).toMatchObject({ stackRole: "highest" });
    expect(fronts[0]!.drillHoles?.find((h) => h.holeSubtype === "groove")?.y).toBe(56.5);
    expect(fronts[1]!.drillHoles?.find((h) => h.holeSubtype === "groove")?.y).not.toBe(56.5);

    const drill = buildDrillStationXmlFilesForProject(cutlist, {
      projectName: "STACK2",
      boxes: [box],
      rules: defaultRulesConfig,
    });
    expect(
      drill.filter((f) => f.partName.includes("gav_frent") && f.machineTarget === "drill").length
    ).toBeGreaterThanOrEqual(2);
  });

  it("generateDrawerGroup — inferior na base, superior na CIMA", () => {
    const boxH = 600;
    const group = generateDrawerGroup({
      boxWidth: 600,
      boxHeight: boxH,
      boxDepth: 560,
      boxThickness: 19,
      boxId: "flush-2",
      drawerCount: 2,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm,
      drawerSettings: settingsDefaults.gavetas,
      espessuraCostaMm: 10,
      costaAtiva: true,
    });
    const layers = drawerGroupToLayerItems(group);
    expect(resolveDrawerStackRole(0, 2)).toBe("lowest");
    expect(resolveDrawerStackRole(1, 2)).toBe("highest");

    const heights = layers.map((l) => l.height);
    const positions = layers.map((l) => l.posY!);
    const geo0 = resolveDrawerFrontStackGeometry({
      drawerIndex0Based: 0,
      drawerHeights: heights,
      boxInternalHeightMm: boxH,
      posYMm: positions[0]!,
    });
    const geo1 = resolveDrawerFrontStackGeometry({
      drawerIndex0Based: 1,
      drawerHeights: heights,
      boxInternalHeightMm: boxH,
      posYMm: positions[1]!,
    });
    expect(geo0.flushToModuleBase).toBe(true);
    expect(geo1.flushToModuleTop).toBe(true);
  });
});
