import { describe, it, expect } from "vitest";
import { remateGeometryExtentsM } from "./remateGeometryExtents";

describe("remateGeometryExtentsM", () => {
  it("FRENTE mantém width×height×depth directo", () => {
    const ext = remateGeometryExtentsM({
      width: 620,
      height: 780,
      depth: 19,
      mountSlot: "FRENTE",
      tipo: "FRENTE",
    });
    expect(ext.w).toBeCloseTo(0.62);
    expect(ext.h).toBeCloseTo(0.78);
    expect(ext.d).toBeCloseTo(0.019);
  });

  it("RODAPE FUNDO usa altura vertical e espessura em Z", () => {
    const ext = remateGeometryExtentsM({
      width: 600,
      height: 150,
      depth: 19,
      mountSlot: "FUNDO",
      tipo: "RODAPE",
    });
    expect(ext.w).toBeCloseTo(0.6);
    expect(ext.h).toBeCloseTo(0.15);
    expect(ext.d).toBeCloseTo(0.019);
  });

  it("DIR troca espessura para eixo X", () => {
    const ext = remateGeometryExtentsM({
      width: 760,
      height: 550,
      depth: 19,
      mountSlot: "DIR",
      tipo: "DIR",
    });
    expect(ext.w).toBeCloseTo(0.019);
    expect(ext.h).toBeCloseTo(0.76);
    expect(ext.d).toBeCloseTo(0.55);
  });
});
