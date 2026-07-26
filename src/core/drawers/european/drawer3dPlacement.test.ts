/**
 * Verificao 3D Modelo B  peas dentro da caixa, costa atrs, fundo em baixo.
 * Alinha conveno de grupo/peas com o Modelo A (origem = centro da frente).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as flags from "../drawerSystemFlags";
import { generateEuropeanDrawer } from "../european";
import { europeanResultToLayerItems } from "../european/adapter";
import { drawerEuropeanPlacement } from "../european/placement";
import { drawerEuropeanTransforms } from "../european/transforms";
import { buildDrawerSpecs } from "../../../3d/objects/DrawerFactory";
import {
  assertModeloBDrawerInsideBox,
  drawerPlacement3D,
} from "../../../3d/placement/drawerPlacement3D";
import {
  hasIndustrialPieceLayout,
  resolveDrawerGroup3DPose,
} from "../../../3d/groups/drawerGroup3D";

describe("DRAWER_3D Modelo B placement aligned with Modelo A", () => {
  beforeEach(() => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
  });

  it("3 gavetas  stack Y crescente e dentro da caixa; costa atrs; fundo em baixo", () => {
    const result = generateEuropeanDrawer(
      "hettich-innotech-atira",
      {
        id: "box-3d",
        nome: "CX3D",
        dimensoes: { largura: 600, altura: 720, profundidade: 560 },
        espessura: 19,
        gavetas: 3,
        material: "mdf_branco",
        profundidadeInternaUtilMm: 500,
      },
      {
        systemId: "hettich-innotech-atira",
        heightMm: 144,
        depthMm: 450,
        softClose: true,
        pushOpen: false,
        count: 3,
      }
    );
    expect(result.valid, result.errors.join(" | ")).toBe(true);

    const layers = europeanResultToLayerItems(result, "box-3d", {
      material: "mdf_branco",
      frontMaterial: "mdf_branco",
    });
    expect(layers).toHaveLength(3);
    expect(layers.every((l) => l.metadata?.modeloB === true)).toBe(true);

    const specs = buildDrawerSpecs(layers);
    expect(specs).toHaveLength(3);

    const boxHalfH = 0.36;
    for (let i = 0; i < specs.length; i++) {
      const s = specs[i]!;
      expect(s.modeloB).toBe(true);
      expect(s.y).toBeGreaterThan(-boxHalfH);
      expect(s.y).toBeLessThan(boxHalfH);
      if (i > 0) expect(s.y).toBeGreaterThan(specs[i - 1]!.y);
      expect(s.frontPosX ?? 0).toBeCloseTo(0, 5);
      expect(s.frontPosY ?? 0).toBeCloseTo(0, 5);
      expect(s.frontPosZ ?? 0).toBeCloseTo(0, 5);
      expect(s.backPosZ!).toBeLessThan(-0.05);
      expect(s.bottomPosY!).toBeLessThan(0);
      expect(s.leftSidePosX!).toBeLessThan(0);
      expect(s.rightSidePosX!).toBeGreaterThan(0);
      expect(s.z).toBeCloseTo(0.56 / 2 + 0.019 / 2, 3);
      expect(s.metalBoxType).toBe("Nenhuma");
      expect(assertModeloBDrawerInsideBox(layers[i]!, 720)).toBe(true);
      const pose = resolveDrawerGroup3DPose(layers[i]!);
      expect(pose).not.toBeNull();
      expect(hasIndustrialPieceLayout(pose!)).toBe(true);
    }

    const map = drawerEuropeanTransforms.build(result.viewer.drawers[0]!.geometry);
    expect(map.front.xMm).toBe(0);
    expect(map.front.yMm).toBe(0);
    expect(map.front.zMm).toBe(0);
    expect(map.back.zMm).toBeLessThan(0);
    expect(map.bottom.yMm).toBeLessThan(0);

    const y0 = drawerEuropeanPlacement.calculateVerticalStack({
      boxHeightMm: 720,
      boxThicknessMm: 19,
      usefulHeightMm: 144,
      stackIndex: 0,
    });
    const y1 = drawerEuropeanPlacement.calculateVerticalStack({
      boxHeightMm: 720,
      boxThicknessMm: 19,
      usefulHeightMm: 144,
      stackIndex: 1,
    });
    expect(y1).toBeGreaterThan(y0);

    // Frente europeia (sobreposta): Z = P/2 + T/2  industrial intacto.
    // Modelo A usa flush P/2 - T/2; ambos ancoram o grupo no centro da frente.
    expect(specs[0]!.z).toBeCloseTo(0.56 / 2 + 0.019 / 2, 3);
    const zA = drawerEuropeanPlacement.calculateGroupPosZAlignedWithModeloA(560, 19);
    expect(zA).toBeCloseTo(560 / 2 - 19 / 2, 3);
    expect(drawerPlacement3D.isModeloB(layers[0]!)).toBe(true);
  });

  it("Modelo A layers nao passam pelo gate B", () => {
    expect(
      drawerPlacement3D.isModeloB({
        id: "a",
        parentBoxId: "b",
        type: "pro",
        width: 500,
        height: 140,
        depth: 450,
        frontThickness: 19,
        metadata: {},
      } as never)
    ).toBe(false);
    expect(resolveDrawerGroup3DPose({ metadata: {} } as never)).toBeNull();
  });
});
