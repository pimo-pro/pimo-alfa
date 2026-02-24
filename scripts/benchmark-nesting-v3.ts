import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cutlistToPieces, runCutLayout } from "../src/core/cutlayout/cutLayoutEngine";
import type { CutLayoutResult } from "../src/core/cutlayout/cutLayoutTypes";

type Scenario = {
  name: string;
  sheet: { largura_mm: number; altura_mm: number; espessura_mm: number };
  items: Array<{ nome: string; boxId: string; largura: number; altura: number; esp: number; qty: number }>;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "cnc-examples-output");
const OUT_JSON = join(OUT_DIR, "NESTING_V32_BENCHMARK_REPORT.json");
const OUT_TXT = join(OUT_DIR, "NESTING_V32_BENCHMARK_REPORT.txt");

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

function toMetrics(result: CutLayoutResult) {
  const totalSheets = result.sheets.length;
  const totalSheetArea = result.sheets.reduce((acc, s) => acc + s.sheet.largura_mm * s.sheet.altura_mm, 0);
  const totalUsedArea = result.sheets.reduce(
    (acc, s) => acc + s.placements.reduce((inner, p) => inner + p.largura_mm * p.altura_mm, 0),
    0
  );
  const wasteArea = Math.max(0, totalSheetArea - totalUsedArea);
  const usefulLeftoverArea =
    result.diagnostics?.trialRuns?.find(
      (t) => t.strategy === result.diagnostics?.flow.selectedStrategy && t.binHeuristic === result.diagnostics?.flow.selectedBinHeuristic
    )?.usefulLeftoverArea ?? 0;
  const score =
    result.diagnostics?.trialRuns?.find(
      (t) => t.strategy === result.diagnostics?.flow.selectedStrategy && t.binHeuristic === result.diagnostics?.flow.selectedBinHeuristic
    )?.score ?? wasteArea + totalSheets * 1_000_000;
  const legacyComparableScore = totalSheets * 1_000_000 + wasteArea - usefulLeftoverArea * 0.1;
  return { totalSheets, totalUsedArea, wasteArea, usefulLeftoverArea, score, legacyComparableScore };
}

function compactnessFromResult(result: CutLayoutResult): number {
  if (result.sheets.length === 0) return 0;
  const values = result.sheets.map((s) => {
    if (s.placements.length === 0) return 0;
    const minX = Math.min(...s.placements.map((p) => p.x_mm));
    const minY = Math.min(...s.placements.map((p) => p.y_mm));
    const maxX = Math.max(...s.placements.map((p) => p.x_mm + p.largura_mm));
    const maxY = Math.max(...s.placements.map((p) => p.y_mm + p.altura_mm));
    const bbox = Math.max(1, (maxX - minX) * (maxY - minY));
    const used = s.placements.reduce((acc, p) => acc + p.largura_mm * p.altura_mm, 0);
    return used / bbox;
  });
  return Number((values.reduce((a, b) => a + b, 0) / Math.max(1, values.length)).toFixed(4));
}

function pct(delta: number, base: number): number {
  if (Math.abs(base) < 0.000001) return 0;
  return Number(((delta / base) * 100).toFixed(3));
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const scenarios: Scenario[] = [buildScenarioIndustrialDense(), buildScenarioVariedCuts()];

  const outputs = scenarios.map((scenario) => {
    const items = scenario.items.map((i) => ({
      dimensoes: { largura: i.largura, altura: i.altura, profundidade: i.esp },
      espessura: i.esp,
      quantidade: i.qty,
      boxId: i.boxId,
      nome: i.nome,
    }));
    const pieces = cutlistToPieces(items);
    const v2 = runCutLayout(pieces, scenario.sheet, {
      groupByThicknessOnly: true,
      rotationPreferenceMode: "aggressive",
      rotationWeight: 0.8,
      rotationPenalty: 0.45,
      collectDiagnostics: true,
    });
    const v3 = runCutLayout(pieces, scenario.sheet, {
      groupByThicknessOnly: true,
      rotationPreferenceMode: "aggressive",
      rotationWeight: 0.8,
      rotationPenalty: 0.45,
      collectDiagnostics: true,
      useMetaHeuristics: true,
      metaHeuristics: {
        enabled: true,
        iterations: 30,
        initialTemperature: 1.2,
        coolingRate: 0.972,
        lnsDestroyRatio: 0.22,
        multiStartCount: 1,
      },
    });
    const v31 = runCutLayout(pieces, scenario.sheet, {
      groupByThicknessOnly: true,
      rotationPreferenceMode: "aggressive",
      rotationWeight: 0.8,
      rotationPenalty: 0.45,
      collectDiagnostics: true,
      useMetaHeuristics: true,
      metaHeuristics: {
        enabled: true,
        iterations: 24,
        initialTemperature: 1.3,
        coolingRate: 0.975,
        lnsDestroyRatio: 0.26,
        multiStartCount: 3,
        seedBase: 20260301,
      },
    });
    const v32 = runCutLayout(pieces, scenario.sheet, {
      groupByThicknessOnly: true,
      rotationPreferenceMode: "aggressive",
      rotationWeight: 0.8,
      rotationPenalty: 0.45,
      collectDiagnostics: true,
      useMetaHeuristics: true,
      scoreModel: "v32",
      metaHeuristics: {
        enabled: true,
        iterations: 28,
        initialTemperature: 1.35,
        coolingRate: 0.976,
        lnsDestroyRatio: 0.3,
        multiStartCount: 4,
        seedBase: 20260302,
      },
    });

    const m2 = toMetrics(v2);
    const m3 = toMetrics(v3);
    const m31 = toMetrics(v31);
    const m32 = toMetrics(v32);
    const panelDelta = m2.totalSheets - m3.totalSheets;
    const wasteDelta = m2.wasteArea - m3.wasteArea;
    const usefulDelta = m3.usefulLeftoverArea - m2.usefulLeftoverArea;
    const scoreDelta = m2.legacyComparableScore - m3.legacyComparableScore;
    const panelDelta31 = m2.totalSheets - m31.totalSheets;
    const wasteDelta31 = m2.wasteArea - m31.wasteArea;
    const usefulDelta31 = m31.usefulLeftoverArea - m2.usefulLeftoverArea;
    const scoreDelta31 = m2.legacyComparableScore - m31.legacyComparableScore;
    const panelDelta32 = m2.totalSheets - m32.totalSheets;
    const wasteDelta32 = m2.wasteArea - m32.wasteArea;
    const usefulDelta32 = m32.usefulLeftoverArea - m2.usefulLeftoverArea;
    const scoreDelta32 = m2.legacyComparableScore - m32.legacyComparableScore;
    const scoreDelta32Vs31 = m31.legacyComparableScore - m32.legacyComparableScore;

    return {
      scenario: scenario.name,
      pieceCount: pieces.length,
      v2: m2,
      v3: m3,
      v31: m31,
      v32: m32,
      compactness: {
        v2: compactnessFromResult(v2),
        v3: compactnessFromResult(v3),
        v31: compactnessFromResult(v31),
        v32: compactnessFromResult(v32),
      },
      deltas: {
        panelReduction: panelDelta,
        wasteReduction: wasteDelta,
        usefulLeftoverIncrease: usefulDelta,
        scoreImprovement: scoreDelta,
        scoreImprovementPercent: pct(scoreDelta, m2.legacyComparableScore),
      },
      deltasV31: {
        panelReduction: panelDelta31,
        wasteReduction: wasteDelta31,
        usefulLeftoverIncrease: usefulDelta31,
        scoreImprovement: scoreDelta31,
        scoreImprovementPercent: pct(scoreDelta31, m2.legacyComparableScore),
      },
      deltasV32: {
        panelReduction: panelDelta32,
        wasteReduction: wasteDelta32,
        usefulLeftoverIncrease: usefulDelta32,
        scoreImprovement: scoreDelta32,
        scoreImprovementPercent: pct(scoreDelta32, m2.legacyComparableScore),
        scoreImprovementVsV31: scoreDelta32Vs31,
        scoreImprovementVsV31Percent: pct(scoreDelta32Vs31, m31.legacyComparableScore),
      },
      metaDiagnostics: v3.diagnostics?.metaHeuristics ?? null,
      metaDiagnosticsV31: v31.diagnostics?.metaHeuristics ?? null,
      metaDiagnosticsV32: v32.diagnostics?.metaHeuristics ?? null,
      v3Winner: {
        strategy: v3.diagnostics?.flow.selectedStrategy,
        binHeuristic: v3.diagnostics?.flow.selectedBinHeuristic,
      },
      v31Winner: {
        strategy: v31.diagnostics?.flow.selectedStrategy,
        binHeuristic: v31.diagnostics?.flow.selectedBinHeuristic,
      },
      v32Winner: {
        strategy: v32.diagnostics?.flow.selectedStrategy,
        binHeuristic: v32.diagnostics?.flow.selectedBinHeuristic,
      },
    };
  });

  const improvedV3 = outputs.filter((o) => o.deltas.panelReduction > 0 || o.deltas.wasteReduction > 0 || o.deltas.scoreImprovement > 0);
  const improvedV31 = outputs.filter((o) => o.deltasV31.panelReduction > 0 || o.deltasV31.wasteReduction > 0 || o.deltasV31.scoreImprovement > 0);
  const improvedV32 = outputs.filter((o) => o.deltasV32.panelReduction > 0 || o.deltasV32.wasteReduction > 0 || o.deltasV32.scoreImprovement > 0);
  const report = {
    title: "Nesting v3.2 Benchmark (v2 vs v3 vs v3.1 vs v3.2)",
    generatedAt: new Date().toISOString(),
    scenarios: outputs,
    summary: {
      totalScenarios: outputs.length,
      improvedScenariosV3: improvedV3.length,
      improvedScenariosV31: improvedV31.length,
      improvedScenariosV32: improvedV32.length,
      panelReductionsV31: improvedV31.filter((o) => o.deltasV31.panelReduction > 0).map((o) => ({
        scenario: o.scenario,
        panelReduction: o.deltasV31.panelReduction,
      })),
      wasteReductionsV31: improvedV31.filter((o) => o.deltasV31.wasteReduction > 0).map((o) => ({
        scenario: o.scenario,
        wasteReduction: o.deltasV31.wasteReduction,
      })),
      panelReductionsV32: improvedV32.filter((o) => o.deltasV32.panelReduction > 0).map((o) => ({
        scenario: o.scenario,
        panelReduction: o.deltasV32.panelReduction,
      })),
      wasteReductionsV32: improvedV32.filter((o) => o.deltasV32.wasteReduction > 0).map((o) => ({
        scenario: o.scenario,
        wasteReduction: o.deltasV32.wasteReduction,
      })),
    },
  };

  await writeFile(OUT_JSON, JSON.stringify(report, null, 2), "utf8");

  const lines: string[] = [];
  lines.push("BENCHMARK NESTING V3.2 (v2 vs v3 vs v3.1 vs v3.2)");
  for (const o of outputs) {
    lines.push("");
    lines.push(`[${o.scenario}] peças=${o.pieceCount}`);
    lines.push(`v2: chapas=${o.v2.totalSheets} desperdício=${o.v2.wasteArea} sobra_útil=${o.v2.usefulLeftoverArea} score=${o.v2.legacyComparableScore}`);
    lines.push(`v3: chapas=${o.v3.totalSheets} desperdício=${o.v3.wasteArea} sobra_útil=${o.v3.usefulLeftoverArea} score=${o.v3.legacyComparableScore}`);
    lines.push(`v3.1: chapas=${o.v31.totalSheets} desperdício=${o.v31.wasteArea} sobra_útil=${o.v31.usefulLeftoverArea} score=${o.v31.legacyComparableScore}`);
    lines.push(`v3.2: chapas=${o.v32.totalSheets} desperdício=${o.v32.wasteArea} sobra_útil=${o.v32.usefulLeftoverArea} score_legacy=${o.v32.legacyComparableScore} score_v32=${o.v32.score}`);
    lines.push(`compactação intra-chapa: v2=${o.compactness.v2} v3=${o.compactness.v3} v3.1=${o.compactness.v31} v3.2=${o.compactness.v32}`);
    lines.push(`delta v3: chapas=${o.deltas.panelReduction} desperdício=${o.deltas.wasteReduction} sobra_útil=${o.deltas.usefulLeftoverIncrease} score=${o.deltas.scoreImprovement} (${o.deltas.scoreImprovementPercent}%)`);
    lines.push(`delta v3.1: chapas=${o.deltasV31.panelReduction} desperdício=${o.deltasV31.wasteReduction} sobra_útil=${o.deltasV31.usefulLeftoverIncrease} score=${o.deltasV31.scoreImprovement} (${o.deltasV31.scoreImprovementPercent}%)`);
    lines.push(`delta v3.2: chapas=${o.deltasV32.panelReduction} desperdício=${o.deltasV32.wasteReduction} sobra_útil=${o.deltasV32.usefulLeftoverIncrease} score=${o.deltasV32.scoreImprovement} (${o.deltasV32.scoreImprovementPercent}%) vs v3.1=${o.deltasV32.scoreImprovementVsV31} (${o.deltasV32.scoreImprovementVsV31Percent}%)`);
    if (o.metaDiagnostics) {
      lines.push(
        `meta: iterações=${o.metaDiagnostics.iterations} melhor=${o.metaDiagnostics.bestScore} inicial=${o.metaDiagnostics.initialScore} melhoria=${o.metaDiagnostics.improvementPercent}%`
      );
    }
    if (o.metaDiagnosticsV31) {
      lines.push(
        `meta v3.1: inits=${o.metaDiagnosticsV31.initialSolutions} iterações=${o.metaDiagnosticsV31.iterations} melhor=${o.metaDiagnosticsV31.bestScore} inicial=${o.metaDiagnosticsV31.initialScore} melhoria=${o.metaDiagnosticsV31.improvementPercent}% seed=${o.metaDiagnosticsV31.winningSeed} estratégia=${o.metaDiagnosticsV31.winningStrategy}+${o.metaDiagnosticsV31.winningBinHeuristic}`
      );
    }
    if (o.metaDiagnosticsV32) {
      lines.push(
        `meta v3.2: inits=${o.metaDiagnosticsV32.initialSolutions} iterações=${o.metaDiagnosticsV32.iterations} melhor=${o.metaDiagnosticsV32.bestScore} inicial=${o.metaDiagnosticsV32.initialScore} melhoria=${o.metaDiagnosticsV32.improvementPercent}% seed=${o.metaDiagnosticsV32.winningSeed} estratégia=${o.metaDiagnosticsV32.winningStrategy}+${o.metaDiagnosticsV32.winningBinHeuristic}`
      );
      lines.push(
        `meta v3.2 detalhes: hullWasteBySheet=${(o.metaDiagnosticsV32.convexHullWasteBySheet ?? []).map((n) => Number(n.toFixed(4))).join(",")} fragmentation=${o.metaDiagnosticsV32.fragmentationScore ?? 0} pockets=${o.metaDiagnosticsV32.pocketsCount ?? 0} linearGap=${o.metaDiagnosticsV32.linearGapScore ?? 0} compactness=${o.metaDiagnosticsV32.compactnessScore ?? 0} melhoriaVsV31=${o.deltasV32.scoreImprovementVsV31Percent}%`
      );
    }
  }
  lines.push("");
  lines.push(`Cenários com melhoria v3: ${improvedV3.length}/${outputs.length}`);
  lines.push(`Cenários com melhoria v3.1: ${improvedV31.length}/${outputs.length}`);
  lines.push(`Cenários com melhoria v3.2: ${improvedV32.length}/${outputs.length}`);
  await writeFile(OUT_TXT, lines.join("\n"), "utf8");
  console.log("Benchmark v3.2 JSON:", OUT_JSON);
  console.log("Benchmark v3.2 TXT:", OUT_TXT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

