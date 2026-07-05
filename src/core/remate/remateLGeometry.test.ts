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
  REMATE_L_CIMA_INT_ROTATION,
  REMATE_L_STRIP_WIDTH_MM,
  remateLIndustrialName,
  remateLIndustrialSuffix,
  resolveLRemateRenderPose,
  resolveLRemateRotation,
  snapLRemateGroupCorners,
} from "./remateLGeometry";
import { buildProductPieceSpecs, computeDimensionsForProduct } from "./remateProductRules";
import { createRematePieces } from "./rematePieceFactory";

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

  it("dimensões lateral legacy DIR: ext=100×720×19, int=600×100×19", () => {
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

  it("dimensões ESQ (legacy): ext=100×720×19, int=600×100×19", () => {
    const ext = computeLRemateSheetDimensions({
      primarySlot: "ESQ",
      partIndex: 1,
      boxAlturaMm: 720,
      boxLarguraMm: 600,
      thicknessMm: 19,
    });
    const int = computeLRemateSheetDimensions({
      primarySlot: "ESQ",
      partIndex: 2,
      boxAlturaMm: 720,
      boxLarguraMm: 600,
      thicknessMm: 19,
    });
    expect(ext).toEqual({ width: 100, height: 720, depth: 19 });
    expect(int).toEqual({ width: 600, height: 100, depth: 19 });
  });

  it("dimensões cima: ext e int = largura×faixa×espessura", () => {
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
    expect(a).toEqual({ width: 600, height: 100, depth: 19 });
    expect(b).toEqual({ width: 600, height: 100, depth: 19 });
  });

  it("dimensões cima 900×720×600: ambas peças 900×100×19", () => {
    const box900 = {
      id: "box-900",
      nome: "MOD900",
      dimensoes: { largura: 900, altura: 720, profundidade: 600 },
    } as never;
    const ext = computeDimensionsForProduct({
      box: box900,
      productType: "L",
      mountSlot: "CIMA",
      thicknessMm: 19,
      partIndex: 1,
    });
    const int = computeDimensionsForProduct({
      box: box900,
      productType: "L",
      mountSlot: lSecondaryMountSlot("CIMA"),
      thicknessMm: 19,
      partIndex: 2,
    });
    expect(ext).toEqual({ width: 900, height: 100, depth: 19 });
    expect(int).toEqual({ width: 900, height: 100, depth: 19 });
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

  it("união geométrica lateral legacy: int.pos = ext.pos + ext.altura em Y", () => {
    const bounds = getRemateEnvelopeBoundsM(0.6, 0.72, 0.5, null);
    const ext = {
      width: 100,
      height: 720,
      depth: 19,
      mountSlot: "DIR" as const,
      partIndex: 1 as const,
    };
    const extCorner = computeLRemateExtCornerMm("DIR", ext, bounds);
    const intCorner = computeLRemateIntCornerFromExt(extCorner, ext, "DIR");
    expect(intCorner.xMm).toBe(extCorner.xMm);
    expect(intCorner.zMm).toBe(extCorner.zMm);
    expect(intCorner.yMm).toBe(extCorner.yMm + ext.height);
  });

  it("união geométrica ESQ (legacy): int.pos = ext.pos + ext.altura em Y", () => {
    const bounds = getRemateEnvelopeBoundsM(0.6, 0.72, 0.5, null);
    const ext = {
      width: 100,
      height: 720,
      depth: 19,
      mountSlot: "ESQ" as const,
      partIndex: 1 as const,
    };
    const extCorner = computeLRemateExtCornerMm("ESQ", ext, bounds);
    const intCorner = computeLRemateIntCornerFromExt(extCorner, ext, "ESQ");
    expect(intCorner.xMm).toBe(extCorner.xMm);
    expect(intCorner.zMm).toBe(extCorner.zMm);
    expect(intCorner.yMm).toBe(extCorner.yMm + ext.height);
  });

  it("união geométrica cima: int encaixada em ext em Z pela espessura, mesma X/Y", () => {
    const bounds = getRemateEnvelopeBoundsM(0.9, 0.72, 0.6, null);
    const ext = {
      width: 900,
      height: 100,
      depth: 19,
      mountSlot: "CIMA" as const,
      partIndex: 1 as const,
    };
    const extCorner = computeLRemateExtCornerMm("CIMA", ext, bounds);
    const intCorner = computeLRemateIntCornerFromExt(extCorner, ext, "CIMA");
    expect(intCorner.xMm).toBe(extCorner.xMm);
    expect(intCorner.yMm).toBe(extCorner.yMm);
    expect(intCorner.zMm).toBe(extCorner.zMm - ext.depth);
    expect(extCorner.yMm).toBe(bounds.maxY * 1000);
    expect(extCorner.yMm).toBeLessThan(bounds.maxY * 1000 + 200);
  });

  it("snap cima 900×720×600: peças no envelope do topo, int atrás em Z", () => {
    const bounds = getRemateEnvelopeBoundsM(0.9, 0.72, 0.6, null);
    const snapped = snapLRemateGroupCorners(
      {
        id: "ext",
        tipo: "L",
        productType: "L",
        partIndex: 1,
        parentGroupId: "g-cima",
        width: 900,
        height: 100,
        depth: 19,
        materialPresetId: "m",
        position: { xMm: 0, yMm: 0, zMm: 0 },
        rotation: { xRad: 0, yRad: 0, zRad: 0 },
        followBox: true,
        name: "ext",
        mountSlot: "CIMA",
      },
      {
        id: "int",
        tipo: "L",
        productType: "L",
        partIndex: 2,
        parentGroupId: "g-cima",
        width: 900,
        height: 100,
        depth: 19,
        materialPresetId: "m",
        position: { xMm: 0, yMm: 0, zMm: 0 },
        rotation: { xRad: 0, yRad: 0, zRad: 0 },
        followBox: true,
        name: "int",
        mountSlot: "DIR",
      },
      bounds
    );
    expect(snapped.ext.position.yMm).toBe(bounds.maxY * 1000);
    expect(snapped.int.position.yMm).toBe(snapped.ext.position.yMm);
    expect(snapped.int.position.zMm).toBe(snapped.ext.position.zMm - snapped.ext.depth);
    expect(snapped.ext.position.yMm).toBeLessThan(bounds.maxY * 1000 + snapped.ext.height + 1);
  });

  it("cima int: rotação 90° em X; ext mantém rotação zero", () => {
    const bounds = getRemateEnvelopeBoundsM(0.9, 0.72, 0.6, null);
    const snapped = snapLRemateGroupCorners(
      {
        id: "ext",
        tipo: "L",
        productType: "L",
        partIndex: 1,
        parentGroupId: "g-cima-rot",
        width: 900,
        height: 100,
        depth: 19,
        materialPresetId: "m",
        position: { xMm: 0, yMm: 0, zMm: 0 },
        rotation: { xRad: 0, yRad: 0, zRad: 0 },
        followBox: true,
        name: "ext",
        mountSlot: "CIMA",
      },
      {
        id: "int",
        tipo: "L",
        productType: "L",
        partIndex: 2,
        parentGroupId: "g-cima-rot",
        width: 900,
        height: 100,
        depth: 19,
        materialPresetId: "m",
        position: { xMm: 0, yMm: 0, zMm: 0 },
        rotation: { xRad: 0, yRad: 0, zRad: 0 },
        followBox: true,
        name: "int",
        mountSlot: "DIR",
      },
      bounds
    );
    expect(snapped.ext.rotation).toEqual({ xRad: 0, yRad: 0, zRad: 0 });
    expect(snapped.int.rotation).toEqual(REMATE_L_CIMA_INT_ROTATION);
    const extPose = resolveLRemateRenderPose(snapped.ext, bounds);
    const intPose = resolveLRemateRenderPose(snapped.int, bounds);
    expect(extPose.rotation).toEqual({ xRad: 0, yRad: 0, zRad: 0 });
    expect(intPose.rotation).toEqual(REMATE_L_CIMA_INT_ROTATION);
    expect(resolveLRemateRotation(snapped.int)).toEqual(REMATE_L_CIMA_INT_ROTATION);
  });

  it("canto ↔ centro converte sem perda", () => {
    const piece = { width: 100, height: 720, depth: 19 };
    const corner = { xMm: 300, yMm: -360, zMm: 270 };
    const center = lRemateCornerToCenterMm(piece, corner);
    expect(lRemateCenterToCornerMm(piece, center)).toEqual(corner);
  });

  it("applyLRemateGroupCoupling move parceiro ao mover ext (legacy Y)", () => {
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
