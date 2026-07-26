import { describe, it, expect } from "vitest";
import {
  detectBoxJoints,
  quantidadeParafuso4x35PorAltura,
  quantidadeParafuso4x35PorRemate,
  quantidadeParafuso4x35JuntasTotal,
  quantidadeParafuso5x50ParaCaixa,
  quantidadePuxa8mmParaCaixa,
  aggregateParafuso4x35FromProject,
  aggregateParafuso5x50FromBoxes,
  aggregatePuxa8mmFromBoxes,
  PARAFUSO_4X35_PRECO,
  PARAFUSO_5X50_PRECO,
  PUXA_8MM_PRECO,
} from "./freeagemParafusos";
import type { BoxModule } from "../types";
import type { RematePiece } from "../remate/rematePieceTypes";

function box(
  id: string,
  opts: {
    w: number;
    h: number;
    d?: number;
    x?: number;
    y?: number;
    z?: number;
    cabinetType?: "lower" | "upper";
    feetEnabled?: boolean;
    nome?: string;
  }
): BoxModule & { posicaoX_mm: number; posicaoY_mm: number; posicaoZ_mm: number } {
  return {
    id,
    nome: opts.nome ?? id,
    cabinetType: opts.cabinetType ?? "lower",
    feetEnabled: opts.feetEnabled,
    dimensoes: { largura: opts.w, altura: opts.h, profundidade: opts.d ?? 560 },
    posicaoX_mm: opts.x ?? 0,
    posicaoY_mm: opts.y ?? opts.h / 2,
    posicaoZ_mm: opts.z ?? 0,
  } as BoxModule & { posicaoX_mm: number; posicaoY_mm: number; posicaoZ_mm: number };
}

describe("freeagemParafusos", () => {
  it("juntas: 2 caixas lado a lado = 4 parafusos", () => {
    const a = box("a", { w: 600, h: 720, x: 0 });
    const b = box("b", { w: 600, h: 720, x: 600 }); // faces touch at x=300
    expect(detectBoxJoints([a, b])).toHaveLength(1);
    expect(quantidadeParafuso4x35JuntasTotal([a, b])).toBe(4);
  });

  it("juntas: 3 caixas lado a lado = 8 (2 juntas x 4)", () => {
    const a = box("a", { w: 600, h: 720, x: 0 });
    const b = box("b", { w: 600, h: 720, x: 600 });
    const c = box("c", { w: 600, h: 720, x: 1200 });
    expect(detectBoxJoints([a, b, c])).toHaveLength(2);
    expect(quantidadeParafuso4x35JuntasTotal([a, b, c])).toBe(8);
  });

  it("juntas: 2 empilhadas = 4", () => {
    const a = box("a", { w: 600, h: 720, y: 360 });
    const b = box("b", { w: 600, h: 720, y: 360 + 720 });
    expect(detectBoxJoints([a, b])[0]?.kind).toBe("stacked");
    expect(quantidadeParafuso4x35JuntasTotal([a, b])).toBe(4);
  });

  it("juntas L: empilhadas + ao lado = 8", () => {
    const base = box("base", { w: 600, h: 720, x: 0, y: 360 });
    const top = box("top", { w: 600, h: 720, x: 0, y: 360 + 720 });
    const side = box("side", { w: 600, h: 720, x: 600, y: 360 });
    expect(detectBoxJoints([base, top, side])).toHaveLength(2);
    expect(quantidadeParafuso4x35JuntasTotal([base, top, side])).toBe(8);
  });

  it("altura: >1000 base 4; +400mm; >1500 +6", () => {
    expect(quantidadeParafuso4x35PorAltura(1000)).toBe(0);
    expect(quantidadeParafuso4x35PorAltura(1001)).toBe(4);
    expect(quantidadeParafuso4x35PorAltura(1400)).toBe(5);
    expect(quantidadeParafuso4x35PorAltura(1600)).toBe(4 + 1 + 6); // 11
  });

  it("remate: ceil(L/700)*2", () => {
    expect(quantidadeParafuso4x35PorRemate({ width: 700 } as RematePiece)).toBe(2);
    expect(quantidadeParafuso4x35PorRemate({ width: 701 } as RematePiece)).toBe(4);
    expect(quantidadeParafuso4x35PorRemate({ width: 1400 } as RematePiece)).toBe(4);
    expect(quantidadeParafuso4x35PorRemate({ width: 100, visible: false } as RematePiece)).toBe(0);
  });

  it("aggregate 4x35 soma juntas+altura+remates", () => {
    const a = box("a", { w: 600, h: 1600, x: 0 });
    const b = box("b", { w: 600, h: 720, x: 600 });
    const remates = [{ id: "r1", width: 700, height: 100, depth: 19, tipo: "DIR", position: { xMm: 0, yMm: 0, zMm: 0 }, rotation: { xRad: 0, yRad: 0, zRad: 0 }, followBox: true, name: "r", materialPresetId: "m" }] as RematePiece[];
    const rows = aggregateParafuso4x35FromProject([a, b], remates);
    // juntas 4 + altura a=11 + remate 2 = 17
    expect(rows[0]?.quantidade).toBe(17);
    expect(rows[0]?.precoUnitario).toBe(PARAFUSO_4X35_PRECO);
  });

  it("5x50: upper base 3; largura >500 +1/400mm; puxa 1:1", () => {
    const u = box("u", { w: 600, h: 720, cabinetType: "upper" });
    // 3 + floor((600-500)/400)=3+0=3
    expect(quantidadeParafuso5x50ParaCaixa(u)).toBe(3);
    const wide = box("w", { w: 1300, h: 720, cabinetType: "upper" });
    // 3 + floor(800/400)=3+2=5
    expect(quantidadeParafuso5x50ParaCaixa(wide)).toBe(5);
    expect(quantidadePuxa8mmParaCaixa(wide)).toBe(5);
    const lower = box("l", { w: 600, h: 720, cabinetType: "lower", feetEnabled: true });
    expect(quantidadeParafuso5x50ParaCaixa(lower)).toBe(0);
  });

  it("aggregate 5x50 e puxa totais", () => {
    const boxes = [
      box("u1", { w: 600, h: 720, cabinetType: "upper" }),
      box("u2", { w: 1300, h: 720, cabinetType: "upper" }),
    ];
    expect(aggregateParafuso5x50FromBoxes(boxes)[0]?.quantidade).toBe(3 + 5);
    expect(aggregatePuxa8mmFromBoxes(boxes)[0]?.quantidade).toBe(8);
    expect(aggregatePuxa8mmFromBoxes(boxes)[0]?.precoUnitario).toBe(PUXA_8MM_PRECO);
    expect(aggregateParafuso5x50FromBoxes(boxes)[0]?.precoUnitario).toBe(PARAFUSO_5X50_PRECO);
  });
});
