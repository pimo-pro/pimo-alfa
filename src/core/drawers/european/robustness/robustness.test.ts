/**
 * Testes de robustez — proteção transparente sem alterar resultados válidos.
 */

import { describe, expect, it, vi } from "vitest";
import * as flags from "../../drawerSystemFlags";
import {
  clearRobustDebugLog,
  ensureConfigSafe,
  ensureFiniteNumber,
  ensureNonNegative,
  sanitizeCutlist,
  sanitizeHoles,
  sanitizePdfSection,
} from "./index";
import { generateEuropeanDrawer } from "../index";
import { ALL_SCENARIOS, runStressTests, buildQaSummary } from "../qa";
import type { DrawerCutlistItem, EuropeanDrawerHole, DrawerPDFSection } from "../types";

describe("european/robustness", () => {
  it("ensureFiniteNumber / ensureNonNegative nunca devolvem NaN/Infinity/negativos", () => {
    expect(ensureFiniteNumber(NaN, "t")).toBe(0);
    expect(ensureFiniteNumber(Infinity, "t")).toBe(0);
    expect(ensureFiniteNumber("x", "t", 5)).toBe(5);
    expect(ensureNonNegative(-3, "t")).toBe(0);
    expect(ensureNonNegative(12.5, "t")).toBe(12.5);
  });

  it("sanitizeHoles omite furos inválidos e mantém válidos", () => {
    const holes: EuropeanDrawerHole[] = [
      { x: 10, y: 20, z: 0, diameter: 5, depth: 12, holeType: "corredica", face: "A", pieceRef: "front" },
      { x: NaN, y: 20, z: 0, diameter: 5, depth: 12, holeType: "corredica", face: "A", pieceRef: "front" },
      { x: 10, y: 20, z: 0, diameter: 0, depth: 12, holeType: "corredica", face: "A", pieceRef: "front" },
    ];
    const out = sanitizeHoles(holes);
    expect(out).toHaveLength(1);
    expect(out[0]!.x).toBe(10);
  });

  it("sanitizeCutlist omite madeira com dims ?0", () => {
    const items: DrawerCutlistItem[] = [
      {
        id: "ok",
        nome: "gaveta frente",
        codigo: "gav_fren",
        quantidade: 1,
        larguraMm: 400,
        alturaMm: 140,
        profundidadeMm: 19,
        espessuraMm: 19,
        material: "mdf",
        kind: "wood",
        tipo: "gaveta_frente",
      },
      {
        id: "bad",
        nome: "bad",
        quantidade: 1,
        larguraMm: 0,
        alturaMm: 100,
        profundidadeMm: 16,
        espessuraMm: 16,
        material: "mdf",
        kind: "wood",
        tipo: "gaveta_lat_esq",
      },
    ];
    const out = sanitizeCutlist(items);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe("ok");
  });

  it("sanitizePdfSection remove linhas com NaN", () => {
    const section: DrawerPDFSection = {
      title: "T",
      measureRows: [
        { label: "A", value: "10 mm" },
        { label: "B", value: "NaN mm" },
      ],
      pieceRows: [{ nome: "p", qty: "1", dims: "10 x 10 x 10", material: "m" }],
      holeRows: [],
      notes: [],
      explodedViewNotes: [],
    };
    const out = sanitizePdfSection(section);
    expect(out.measureRows).toHaveLength(1);
    expect(out.pieceRows).toHaveLength(1);
  });

  it("ensureConfigSafe normaliza runner/count sem throw", () => {
    const cfg = ensureConfigSafe({
      systemId: "hettich-innotech-atira",
      heightMm: NaN as unknown as number,
      depthMm: 9999,
      softClose: true,
      pushOpen: false,
      count: 99,
    });
    expect(Number.isFinite(cfg.heightMm)).toBe(true);
    expect(cfg.count).toBeLessThanOrEqual(8);
    expect(cfg.depthMm).toBeLessThanOrEqual(600);
  });

  it("cenário válido: fingerprint industrial estável (sem alteração de resultado)", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    clearRobustDebugLog();
    const box = {
      id: "rob1",
      nome: "ROB",
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
    expect(a.valid).toBe(true);
    expect(a.geometry.externalWidthMm).toBe(486);
    expect(a.geometry.bodyDepthMm).toBe(440);
    expect(a.cutlist.some((i) => i.codigo === "gav_fren" || i.codigo?.includes("fren"))).toBe(true);
    expect(a.holes.every((h) => Number.isFinite(h.x) && Number.isFinite(h.y))).toBe(true);
    expect(a.cutlist.filter((i) => i.kind === "wood").every((i) => i.larguraMm > 0 || i.tipo === "gaveta_corpo")).toBe(
      true
    );
    vi.restoreAllMocks();
  });

  it("Auto QA amostra: 0 crashes / 0 NaN emitidos", async () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    const sample = ALL_SCENARIOS.slice(0, 30);
    const results = await runStressTests({ scenarios: sample, yieldEvery: 5 });
    expect(results).toHaveLength(30);
    for (const r of results) {
      if (r.skipped) continue;
      if (r.runnerDepthMm != null) expect(Number.isFinite(r.runnerDepthMm)).toBe(true);
      if (r.bodyDepthMm != null) expect(r.bodyDepthMm).toBeGreaterThanOrEqual(0);
      if (r.externalWidthMm != null) expect(r.externalWidthMm).toBeGreaterThanOrEqual(0);
    }
    const summary = buildQaSummary(results);
    expect(summary.skipped).toBe(0);
    vi.restoreAllMocks();
  });
});
