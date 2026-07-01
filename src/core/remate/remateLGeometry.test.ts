import { describe, it, expect } from "vitest";
import { getRemateEnvelopeBoundsM } from "./rematePlacement";
import {
  applyLRemateGroupCoupling,
  computeLRemateExtCornerMm,
  computeLRemateIntCornerFromExt,
  computeLRemateSheetDimensions,
  lRemateCenterToCornerMm,
  lRemateCornerToCenterMm,
  lSecondaryMountSlot,
  REMATE_L_STRIP_WIDTH_MM,
  remateLIndustrialName,
  remateLIndustrialSuffix,
  snapLRemateGroupCorners,
} from "./remateLGeometry";
import { buildProductPieceSpecs, computeDimensionsForProduct } from "./remateProductRules";
import { createRematePieces } from "./rematePieceFactory";
import { snapToMountRule } from "./remateMountFrame";

const box = {
  id: "box-1",
  nome: "MOD1",
  dimensoes: { largura: 600, altura: 720, profundidade: 500 },
} as never;

describe("remate L geometry — khaled-pro", () => {
  it("buildProductPieceSpecs gera duas peças independentes", () => {
    const specs = buildProductPieceSpecs({ productType: "L", mountSlot: "DIR" });
    expect(specs).toHaveLength(2);
    expect(specs[0]?.partIndex).toBe(1);
    expect(specs[1]?.partIndex).toBe(2);
    expect(specs[0]?.mountSlot).toBe("DIR");
    expect(specs[1]?.mountSlot).toBe("FRENTE");
  });

  it("dimensões khaled-pro lateral: ext=100×720×19, int=600×100×19", () => {
    const ext = computeLRemateSheetDimensions({
      primarySlot: "DIR",
      partIndex: 1,
      boxAlturaMm: 720,
      boxLarguraMm: 600,
      thicknessMm: 19,
    });
    const int = computeLRemateSheetDimensions({
      primarySlot: "DIR",
      partIndex: 2,
      boxAlturaMm: 720,
      boxLarguraMm: 600,
      thicknessMm: 19,
    });
    expect(ext).toEqual({ width: 100, height: 720, depth: 19 });
    expect(int).toEqual({ width: 600, height: 100, depth: 19 });
  });

  it("dimensões cima: ext=largura×faixa, int=altura×faixa", () => {
    const a = computeDimensionsForProduct({
      box,
      productType: "L",
      mountSlot: "CIMA",
      thicknessMm: 19,
      partIndex: 1,
    });
    const b = computeDimensionsForProduct({
      box,
      productType: "L",
      mountSlot: lSecondaryMountSlot("CIMA"),
      thicknessMm: 19,
      partIndex: 2,
    });
    expect(a).toEqual({ width: 100, height: 600, depth: 19 });
    expect(b).toEqual({ width: 720, height: 100, depth: 19 });
  });

  it("createRematePieces cria REMATE_L_ext e REMATE_L_int", () => {
    const pieces = createRematePieces(
      { productType: "L", mountSlot: "DIR", parentBoxId: "box-1", followBox: true },
      {
        box,
        materialPresetId: "mdf-19",
        thicknessMm: 19,
        boxDimsM: { widthM: 0.6, heightM: 0.72, depthM: 0.5 },
      }
    );
    expect(pieces).toHaveLength(2);
    expect(pieces[0]?.name).toBe("MOD1_REMATE_L_ext");
    expect(pieces[1]?.name).toBe("MOD1_REMATE_L_int");
    expect(pieces[0]?.parentGroupId).toBeTruthy();
    expect(pieces[1]?.parentGroupId).toBe(pieces[0]?.parentGroupId);
  });

  it("união geométrica: int.pos = ext.pos + ext.altura em Y", () => {
    const bounds = getRemateEnvelopeBoundsM(0.6, 0.72, 0.5, null);
    const ext = {
      width: 100,
      height: 720,
      depth: 19,
      mountSlot: "DIR" as const,
      partIndex: 1 as const,
    };
    const extCorner = computeLRemateExtCornerMm("DIR", ext, bounds);
    const intCorner = computeLRemateIntCornerFromExt(extCorner, ext);
    expect(intCorner.xMm).toBe(extCorner.xMm);
    expect(intCorner.zMm).toBe(extCorner.zMm);
    expect(intCorner.yMm).toBe(extCorner.yMm + ext.height);
  });

  it("ESQ espelha apenas posX", () => {
    const bounds = getRemateEnvelopeBoundsM(0.6, 0.72, 0.5, null);
    const extDims = { width: 100, height: 720, depth: 19 };
    const dirCorner = computeLRemateExtCornerMm("DIR", extDims, bounds);
    const esqCorner = computeLRemateExtCornerMm("ESQ", extDims, bounds);
    expect(esqCorner.yMm).toBe(dirCorner.yMm);
    expect(esqCorner.zMm).toBe(dirCorner.zMm);
    expect(esqCorner.xMm).toBeLessThan(bounds.minX * 1000);
  });

  it("rotação zero após snap", () => {
    const bounds = getRemateEnvelopeBoundsM(0.6, 0.72, 0.5, null);
    const snapped = snapToMountRule(
      {
        id: "a",
        tipo: "L",
        productType: "L",
        mountSlot: "DIR",
        partIndex: 1,
        width: 100,
        height: 720,
        depth: 19,
        materialPresetId: "m",
        position: { xMm: 0, yMm: 0, zMm: 0 },
        rotation: { xRad: 0, yRad: 0, zRad: 0 },
        followBox: true,
        name: "A",
      },
      bounds
    );
    expect(snapped.rotation).toEqual({ xRad: 0, yRad: 0, zRad: 0 });
    expect(Math.abs(snapped.position.xMm)).toBeLessThan(2000);
  });

  it("canto ↔ centro converte sem perda", () => {
    const piece = { width: 100, height: 720, depth: 19 };
    const corner = { xMm: 300, yMm: -360, zMm: 270 };
    const center = lRemateCornerToCenterMm(piece, corner);
    expect(lRemateCenterToCornerMm(piece, center)).toEqual(corner);
  });

  it("applyLRemateGroupCoupling move parceiro ao mover ext", () => {
    const bounds = getRemateEnvelopeBoundsM(0.6, 0.72, 0.5, null);
    const base = snapLRemateGroupCorners(
      {
        id: "ext",
        tipo: "L",
        productType: "L",
        partIndex: 1,
        parentGroupId: "g1",
        width: 100,
        height: 720,
        depth: 19,
        materialPresetId: "m",
        position: { xMm: 0, yMm: 0, zMm: 0 },
        rotation: { xRad: 0, yRad: 0, zRad: 0 },
        followBox: true,
        name: "ext",
        mountSlot: "DIR",
      },
      {
        id: "int",
        tipo: "L",
        productType: "L",
        partIndex: 2,
        parentGroupId: "g1",
        width: 600,
        height: 100,
        depth: 19,
        materialPresetId: "m",
        position: { xMm: 0, yMm: 0, zMm: 0 },
        rotation: { xRad: 0, yRad: 0, zRad: 0 },
        followBox: true,
        name: "int",
        mountSlot: "FRENTE",
      },
      bounds
    );
    const movedExt = {
      ...base.ext,
      position: { xMm: base.ext.position.xMm + 10, yMm: base.ext.position.yMm, zMm: base.ext.position.zMm },
      placementMode: "FREE" as const,
    };
    const coupled = applyLRemateGroupCoupling([movedExt, base.int], "ext");
    const int = coupled.find((p) => p.id === "int")!;
    expect(int.position.xMm).toBe(movedExt.position.xMm);
    expect(int.position.yMm).toBe(movedExt.position.yMm + movedExt.height);
    expect(int.position.zMm).toBe(movedExt.position.zMm);
  });

  it("suffix industrial L_ext / L_int", () => {
    expect(remateLIndustrialSuffix(1)).toBe("L_ext");
    expect(remateLIndustrialSuffix(2)).toBe("L_int");
    expect(remateLIndustrialName(1, "MOD1")).toBe("MOD1_REMATE_L_ext");
    expect(remateLIndustrialName(2, "MOD1")).toBe("MOD1_REMATE_L_int");
  });
});
