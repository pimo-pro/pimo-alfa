/**
 * Regressóo de desempenho: resultados industriais estáveis após memo/validateAll.
 */

import { describe, expect, it, vi } from "vitest";
import * as flags from "../../drawerSystemFlags";
import { clearAllEuropeanMemos, memo } from "../perf/memo";
import { generateEuropeanDrawer } from "../index";
import { ALL_SCENARIOS, runStressTests, buildQaSummary } from "../qa";

function industrialFingerprint(result: ReturnType<typeof generateEuropeanDrawer>) {
  return JSON.stringify({
    valid: result.valid,
    runner: result.geometry.runnerDepthMm,
    body: result.geometry.bodyDepthMm,
    external: result.geometry.externalWidthMm,
    front: {
      w: result.geometry.front.widthMm,
      h: result.geometry.front.heightMm,
      t: result.geometry.front.thicknessMm,
    },
    cutlist: result.cutlist.map((i) => ({
      codigo: i.codigo,
      tipo: i.tipo,
      mat: i.material,
      L: i.larguraMm,
      A: i.alturaMm,
      E: i.espessuraMm,
    })),
    holes: result.holes.map((h) => ({
      ref: h.pieceRef,
      x: h.x,
      y: h.y,
      d: h.diameter,
      depth: h.depth,
      t: h.holeType,
    })),
    pdfPieces: result.pdf.pieceRows.map((p) => ({ n: p.nome, d: p.dims, m: p.material })),
    viewerN: result.viewer.drawers.length,
  });
}

describe("european/perf — regressóo transparente", () => {
  it("memo devolve o mesmo valor para os mesmos args", () => {
    clearAllEuropeanMemos();
    let calls = 0;
    const fn = memo((a: number, b: number) => {
      calls += 1;
      return a + b;
    });
    expect(fn(1, 2)).toBe(3);
    expect(fn(1, 2)).toBe(3);
    expect(calls).toBe(1);
    expect(fn(2, 2)).toBe(4);
    expect(calls).toBe(2);
  });

  it("generateEuropeanDrawer — estável entre duas chamadas (cache hit)", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    clearAllEuropeanMemos();
    const box = {
      id: "perf1",
      nome: "PERF",
      dimensoes: { largura: 538, altura: 720, profundidade: 560 },
      espessura: 19,
      gavetas: 1,
      material: "mdf_branco",
      profundidadeInternaUtilMm: 500,
    };
    const a = generateEuropeanDrawer("hettich-innotech-atira", box, {
      systemId: "hettich-innotech-atira",
      heightMm: 144,
      depthMm: 450,
      softClose: true,
      pushOpen: false,
      count: 1,
      frontMaterialId: "carvalho",
    });
    const b = generateEuropeanDrawer("hettich-innotech-atira", box, {
      systemId: "hettich-innotech-atira",
      heightMm: 144,
      depthMm: 450,
      softClose: true,
      pushOpen: false,
      count: 1,
      frontMaterialId: "carvalho",
    });
    expect(a.valid).toBe(true);
    expect(industrialFingerprint(a)).toBe(industrialFingerprint(b));
    vi.restoreAllMocks();
  });

  it("mudança só de material da frente não altera geometria/furos/corpo cutlist", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    clearAllEuropeanMemos();
    const box = {
      id: "perf2",
      nome: "PERF2",
      dimensoes: { largura: 538, altura: 720, profundidade: 560 },
      espessura: 19,
      gavetas: 1,
      material: "mdf_branco",
      profundidadeInternaUtilMm: 500,
    };
    const baseCfg = {
      systemId: "hettich-innotech-atira" as const,
      heightMm: 144,
      depthMm: 450,
      softClose: true,
      pushOpen: false,
      count: 1,
    };
    const a = generateEuropeanDrawer("hettich-innotech-atira", box, {
      ...baseCfg,
      frontMaterialId: "mdf_branco",
    });
    const b = generateEuropeanDrawer("hettich-innotech-atira", box, {
      ...baseCfg,
      frontMaterialId: "carvalho",
    });
    expect(a.geometry.runnerDepthMm).toBe(b.geometry.runnerDepthMm);
    expect(a.geometry.bodyDepthMm).toBe(b.geometry.bodyDepthMm);
    expect(a.geometry.externalWidthMm).toBe(b.geometry.externalWidthMm);
    expect(JSON.stringify(a.holes)).toBe(JSON.stringify(b.holes));
    const bodyA = a.cutlist.filter((i) => i.tipo !== "gaveta_frente");
    const bodyB = b.cutlist.filter((i) => i.tipo !== "gaveta_frente");
    expect(
      bodyA.map((i) => ({ c: i.codigo, L: i.larguraMm, E: i.espessuraMm, m: i.material }))
    ).toEqual(
      bodyB.map((i) => ({ c: i.codigo, L: i.larguraMm, E: i.espessuraMm, m: i.material }))
    );
    const frontA = a.cutlist.find((i) => i.tipo === "gaveta_frente");
    const frontB = b.cutlist.find((i) => i.tipo === "gaveta_frente");
    expect(frontA?.material).toBe("mdf_branco");
    expect(frontB?.material).toBe("carvalho");
    vi.restoreAllMocks();
  });

  it("Auto QA amostra (40) sem crashes após otimização", async () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    clearAllEuropeanMemos();
    const sample = ALL_SCENARIOS.slice(0, 40);
    const results = await runStressTests({ scenarios: sample, yieldEvery: 5 });
    expect(results).toHaveLength(40);
    const summary = buildQaSummary(results);
    expect(summary.ran).toBe(40);
    expect(summary.skipped).toBe(0);
    vi.restoreAllMocks();
  });
});
