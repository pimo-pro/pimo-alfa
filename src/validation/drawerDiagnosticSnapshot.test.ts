import { describe, it, expect } from "vitest";
import { generateDrawerGroup, drawerGroupToLayerItems } from "../core/drawers";
import { buildDrawerSpecs } from "../3d/objects/DrawerFactory";
import { settingsDefaults } from "../core/settings/settingsSchema";
import { resolveDrawerBoxUsableDepthMm } from "../core/drawers/DrawerParametrics";
import {
  buildDrawerWoodViewerPieceBoxes,
  resolveDrawerGroupPosZMm,
  resolveDrawerBodyCenterZMm,
} from "../core/drawers/drawerViewerLayout";

describe("drawer diagnostic snapshot", () => {
  it("prints drawer position report (industrial = viewer, frente flush externa)", () => {
    const box = { width: 600, height: 720, depth: 560, thickness: 19 };
    const clearance = settingsDefaults.gavetas.gavetaRecuoProfundidadeCorredicaMm;
    const slideUsable = resolveDrawerBoxUsableDepthMm(box.depth, box.thickness, { clearanceMm: clearance });

    const group = generateDrawerGroup({
      boxWidth: box.width,
      boxHeight: box.height,
      boxDepth: box.depth,
      boxThickness: box.thickness,
      boxId: "diag",
      drawerCount: 3,
      drawerType: "normal",
      heightMode: "equal",
      availableDepths: settingsDefaults.gavetas.gavetaProfundidadesDisponiveisMm,
      drawerSettings: settingsDefaults.gavetas,
    });
    const layers = drawerGroupToLayerItems(group);
    const specs3d = buildDrawerSpecs(layers);
    const frontCenterZ = resolveDrawerGroupPosZMm(box.depth, 19);

    const rows = layers.map((layer, i) => {
      const drawer = group.drawers[i]!;
      return {
        drawerIndex: i,
        posX: layer.posX,
        posY: layer.posY,
        posZ: layer.posZ,
        width: layer.width,
        height: layer.height,
        depth: layer.depth,
        frontThickness: layer.frontThickness,
        drawerBoxDepth: layer.bodyDepth,
        drawerBoxOffsetZ: drawer.pieces.leftSide.positionZ,
        frontOffsetZ: drawer.pieces.front.positionZ,
        slideUsableMm: slideUsable,
        frontCenterZ,
        bodyWidth: layer.bodyWidth,
      };
    });

    const localBoxes = buildDrawerWoodViewerPieceBoxes({
      frontWidthMm: layers[0]!.width ?? 0,
      frontHeightMm: layers[0]!.height ?? 0,
      frontThicknessMm: layers[0]!.frontThickness ?? 19,
      bodyWidthMm: layers[0]!.bodyWidth ?? 0,
      slideLengthMm: layers[0]!.bodyDepth ?? 500,
      sideThicknessMm: layers[0]!.sideThickness ?? 16,
      woodBodyHeightMm: layers[0]!.backHeight ?? 0,
      bottomThicknessMm: layers[0]!.bottomThickness ?? 10,
      backThicknessMm: layers[0]!.backThickness ?? 16,
      backWidthMm: layers[0]!.backWidth ?? 0,
    });

    for (const row of rows) {
      expect(row.frontOffsetZ).toBe(0);
      expect(row.posZ).toBeCloseTo(frontCenterZ, 3);
      expect(row.bodyWidth).toBe(box.width - 2 * box.thickness - 14);
      expect(row.height).toBeLessThan(box.height);
    }

    expect(specs3d).toHaveLength(3);
    expect(resolveDrawerBodyCenterZMm(19, 500)).toBeLessThan(0);

    console.log(JSON.stringify({ context: { box, slideUsable, frontCenterZ }, rows, localBoxes_gaveta0: localBoxes }, null, 2));
  });
});
