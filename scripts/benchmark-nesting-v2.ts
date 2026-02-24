import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cutlistToPieces, runCutLayout } from "../src/core/cutlayout/cutLayoutEngine";
import type { CutLayoutResult } from "../src/core/cutlayout/cutLayoutTypes";

type ParsedPiece = {
  partName: string;
  boxId: string;
  largura_mm: number;
  altura_mm: number;
  espessura_mm: number;
};

type TrialSummary = {
  strategy: "skyline" | "shelf" | "guillotine";
  binHeuristic: "firstFit" | "bestFit";
  sheetCount: number;
  usedArea: number;
  wasteArea: number;
  usefulLeftoverArea: number;
  score: number;
};

type Metrics = {
  totalSheets: number;
  totalUsedArea: number;
  totalWasteArea: number;
  usefulLeftoverArea: number;
  utilizationPercent: number;
  selectedStrategy?: "skyline" | "shelf" | "guillotine";
  selectedBinHeuristic?: "firstFit" | "bestFit";
  selectedScore?: number;
  trialRuns: TrialSummary[];
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = join(__dirname, "cnc-examples-output", "TEST 1.txt");
const OUT_DIR = join(__dirname, "cnc-examples-output");
const REPORT_JSON = join(OUT_DIR, "TEST_1_NESTING_BENCHMARK_REPORT.json");
const REPORT_TXT = join(OUT_DIR, "TEST_1_NESTING_BENCHMARK_REPORT.txt");

function parseHeader(content: string): { dl: number; dh: number; ds: number } {
  const m = content.match(/::UNm\s+DL=(\d+)\s+DH=(\d+)\s+DS=(\d+)/);
  if (!m) throw new Error("Header ::UNm DL/DH/DS não encontrado em TEST 1.txt");
  return { dl: Number(m[1]), dh: Number(m[2]), ds: Number(m[3]) };
}

function parsePiecesFromTcn(content: string, thickness: number): ParsedPiece[] {
  const lines = content.split(/\r?\n/);
  const pieces: ParsedPiece[] = [];

  for (let i = 0; i < lines.length; i++) {
    const pieceMatch = lines[i].match(/^;PIECE\s+(.+?)\s+\((.*?)\)\s+#\d+/);
    if (!pieceMatch) continue;
    const partName = pieceMatch[1];
    const boxId = pieceMatch[2];
    const points: Array<{ x: number; y: number }> = [];

    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].startsWith(";PIECE")) break;
      const w2200 = lines[j].match(/^W#2200\s+X=([0-9]+(?:\.[0-9]+)?)\s+Y=([0-9]+(?:\.[0-9]+)?)/);
      if (w2200) {
        points.push({ x: Number(w2200[1]), y: Number(w2200[2]) });
        if (points.length >= 5) break;
      }
    }
    if (points.length < 4) continue;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    pieces.push({
      partName,
      boxId,
      largura_mm: Math.round(Math.max(...xs) - Math.min(...xs)),
      altura_mm: Math.round(Math.max(...ys) - Math.min(...ys)),
      espessura_mm: thickness,
    });
  }
  return pieces;
}

function toMetrics(result: CutLayoutResult): Metrics {
  const totalSheets = result.sheets.length;
  const totalSheetArea = result.sheets.reduce((acc, s) => acc + s.sheet.largura_mm * s.sheet.altura_mm, 0);
  const totalUsedArea = result.sheets.reduce(
    (acc, s) => acc + s.placements.reduce((inner, p) => inner + p.largura_mm * p.altura_mm, 0),
    0
  );
  const totalWasteArea = Math.max(0, totalSheetArea - totalUsedArea);
  const utilizationPercent = totalSheetArea > 0 ? (totalUsedArea / totalSheetArea) * 100 : 0;
  const selectedStrategy = result.diagnostics?.flow.selectedStrategy;
  const selectedBinHeuristic = result.diagnostics?.flow.selectedBinHeuristic;
  const trialRuns = (result.diagnostics?.trialRuns ?? []).map((t) => ({
    strategy: t.strategy,
    binHeuristic: t.binHeuristic,
    sheetCount: t.sheetCount,
    usedArea: t.usedArea,
    wasteArea: t.wasteArea,
    usefulLeftoverArea: t.usefulLeftoverArea,
    score: t.score,
  }));
  const selectedScore = trialRuns.find(
    (t) => t.strategy === selectedStrategy && t.binHeuristic === selectedBinHeuristic
  )?.score;
  const usefulLeftoverArea = trialRuns.find(
    (t) => t.strategy === selectedStrategy && t.binHeuristic === selectedBinHeuristic
  )?.usefulLeftoverArea ?? 0;

  return {
    totalSheets,
    totalUsedArea,
    totalWasteArea,
    usefulLeftoverArea,
    utilizationPercent: Number(utilizationPercent.toFixed(2)),
    selectedStrategy,
    selectedBinHeuristic,
    selectedScore,
    trialRuns,
  };
}

function formatNum(n: number): string {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(n);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const raw = await readFile(INPUT_FILE, "utf8");
  const { dl, dh, ds } = parseHeader(raw);
  const parsedPieces = parsePiecesFromTcn(raw, ds);
  if (parsedPieces.length === 0) throw new Error("Nenhuma peça foi identificada no cenário TEST 1.");

  const items = parsedPieces.map((p) => ({
    dimensoes: { largura: p.largura_mm, altura: p.altura_mm, profundidade: p.espessura_mm },
    espessura: p.espessura_mm,
    quantidade: 1,
    boxId: p.boxId,
    nome: p.partName,
  }));
  const pieces = cutlistToPieces(items);
  const baseSheet = { largura_mm: dl, altura_mm: dh, espessura_mm: ds };

  const baselineOld = runCutLayout(pieces, baseSheet, {
    groupByThicknessOnly: true,
    rotationPreferenceMode: "aggressive",
    rotationWeight: 0.8,
    rotationPenalty: 0.45,
    collectDiagnostics: true,
    strategyTrials: [{ strategy: "skyline", binHeuristic: "bestFit" }],
  });

  const nestingV2 = runCutLayout(pieces, baseSheet, {
    groupByThicknessOnly: true,
    rotationPreferenceMode: "aggressive",
    rotationWeight: 0.8,
    rotationPenalty: 0.45,
    collectDiagnostics: true,
  });

  const oldMetrics = toMetrics(baselineOld);
  const v2Metrics = toMetrics(nestingV2);
  const strategyRanking = [...v2Metrics.trialRuns].sort((a, b) => a.score - b.score);
  const winner = strategyRanking[0];
  const second = strategyRanking[1];

  const improvements = {
    panelsDelta: oldMetrics.totalSheets - v2Metrics.totalSheets,
    wasteAreaDelta: oldMetrics.totalWasteArea - v2Metrics.totalWasteArea,
    usefulLeftoverDelta: v2Metrics.usefulLeftoverArea - oldMetrics.usefulLeftoverArea,
    utilizationDeltaPercent: Number((v2Metrics.utilizationPercent - oldMetrics.utilizationPercent).toFixed(2)),
    scoreDelta: (oldMetrics.selectedScore ?? 0) - (v2Metrics.selectedScore ?? 0),
  };

  const opportunities: string[] = [];
  if (v2Metrics.totalWasteArea > 0) {
    opportunities.push("Ainda existe área residual; testar meta-heurísticas (LNS/simulated annealing) pode reduzir desperdício adicional.");
  }
  if (second && winner && Math.abs(second.score - winner.score) / Math.max(1, winner.score) < 0.03) {
    opportunities.push("A melhor e a segunda melhor estratégia estão muito próximas; vale testar mais variações por ordem de peças.");
  }
  const rejected = nestingV2.diagnostics?.rejectedByLimit?.length ?? 0;
  if (rejected > 0) {
    opportunities.push(`Há ${rejected} peças rejeitadas por limite; melhorar pré-validação de dimensões e fallback específico por peça.`);
  }
  if (opportunities.length === 0) {
    opportunities.push("Sem gaps críticos evidentes neste cenário; próxima fronteira é otimização por múltiplos cenários reais de produção.");
  }

  const report = {
    scenario: "TEST 1",
    input: {
      sourceFile: INPUT_FILE,
      pieceCount: pieces.length,
      sheet: { dl, dh, ds },
    },
    benchmark: {
      baselineOld: {
        description: "Engine antigo (equivalente): skyline + bestFit",
        metrics: oldMetrics,
      },
      nestingV2: {
        description: "Nesting Engine v2 (multi-heurística)",
        metrics: v2Metrics,
      },
      strategyRanking,
      winner,
      improvements,
      opportunities,
    },
    generatedAt: new Date().toISOString(),
  };

  await writeFile(REPORT_JSON, JSON.stringify(report, null, 2), "utf8");

  const summary = [
    "BENCHMARK COMPARATIVO - TEST 1",
    `Baseline antigo: ${oldMetrics.totalSheets} chapa(s) | desperdício=${formatNum(oldMetrics.totalWasteArea)} mm2 | sobra útil=${formatNum(oldMetrics.usefulLeftoverArea)} mm2 | score=${formatNum(oldMetrics.selectedScore ?? 0)}`,
    `Nesting v2: ${v2Metrics.totalSheets} chapa(s) | desperdício=${formatNum(v2Metrics.totalWasteArea)} mm2 | sobra útil=${formatNum(v2Metrics.usefulLeftoverArea)} mm2 | score=${formatNum(v2Metrics.selectedScore ?? 0)}`,
    `Vencedora: ${winner ? `${winner.strategy}+${winner.binHeuristic}` : "n/a"} (score=${formatNum(winner?.score ?? 0)})`,
    `Melhoria chapas: ${improvements.panelsDelta >= 0 ? "+" : ""}${improvements.panelsDelta}`,
    `Melhoria desperdício: ${improvements.wasteAreaDelta >= 0 ? "+" : ""}${formatNum(improvements.wasteAreaDelta)} mm2`,
    `Melhoria sobra útil: ${improvements.usefulLeftoverDelta >= 0 ? "+" : ""}${formatNum(improvements.usefulLeftoverDelta)} mm2`,
    `Delta utilização: ${improvements.utilizationDeltaPercent >= 0 ? "+" : ""}${formatNum(improvements.utilizationDeltaPercent)} p.p.`,
    "",
    "Ranking de estratégias (v2):",
    ...strategyRanking.map(
      (r, idx) =>
        `${idx + 1}. ${r.strategy}+${r.binHeuristic} | score=${formatNum(r.score)} | chapas=${r.sheetCount} | desperdício=${formatNum(r.wasteArea)} mm2 | sobra útil=${formatNum(r.usefulLeftoverArea)} mm2`
    ),
    "",
    "Oportunidades:",
    ...opportunities.map((o) => `- ${o}`),
  ].join("\n");

  await writeFile(REPORT_TXT, summary, "utf8");
  console.log("Relatório JSON:", REPORT_JSON);
  console.log("Relatório TXT:", REPORT_TXT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

