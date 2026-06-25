/**
 * Relatório comparativo Fase B — vs Fase A (cutlayout).
 */

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cutlistToPieces, runCutLayout } from "../src/core/cutlayout/cutLayoutEngine";
import { computeSolutionMetrics } from "../src/core/cutlayout/scoring/solutionMetrics";
import { estimateUsefulLeftover } from "../src/core/cutlayout/utils/cutLayoutUtils";
import { computeSheetAdvancedMetrics } from "../src/core/cutlayout/scoring/advancedMetrics";
import {
  rectArea,
  rectIntersectArea,
  monotonicHull,
  polygonArea,
} from "../src/core/cutlayout/utils/cutLayoutGeometry";
import type { CutLayoutResult } from "../src/core/cutlayout/cutLayoutTypes";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "cnc-examples-output");
const BEFORE_JSON = join(OUT_DIR, "PHASE_B_BEFORE.json");
const OUT_JSON = join(OUT_DIR, "PHASE_B_COMPARISON_REPORT.json");
const OUT_TXT = join(OUT_DIR, "PHASE_B_COMPARISON_REPORT.txt");

type Scenario = {
  name: string;
  sheet: { largura_mm: number; altura_mm: number; espessura_mm: number };
  items: Array<{ nome: string; boxId: string; largura: number; altura: number; esp: number; qty: number }>;
};

function buildScenarioIndustrialDense(): Scenario {
  return {
    name: "INDUSTRIAL_DENSE",
    sheet: { largura_mm: 2750, altura_mm: 1830, espessura_mm: 19 },
    items: [
      { nome: "Lateral longa", boxId: "IND", largura: 2100, altura: 520, esp: 19, qty: 10 },
      { nome: "Prateleira", boxId: "IND", largura: 950, altura: 420, esp: 19, qty: 22 },
      { nome: "Travessa", boxId: "IND", largura: 780, altura: 180, esp: 19, qty: 40 },
      { nome: "Fundo módulo", boxId: "IND", largura: 620, altura: 480, esp: 19, qty: 18 },
      { nome: "Porta", boxId: "IND", largura: 520, altura: 720, esp: 19, qty: 16 },
      { nome: "Reforço", boxId: "IND", largura: 360, altura: 240, esp: 19, qty: 36 },
    ],
  };
}

function buildScenarioVariedCuts(): Scenario {
  return {
    name: "VARIED_CUTS",
    sheet: { largura_mm: 2750, altura_mm: 1830, espessura_mm: 19 },
    items: [
      { nome: "Topo", boxId: "VAR", largura: 1600, altura: 560, esp: 19, qty: 8 },
      { nome: "Base", boxId: "VAR", largura: 1450, altura: 510, esp: 19, qty: 8 },
      { nome: "Divisória", boxId: "VAR", largura: 1020, altura: 280, esp: 19, qty: 22 },
      { nome: "Prateleira curta", boxId: "VAR", largura: 740, altura: 310, esp: 19, qty: 24 },
      { nome: "Fecho", boxId: "VAR", largura: 430, altura: 160, esp: 19, qty: 52 },
      { nome: "Placa técnica", boxId: "VAR", largura: 380, altura: 360, esp: 19, qty: 28 },
    ],
  };
}

const METRICS_DEPS = {
  estimateUsefulLeftover,
  computeSheetAdvancedMetrics: (
    sheet: Parameters<typeof computeSheetAdvancedMetrics>[0],
    placements: Parameters<typeof computeSheetAdvancedMetrics>[1]
  ) => computeSheetAdvancedMetrics(sheet, placements, { rectArea, rectIntersectArea, monotonicHull, polygonArea }),
};

function countLargePockets(result: CutLayoutResult, minW = 150, minH = 150): number {
  let count = 0;
  for (const s of result.sheets) {
    const W = s.sheet.largura_mm;
    const H = s.sheet.altura_mm;
    const rects = s.placements.map((p) => ({
      x: p.x_mm,
      y: p.y_mm,
      w: p.largura_mm,
      h: p.altura_mm,
    }));
    const xs = [0, ...rects.map((r) => r.x + r.w)];
    const ys = [0, ...rects.map((r) => r.y + r.h)];
    for (const ox of xs) {
      for (const oy of ys) {
        if (ox + minW > W || oy + minH > H) continue;
        const blocked = rects.some(
          (r) => r.x < ox + 1 && r.x + r.w > ox && r.y < oy + 1 && r.y + r.h > oy
        );
        if (blocked) continue;
        let maxW = W - ox;
        let maxH = H - oy;
        for (const r of rects) {
          if (r.y + r.h > oy && r.y < oy + minH && r.x > ox) maxW = Math.min(maxW, r.x - ox);
          if (r.x + r.w > ox && r.x < ox + maxW && r.y > oy) maxH = Math.min(maxH, r.y - oy);
        }
        if (maxW >= minW && maxH >= minH) count++;
      }
    }
  }
  return count;
}

function runScenario(scenario: Scenario) {
  const items = scenario.items.map((i) => ({
    dimensoes: { largura: i.largura, altura: i.altura, profundidade: i.esp },
    espessura: i.esp,
    quantidade: i.qty,
    boxId: i.boxId,
    nome: i.nome,
  }));
  const pieces = cutlistToPieces(items);
  const t0 = performance.now();
  const result = runCutLayout(pieces, scenario.sheet, {
    groupByThicknessOnly: true,
    rotationPreferenceMode: "aggressive",
    rotationWeight: 0.8,
    rotationPenalty: 0.45,
    collectDiagnostics: true,
    scoreModel: "v32",
  });
  const elapsedMs = performance.now() - t0;
  const metrics = computeSolutionMetrics(result.sheets, scenario.sheet, "v32", METRICS_DEPS);
  return {
    totalSheets: result.sheets.length,
    wasteArea: metrics.wasteArea,
    usedArea: metrics.usedArea,
    pocketsCount: metrics.advanced.pocketsCountTotal,
    fragmentationScore: metrics.advanced.fragmentationScoreTotal,
    largePockets150: countLargePockets(result),
    elapsedMs: Number(elapsedMs.toFixed(1)),
    strategy: result.diagnostics?.flow.selectedStrategy,
    binHeuristic: result.diagnostics?.flow.selectedBinHeuristic,
  };
}

function pct(delta: number, base: number): string {
  if (Math.abs(base) < 1e-6) return "0%";
  return `${((delta / base) * 100).toFixed(2)}%`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const beforeRaw = JSON.parse(await readFile(BEFORE_JSON, "utf8")) as {
    comparisons: Array<{
      scenario: string;
      after: {
        totalSheets: number;
        wasteArea: number;
        pocketsCount: number;
        fragmentationScore: number;
        largePockets150: number;
        elapsedMs: number;
      };
    }>;
  };

  const scenarios = [buildScenarioIndustrialDense(), buildScenarioVariedCuts()];
  const comparisons = scenarios.map((scenario) => {
    const beforeRow = beforeRaw.comparisons.find((s) => s.scenario === scenario.name);
    const before = beforeRow?.after ?? {
      totalSheets: 0,
      wasteArea: 0,
      pocketsCount: 0,
      fragmentationScore: 0,
      largePockets150: 0,
      elapsedMs: 0,
    };
    const after = runScenario(scenario);
    return {
      scenario: scenario.name,
      beforePhaseA: before,
      afterPhaseB: after,
      delta: {
        sheets: before.totalSheets - after.totalSheets,
        wasteArea: before.wasteArea - after.wasteArea,
        wastePercent: pct(before.wasteArea - after.wasteArea, before.wasteArea),
        pockets: before.pocketsCount - after.pocketsCount,
        fragmentation: Number((before.fragmentationScore - after.fragmentationScore).toFixed(4)),
        largePockets150: before.largePockets150 - after.largePockets150,
        elapsedMs: Number((after.elapsedMs - before.elapsedMs).toFixed(1)),
      },
    };
  });

  const report = {
    title: "Fase B — Comparação vs Fase A (cutlayout)",
    generatedAt: new Date().toISOString(),
    changes: [
      "B1 Residual rectangle scan",
      "B2 Lookahead 1-pass (top 3)",
      "B3 Pair packing virtual",
      "B4 Micro-placement 5mm grid",
    ],
    comparisons,
    summary: {
      totalSheetReduction: comparisons.reduce((a, c) => a + c.delta.sheets, 0),
      totalWasteReduction: comparisons.reduce((a, c) => a + c.delta.wasteArea, 0),
      totalPocketReduction: comparisons.reduce((a, c) => a + c.delta.pockets, 0),
      avgElapsedDeltaMs: Number(
        (comparisons.reduce((a, c) => a + c.delta.elapsedMs, 0) / Math.max(1, comparisons.length)).toFixed(1)
      ),
    },
  };

  const lines: string[] = [
    report.title,
    `Gerado: ${report.generatedAt}`,
    "",
    ...comparisons.flatMap((c) => [
      `=== ${c.scenario} ===`,
      `Chapas:        ${c.beforePhaseA.totalSheets} → ${c.afterPhaseB.totalSheets} (Δ ${c.delta.sheets})`,
      `Desperdício:   ${c.beforePhaseA.wasteArea} → ${c.afterPhaseB.wasteArea} mm² (${c.delta.wastePercent})`,
      `Pockets grid:  ${c.beforePhaseA.pocketsCount} → ${c.afterPhaseB.pocketsCount} (Δ ${c.delta.pockets})`,
      `Pockets ≥150:  ${c.beforePhaseA.largePockets150} → ${c.afterPhaseB.largePockets150} (Δ ${c.delta.largePockets150})`,
      `Fragmentação:  ${c.beforePhaseA.fragmentationScore.toFixed(4)} → ${c.afterPhaseB.fragmentationScore.toFixed(4)} (Δ ${c.delta.fragmentation})`,
      `Tempo:         ${c.beforePhaseA.elapsedMs} → ${c.afterPhaseB.elapsedMs} ms (Δ ${c.delta.elapsedMs >= 0 ? "+" : ""}${c.delta.elapsedMs} ms)`,
      "",
    ]),
    "--- Resumo ---",
    `Redução total chapas: ${report.summary.totalSheetReduction}`,
    `Redução total desperdício: ${report.summary.totalWasteReduction} mm²`,
    `Redução pockets (grid): ${report.summary.totalPocketReduction}`,
    `Δ tempo médio: ${report.summary.avgElapsedDeltaMs} ms`,
  ];

  await writeFile(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUT_TXT, lines.join("\n"), "utf8");
  console.log(lines.join("\n"));
  console.log(`\nJSON: ${OUT_JSON}`);
  console.log(`TXT:  ${OUT_TXT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
