import { describe, expect, it } from "vitest";
import { buildDrawerSpecs } from "../3d/objects/DrawerFactory";
import {
  assertDrawerWoodPiecesDisjoint,
  buildDrawerWoodViewerPieceBoxes,
  resolveDrawerBodyCenterOffsetYMm,
  resolveDrawerBodyCenterZMm,
  resolveDrawerGroupPosZMm,
  resolveDrawerViewerPosZAdjustmentMm,
} from "../core/drawers/drawerViewerLayout";
import { DRAWER_BODY_HEIGHT_BELOW_FRONT_MM } from "../core/drawers/drawerGeometryConstants";
import { drawerGroupToLayerItems, generateDrawerGroup } from "../core/drawers";
import { settingsDefaults } from "../core/settings/settingsSchema";

describe("drawerViewerLayout — geometria 3D industrial", () => {
  it("frente flush: posZ grupo + meia espessura = face da carcaça", () => {
    const carcass = 531;
    const layout = 560;
    const frontT = 19;
    const posZ = resolveDrawerGroupPosZMm(layout, frontT);
    const dz = resolveDrawerViewerPosZAdjustmentMm(layout, carcass);
    expect(posZ + dz + frontT / 2).toBeCloseTo(carcass / 2, 3);
  });

  it("corpo Z = −(esp. frente + slideLength)/2", () => {
    expect(resolveDrawerBodyCenterZMm(19, 500)).toBeCloseTo(-(19 / 2 + 500 / 2), 3);
  });

  it("laterais 12 mm mais baixas — offset Y = −6 mm", () => {
    expect(resolveDrawerBodyCenterOffsetYMm(12)).toBe(-6);
  });

  it("layer → spec → posições coerentes com domínio", () => {
    const group = generateDrawerGroup({
      boxWidth: 600,
      boxHeight: 400,
      boxDepth: 560,
      boxThickness: 19,
      boxId: "viewer-layout",
      drawerCount: 1,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm,
      drawerSettings: settingsDefaults.gavetas,
    });
    const [layer] = drawerGroupToLayerItems(group);
    const [spec] = buildDrawerSpecs([layer]);

    expect(spec.frontPosZ).toBe(0);
    expect(spec.frontPosY).toBe(0);
    expect(spec.bodyDepthM).toBeCloseTo(0.5, 3);
    expect(spec.leftSidePosZ).toBeCloseTo(resolveDrawerBodyCenterZMm(19, 500) / 1000, 4);
    expect(spec.leftSidePosY).toBeCloseTo(-0.006, 4);
    expect(spec.heightM).toBeGreaterThan(spec.woodBodyHeightM ?? 0);
  });

  it("peças madeira — frente não intersecta laterais", () => {
    const boxes = buildDrawerWoodViewerPieceBoxes({
      frontWidthMm: 598,
      frontHeightMm: 390,
      frontThicknessMm: 19,
      bodyWidthMm: 548,
      slideLengthMm: 500,
      sideThicknessMm: 16,
      woodBodyHeightMm: 378,
      bottomThicknessMm: 10,
      backThicknessMm: 16,
      backWidthMm: 516,
    });
    const front = boxes.find((b) => b.name === "frente_ext")!;
    const latEsq = boxes.find((b) => b.name === "lat_esq")!;
    const latDir = boxes.find((b) => b.name === "lat_dir")!;
    expect(assertDrawerWoodPiecesDisjoint([front, latEsq])).toBeNull();
    expect(assertDrawerWoodPiecesDisjoint([front, latDir])).toBeNull();
    expect(front.minY - latEsq.minY).toBeCloseTo(0, 0);
    expect(front.maxZ - latEsq.maxZ).toBeGreaterThan(0);
  });

  it("delta altura frente vs corpo = 12 mm", () => {
    const group = generateDrawerGroup({
      boxWidth: 600,
      boxHeight: 400,
      boxDepth: 560,
      boxThickness: 19,
      boxId: "viewer-delta",
      drawerCount: 1,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm,
      drawerSettings: settingsDefaults.gavetas,
    });
    const [layer] = drawerGroupToLayerItems(group);
    expect(layer.height! - (layer.backHeight ?? 0)).toBeCloseTo(DRAWER_BODY_HEIGHT_BELOW_FRONT_MM, 0);
  });
});
