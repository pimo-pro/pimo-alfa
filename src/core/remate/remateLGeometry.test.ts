import { describe, it, expect } from "vitest";
import { getRemateEnvelopeBoundsM } from "./rematePlacement";
import {
  computeLRemateCenterM,
  computeLRemateSheetDimensions,
  lSecondaryMountSlot,
  REMATE_L_STRIP_WIDTH_MM,
} from "./remateLGeometry";
import { buildProductPieceSpecs, computeDimensionsForProduct } from "./remateProductRules";
import { createRematePieces } from "./rematePieceFactory";
import { snapToMountRule } from "./remateMountFrame";

const box = {
  id: "box-1",
  nome: "MOD1",
  dimensoes: { largura: 600, altura: 720, profundidade: 500 },
} as never;

describe("remate L geometry", () => {
  it("buildProductPieceSpecs gera duas peças independentes", () => {
    const specs = buildProductPieceSpecs({ productType: "L", mountSlot: "DIR" });
    expect(specs).toHaveLength(2);
    expect(specs[0]?.partIndex).toBe(1);
    expect(specs[1]?.partIndex).toBe(2);
    expect(specs[0]?.mountSlot).toBe("DIR");
    expect(specs[1]?.mountSlot).toBe("FRENTE");
  });

  it("dimensões lateral: A=altura, B=largura, largura fixa 100mm", () => {
    const a = computeLRemateSheetDimensions({
      primarySlot: "DIR",
      partIndex: 1,
      boxAlturaMm: 720,
      boxLarguraMm: 600,
      thicknessMm: 19,
    });
    const b = computeLRemateSheetDimensions({
      primarySlot: "DIR",
      partIndex: 2,
      boxAlturaMm: 720,
      boxLarguraMm: 600,
      thicknessMm: 19,
    });
    expect(a.width).toBe(720);
    expect(a.height).toBe(REMATE_L_STRIP_WIDTH_MM);
    expect(a.depth).toBe(19);
    expect(b.width).toBe(600);
    expect(b.height).toBe(REMATE_L_STRIP_WIDTH_MM);
    expect(b.depth).toBe(19);
  });

  it("dimensões cima: A=largura, B=altura", () => {
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
    expect(a.width).toBe(600);
    expect(b.width).toBe(720);
  });

  it("createRematePieces cria REMATE_L_A e REMATE_L_B", () => {
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
    expect(pieces[0]?.name).toBe("MOD1_REMATE_L_A");
    expect(pieces[1]?.name).toBe("MOD1_REMATE_L_B");
    expect(pieces[0]?.parentGroupId).toBeTruthy();
    expect(pieces[1]?.parentGroupId).toBe(pieces[0]?.parentGroupId);
  });

  it("snap L peça A não coloca offsets corrompidos (km)", () => {
    const bounds = getRemateEnvelopeBoundsM(0.6, 0.72, 0.5, null);
    const snapped = snapToMountRule(
      {
        id: "a",
        tipo: "L",
        productType: "L",
        mountSlot: "DIR",
        partIndex: 1,
        width: 720,
        height: REMATE_L_STRIP_WIDTH_MM,
        depth: 19,
        materialPresetId: "m",
        position: { xMm: 0, yMm: 0, zMm: 0 },
        rotation: { xRad: 0, yRad: 0, zRad: 0 },
        followBox: true,
        name: "A",
      },
      bounds
    );
    expect(Math.abs(snapped.position.xMm)).toBeLessThan(2000);
    expect(Math.abs(snapped.position.yMm)).toBeLessThan(2000);
    expect(Math.abs(snapped.position.zMm)).toBeLessThan(2000);
  });

  it("peças A e B ficam no canto em L (centros distintos e próximos)", () => {
    const bounds = getRemateEnvelopeBoundsM(0.6, 0.72, 0.5, null);
    const pieceA = {
      width: 720,
      height: REMATE_L_STRIP_WIDTH_MM,
      depth: 19,
      mountSlot: "DIR" as const,
      partIndex: 1 as const,
    };
    const pieceB = {
      width: 600,
      height: REMATE_L_STRIP_WIDTH_MM,
      depth: 19,
      mountSlot: "FRENTE" as const,
      partIndex: 2 as const,
    };
    const centerA = computeLRemateCenterM(pieceA, bounds);
    const centerB = computeLRemateCenterM(pieceB, bounds);
    expect(centerA.x).not.toBeCloseTo(centerB.x, 2);
    expect(centerA.y).not.toBeCloseTo(centerB.y, 2);
    const dist = Math.hypot(centerA.x - centerB.x, centerA.y - centerB.y, centerA.z - centerB.z);
    expect(dist).toBeGreaterThan(0.05);
    expect(dist).toBeLessThan(2);
  });
});
