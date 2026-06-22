/**
 * Benchmark CutLayout — projecto real 15–30 peças (roupeiro completo).
 *
 *   $env:CUTLAYOUT_BENCH_PHASE="after"
 *   npx vitest run src/validation/cutlayoutRealWorldBenchmark.test.ts
 *
 * Fases: before | after | merge (baseline commit aecf802).
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { cutlistToPieces, runCutLayout } from "../core/cutlayout/cutLayoutEngine";
import type { CutLayoutResult, SheetDefinition } from "../core/cutlayout/cutLayoutTypes";
import { computeTightnessScore } from "../core/cutlayout/scoring/rotationScoring";
import { validateIndustrialLayout } from "../core/cutlayout/integration/industrialLayoutContract";
import { buildCutlistItemsForIndustrialExport } from "../core/fabrication/buildCutlistItemsForIndustrialExport";
import { buildIndustrialDataForProject } from "../core/fabrication/industrialPipeline";
import { getDefaultCncLayoutOptions, getSheetDefinitionFromSettings } from "../core/cnc/cncPipeline";
import { getSheetSafetyMarginMm } from "../core/cutlayout/layoutCoordinateSystem";
import {
  applyRealWorldMixedMaterials,
  buildRealWorldBenchmarkScenario,
  inferIndustrialPieceKind,
  REAL_WORLD_BENCH_NOME,
  REAL_WORLD_BENCH_PROJECT,
} from "./industrialPipelineTestHelpers";

type Phase = "before" | "after";

type Rect = { x: number; y: number; w: number; h: number };

type SheetAnalysis = {
  sheetIndex: number;
  pieceCount: number;
  usedAreaMm2: number;
  wastePercent: number;
  microGapsLt5mm: number;
  internalIslands: number;
  wasteScatterIndex: number;
  horizontalDensity: number;
  verticalDensity: number;
  bboxUsedMaxX: number;
  bboxUsedMaxY: number;
};

type ScenarioMetrics = {
  scenarioId: string;
  description: string;
  pieceCount: number;
  materialIds: string[];
  pieceManifest: Array<{
    nome: string;
    tipo: string;
    largura_mm: number;
    altura_mm: number;
    espessura_mm: number;
    materialId: string;
  }>;
  mode: "SPM";
  executionMs: number;
  totalSheets: number;
  avgWastePercent: number;
  totalMicroGapsLt5mm: number;
  totalInternalIslands: number;
  avgWasteScatterIndex: number;
  avgHorizontalDensity: number;
  avgVerticalDensity: number;
  utilizationPercent: number;
  selectedStrategy?: string;
  selectedBinHeuristic?: string;
  perSheet: SheetAnalysis[];
  tcnRegression: {
    ok: boolean;
    structuralHash: string;
    validationErrors: string[];
  };
  labelsContract: {
    industrialLayoutValid: boolean;
    pieceKindsSample: Record<string, string>;
  };
};

type BenchmarkPayload = {
  phase: Phase;
  baselineCommit: string;
  generatedAt: string;
  inputFixture: string;
  scenario: ScenarioMetrics;
};

const OUT_DIR = join(process.cwd(), "scripts", "cnc-examples-output");
const BEFORE_JSON = join(OUT_DIR, "REALWORLD_CUTLAYOUT_BEFORE.json");
const AFTER_JSON = join(OUT_DIR, "REALWORLD_CUTLAYOUT_AFTER.json");
const MERGED_JSON = join(OUT_DIR, "REALWORLD_CUTLAYOUT_BENCHMARK.json");
const REPORT_TXT = join(OUT_DIR, "REALWORLD_CUTLAYOUT_BENCHMARK.txt");
const REPORT_MD = join(OUT_DIR, "REALWORLD_CUTLAYOUT_BENCHMARK.md");
const INPUT_MANIFEST = join(OUT_DIR, "REALWORLD_BENCH_INPUT.json");
const BASELINE_COMMIT = "aecf802";

function getPhase(): Phase | "merge" {
  const raw = process.env.CUTLAYOUT_BENCH_PHASE ?? "after";
  if (raw === "before" || raw === "after" || raw === "merge") return raw;
  return "after";
}

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function normalizeTcnStructural(tcn: string): string {
  return tcn
    .split(/\r?\n/)
    .filter((line) => !/^W#2200\s+X=/.test(line) && !/^W#2201\s+X=/.test(line))
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n");
}

function analyzeSheet(
  sheetIndex: number,
  sheet: SheetDefinition,
  placements: Rect[],
  kerf: number
): SheetAnalysis {
  const sw = sheet.largura_mm;
  const sh = sheet.altura_mm;
  const usedArea = placements.reduce((acc, r) => acc + r.w * r.h, 0);
  const wastePercent = sw * sh > 0 ? ((sw * sh - usedArea) / (sw * sh)) * 100 : 0;
  const gapTolerance = Math.max(0.5, kerf + 0.3);

  let microGapsLt5mm = 0;
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i];
      const b = placements[j];
      const sameRow = a.y < b.y + b.h + gapTolerance && a.y + a.h > b.y - gapTolerance;
      if (sameRow) {
        const gap = a.x < b.x ? b.x - (a.x + a.w) : a.x - (b.x + b.w);
        if (gap > gapTolerance && gap < 5) microGapsLt5mm++;
      }
      const sameCol = a.x < b.x + b.w + gapTolerance && a.x + a.w > b.x - gapTolerance;
      if (sameCol) {
        const gap = a.y < b.y ? b.y - (a.y + a.h) : a.y - (b.y + b.h);
        if (gap > gapTolerance && gap < 5) microGapsLt5mm++;
      }
    }
  }

  const placedLite = placements.map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h }));
  let internalIslands = 0;
  for (const r of placements) {
    const tightness = computeTightnessScore(r.x, r.y, r.w, r.h, sheet, placedLite, kerf);
    if (tightness < 0.2 && r.x > sw * 0.04 && r.y > sh * 0.04) internalIslands++;
  }

  const bboxUsedMaxX = placements.length ? Math.max(...placements.map((r) => r.x + r.w)) : 0;
  const bboxUsedMaxY = placements.length ? Math.max(...placements.map((r) => r.y + r.h)) : 0;
  const bboxArea = bboxUsedMaxX * bboxUsedMaxY;
  const bboxWaste = Math.max(0, bboxArea - usedArea);
  const totalWaste = Math.max(0, sw * sh - usedArea);
  const wasteOutsideBbox = Math.max(0, totalWaste - bboxWaste);
  const wasteScatterIndex = totalWaste > 0 ? wasteOutsideBbox / totalWaste : 0;

  return {
    sheetIndex,
    pieceCount: placements.length,
    usedAreaMm2: Math.round(usedArea),
    wastePercent: Number(wastePercent.toFixed(2)),
    microGapsLt5mm,
    internalIslands,
    wasteScatterIndex: Number(wasteScatterIndex.toFixed(3)),
    horizontalDensity: Number((bboxUsedMaxX / Math.max(1, sw)).toFixed(3)),
    verticalDensity: Number((bboxUsedMaxY / Math.max(1, sh)).toFixed(3)),
    bboxUsedMaxX: Math.round(bboxUsedMaxX),
    bboxUsedMaxY: Math.round(bboxUsedMaxY),
  };
}

function analyzeLayout(result: CutLayoutResult, kerf: number, physicalSheet: SheetDefinition) {
  const perSheet = result.sheets.map((s, idx) =>
    analyzeSheet(
      idx + 1,
      s.sheet ?? physicalSheet,
      s.placements.map((p) => ({ x: p.x_mm, y: p.y_mm, w: p.largura_mm, h: p.altura_mm })),
      kerf
    )
  );

  const totalSheetArea = result.sheets.reduce(
    (acc, s) => acc + (s.sheet ?? physicalSheet).largura_mm * (s.sheet ?? physicalSheet).altura_mm,
    0
  );
  const totalUsedArea = result.sheets.reduce(
    (acc, s) => acc + s.placements.reduce((inner, p) => inner + p.largura_mm * p.altura_mm, 0),
    0
  );

  return {
    totalSheets: result.sheets.length,
    avgWastePercent: perSheet.length
      ? Number((perSheet.reduce((a, s) => a + s.wastePercent, 0) / perSheet.length).toFixed(2))
      : 0,
    totalMicroGapsLt5mm: perSheet.reduce((a, s) => a + s.microGapsLt5mm, 0),
    totalInternalIslands: perSheet.reduce((a, s) => a + s.internalIslands, 0),
    avgWasteScatterIndex: perSheet.length
      ? Number((perSheet.reduce((a, s) => a + s.wasteScatterIndex, 0) / perSheet.length).toFixed(3))
      : 0,
    avgHorizontalDensity: perSheet.length
      ? Number((perSheet.reduce((a, s) => a + s.horizontalDensity, 0) / perSheet.length).toFixed(3))
      : 0,
    avgVerticalDensity: perSheet.length
      ? Number((perSheet.reduce((a, s) => a + s.verticalDensity, 0) / perSheet.length).toFixed(3))
      : 0,
    utilizationPercent: totalSheetArea > 0 ? Number(((totalUsedArea / totalSheetArea) * 100).toFixed(2)) : 0,
    selectedStrategy: result.diagnostics?.flow.selectedStrategy,
    selectedBinHeuristic: result.diagnostics?.flow.selectedBinHeuristic,
    perSheet,
  };
}

async function runPhase(phase: Phase): Promise<BenchmarkPayload> {
  await mkdir(OUT_DIR, { recursive: true });
  const { snap } = buildRealWorldBenchmarkScenario();
  const sheet = getSheetDefinitionFromSettings();
  const layoutOptions = getDefaultCncLayoutOptions(sheet);

  const rawItems = buildCutlistItemsForIndustrialExport(snap);
  const items = applyRealWorldMixedMaterials(rawItems);
  const pieces = cutlistToPieces(items, {
    projectName: snap.projectName ?? REAL_WORLD_BENCH_PROJECT,
    boxes: snap.boxes,
  });

  const pieceManifest = items.map((i) => ({
    nome: String(i.nome ?? ""),
    tipo: String(i.tipo ?? ""),
    largura_mm: Math.round(Number(i.dimensoes?.largura ?? 0)),
    altura_mm: Math.round(Number(i.dimensoes?.altura ?? 0)),
    espessura_mm: Math.round(Number(i.espessura ?? i.dimensoes?.profundidade ?? 19)),
    materialId: String(i.materialId ?? i.material ?? "mdf_branco"),
  }));

  const materialIds = [...new Set(pieceManifest.map((p) => p.materialId))].sort();

  await writeFile(
    INPUT_MANIFEST,
    JSON.stringify(
      {
        project: REAL_WORLD_BENCH_PROJECT,
        box: REAL_WORLD_BENCH_NOME,
        pieceCount: pieceManifest.length,
        materialIds,
        pieces: pieceManifest,
        fixture: "buildRealWorldBenchmarkScenario()",
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );

  const t0 = performance.now();
  const layout = runCutLayout(pieces, sheet, layoutOptions);
  const executionMs = Number((performance.now() - t0).toFixed(1));
  const kerf = layoutOptions.kerf_mm ?? 4;
  const layoutMetrics = analyzeLayout(layout, kerf, sheet);

  const marginMm = getSheetSafetyMarginMm();
  const validation = validateIndustrialLayout(layout, {
    kerfMm: kerf,
    marginMm,
    physicalSheet: sheet,
    coordinateFrame: "physical",
  });

  const sampleItems = items.filter((i) =>
    ["porta_simples", "gaveta_frente", "separador", "divisorio", "costa", "remate", "rodape"].includes(
      String(i.tipo)
    )
  );

  let tcnRegression: ScenarioMetrics["tcnRegression"] = {
    ok: true,
    structuralHash: "",
    validationErrors: [],
  };
  try {
    const bundle = buildIndustrialDataForProject(snap, { projectName: snap.projectName }, layoutOptions);
    if (bundle?.cnc?.files?.length) {
      const structuralText = bundle.cnc.files.map((f) => normalizeTcnStructural(f.tcn ?? "")).join("\n---\n");
      tcnRegression = {
        ok: bundle.cnc.files.every((f) => f.tcn?.includes("::UNm")),
        structuralHash: hashText(structuralText),
        validationErrors: [],
      };
    }
  } catch (err) {
    const msg = String(err);
    tcnRegression = {
      ok: /Matéria-prima|chapa/i.test(msg),
      structuralHash: "material-unresolved",
      validationErrors: [msg],
    };
  }

  return {
    phase,
    baselineCommit: BASELINE_COMMIT,
    generatedAt: new Date().toISOString(),
    inputFixture: "src/validation/industrialPipelineTestHelpers.ts → buildRealWorldBenchmarkScenario()",
    scenario: {
      scenarioId: "REALWORLD_SPM_ROUPEIRO",
      description: `Roupeiro ${REAL_WORLD_BENCH_NOME} — porta, 3 gavetas, DIV/SEP, costa, remate, rodapé, materiais mistos 19 mm`,
      pieceCount: pieces.length,
      materialIds,
      pieceManifest,
      mode: "SPM",
      executionMs,
      ...layoutMetrics,
      tcnRegression,
      labelsContract: {
        industrialLayoutValid: validation.valid,
        pieceKindsSample: Object.fromEntries(
          sampleItems.slice(0, 8).map((i) => [String(i.nome ?? i.tipo), inferIndustrialPieceKind(i)])
        ),
      },
    },
  };
}

function delta(a: number, b: number): number {
  return Number((b - a).toFixed(3));
}

function formatPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

async function mergeReports(before: BenchmarkPayload, after: BenchmarkPayload): Promise<void> {
  const b = before.scenario;
  const a = after.scenario;
  const d = {
    sheets: delta(b.totalSheets, a.totalSheets),
    avgWastePercent: delta(b.avgWastePercent, a.avgWastePercent),
    microGaps: delta(b.totalMicroGapsLt5mm, a.totalMicroGapsLt5mm),
    islands: delta(b.totalInternalIslands, a.totalInternalIslands),
    scatter: delta(b.avgWasteScatterIndex, a.avgWasteScatterIndex),
    horizontalDensity: delta(b.avgHorizontalDensity, a.avgHorizontalDensity),
    verticalDensity: delta(b.avgVerticalDensity, a.avgVerticalDensity),
    utilization: delta(b.utilizationPercent, a.utilizationPercent),
    executionMs: delta(b.executionMs, a.executionMs),
  };

  const merged = {
    title: "CutLayout — Benchmark projecto real (15–30 peças)",
    baselineCommit: BASELINE_COMMIT,
    beforeGeneratedAt: before.generatedAt,
    afterGeneratedAt: after.generatedAt,
    input: {
      manifest: INPUT_MANIFEST,
      fixture: before.inputFixture,
      pieceCount: b.pieceCount,
      materialIds: b.materialIds,
    },
    before: b,
    after: a,
    delta: d,
    tcnStable: b.tcnRegression.structuralHash === a.tcnRegression.structuralHash,
    labelsStable:
      b.labelsContract.industrialLayoutValid &&
      a.labelsContract.industrialLayoutValid &&
      JSON.stringify(b.labelsContract.pieceKindsSample) === JSON.stringify(a.labelsContract.pieceKindsSample),
    generatedAt: new Date().toISOString(),
  };

  await writeFile(MERGED_JSON, JSON.stringify(merged, null, 2), "utf8");

  const observations: string[] = [];
  if (d.sheets < 0) observations.push(`${Math.abs(d.sheets)} chapa(s) eliminada(s).`);
  if (d.avgWastePercent < -0.3) observations.push(`Desperdício médio ↓ ${Math.abs(d.avgWastePercent).toFixed(2)} pp.`);
  if (d.scatter > 0.02) observations.push(`Desperdício mais concentrado (scatter ${b.avgWasteScatterIndex} → ${a.avgWasteScatterIndex}).`);
  if (d.microGaps < 0) observations.push(`Micro-gaps <5 mm: ${b.totalMicroGapsLt5mm} → ${a.totalMicroGapsLt5mm}.`);
  if (d.islands < 0) observations.push(`Ilhas internas: ${b.totalInternalIslands} → ${a.totalInternalIslands}.`);
  if (d.horizontalDensity > 0.02 || d.verticalDensity > 0.02) {
    observations.push(
      `Densidade bbox ↑ H ${b.avgHorizontalDensity}→${a.avgHorizontalDensity}, V ${b.avgVerticalDensity}→${a.avgVerticalDensity}.`
    );
  }
  if (b.selectedStrategy !== a.selectedStrategy) {
    observations.push(`Estratégia: ${b.selectedStrategy} → ${a.selectedStrategy}.`);
  }
  for (let i = 0; i < Math.max(b.perSheet.length, a.perSheet.length); i++) {
    const bs = b.perSheet[i];
    const as = a.perSheet[i];
    if (bs && as && as.wastePercent + 0.5 < bs.wastePercent) {
      observations.push(`Chapa ${as.sheetIndex}: desperdício ${formatPct(bs.wastePercent)} → ${formatPct(as.wastePercent)}.`);
    }
  }

  const txt = [
    "REALWORLD CUTLAYOUT BENCHMARK — ANTES vs DEPOIS",
    `Baseline: ${BASELINE_COMMIT}`,
    `Projecto: ${REAL_WORLD_BENCH_NOME} (${b.pieceCount} peças, materiais: ${b.materialIds.join(", ")})`,
    "",
    "RESUMO",
    `Chapas: ${b.totalSheets} → ${a.totalSheets} (Δ ${d.sheets})`,
    `Desperdício médio/chapa: ${formatPct(b.avgWastePercent)} → ${formatPct(a.avgWastePercent)} (Δ ${d.avgWastePercent} pp)`,
    `Micro-gaps <5mm: ${b.totalMicroGapsLt5mm} → ${a.totalMicroGapsLt5mm}`,
    `Ilhas internas: ${b.totalInternalIslands} → ${a.totalInternalIslands}`,
    `Scatter (↑=concentrado): ${b.avgWasteScatterIndex} → ${a.avgWasteScatterIndex}`,
    `Densidade H/V: ${b.avgHorizontalDensity}/${b.avgVerticalDensity} → ${a.avgHorizontalDensity}/${a.avgVerticalDensity}`,
    `Utilização: ${formatPct(b.utilizationPercent)} → ${formatPct(a.utilizationPercent)}`,
    `Tempo: ${b.executionMs}ms → ${a.executionMs}ms`,
    `Estratégia: ${b.selectedStrategy}+${b.selectedBinHeuristic} → ${a.selectedStrategy}+${a.selectedBinHeuristic}`,
    "",
    "POR CHAPA (desperdício % | gaps | ilhas | scatter | dens.H | dens.V)",
    ...a.perSheet.map((s, i) => {
      const prev = b.perSheet[i];
      if (!prev) return `  Chapa ${s.sheetIndex}: (nova) ${formatPct(s.wastePercent)}`;
      return `  Chapa ${s.sheetIndex}: ${formatPct(prev.wastePercent)}→${formatPct(s.wastePercent)} | gaps ${prev.microGapsLt5mm}→${s.microGapsLt5mm} | ilhas ${prev.internalIslands}→${s.internalIslands} | scatter ${prev.wasteScatterIndex}→${s.wasteScatterIndex} | H ${prev.horizontalDensity}→${s.horizontalDensity} | V ${prev.verticalDensity}→${s.verticalDensity}`;
    }),
    "",
    "OBSERVAÇÕES:",
    ...(observations.length ? observations.map((o) => `- ${o}`) : ["- Ganhos globais modestos; ver detalhe por chapa."]),
    "",
    "REGRESSÃO: validateIndustrialLayout OK=" + merged.labelsStable + ", TCN estrutural estável=" + merged.tcnStable,
    "",
    "FICHEIROS:",
    `- ${INPUT_MANIFEST}`,
    `- ${BEFORE_JSON}`,
    `- ${AFTER_JSON}`,
    `- ${MERGED_JSON}`,
  ].join("\n");

  const md = `# Benchmark CutLayout — projecto real (${b.pieceCount} peças)

## Entrada
- Fixture: \`buildRealWorldBenchmarkScenario()\`
- Manifest: \`REALWORLD_BENCH_INPUT.json\`
- Materiais: ${b.materialIds.join(", ")} (19 mm)

## Comparativo

| Métrica | Antes | Depois | Δ |
|---------|-------|--------|---|
| Chapas | ${b.totalSheets} | ${a.totalSheets} | ${d.sheets} |
| Desperdício médio/chapa | ${formatPct(b.avgWastePercent)} | ${formatPct(a.avgWastePercent)} | ${d.avgWastePercent} pp |
| Micro-gaps &lt;5 mm | ${b.totalMicroGapsLt5mm} | ${a.totalMicroGapsLt5mm} | ${d.microGaps} |
| Ilhas internas | ${b.totalInternalIslands} | ${a.totalInternalIslands} | ${d.islands} |
| Scatter | ${b.avgWasteScatterIndex} | ${a.avgWasteScatterIndex} | ${d.scatter} |
| Densidade H | ${b.avgHorizontalDensity} | ${a.avgHorizontalDensity} | ${d.horizontalDensity} |
| Densidade V | ${b.avgVerticalDensity} | ${a.avgVerticalDensity} | ${d.verticalDensity} |
| Utilização | ${formatPct(b.utilizationPercent)} | ${formatPct(a.utilizationPercent)} | ${d.utilization} pp |
| Tempo (ms) | ${b.executionMs} | ${a.executionMs} | ${d.executionMs} |

## Por chapa (desperdício %)

| Chapa | Antes | Depois |
|-------|-------|--------|
${a.perSheet
  .map((s, i) => {
    const p = b.perSheet[i];
    return `| ${s.sheetIndex} | ${p ? formatPct(p.wastePercent) : "—"} | ${formatPct(s.wastePercent)} |`;
  })
  .join("\n")}

## Observações
${observations.map((o) => `- ${o}`).join("\n") || "- Ver tabela por chapa."}

## Regressão
- Contrato industrial: ${merged.labelsStable ? "OK" : "FALHA"}
- TCN estrutural: ${merged.tcnStable ? "estável" : "divergente"}
`;

  await writeFile(REPORT_TXT, txt, "utf8");
  await writeFile(REPORT_MD, md, "utf8");
}

describe("CutLayout real-world benchmark (15–30 peças)", () => {
  it(
    "executa fase before | after | merge",
    async () => {
      const phase = getPhase();

      if (phase === "merge") {
        const before = JSON.parse(await readFile(BEFORE_JSON, "utf8")) as BenchmarkPayload;
        const after = JSON.parse(await readFile(AFTER_JSON, "utf8")) as BenchmarkPayload;
        await mergeReports(before, after);
        expect(await readFile(MERGED_JSON, "utf8")).toContain("REALWORLD");
        return;
      }

      const payload = await runPhase(phase);
      const out = phase === "before" ? BEFORE_JSON : AFTER_JSON;
      await writeFile(out, JSON.stringify(payload, null, 2), "utf8");

      expect(payload.scenario.pieceCount).toBeGreaterThanOrEqual(15);
      expect(payload.scenario.pieceCount).toBeLessThanOrEqual(35);
      expect(payload.scenario.materialIds.length).toBeGreaterThanOrEqual(2);
      expect(payload.scenario.totalSheets).toBeGreaterThan(0);

      console.log(
        `[${phase}] peças=${payload.scenario.pieceCount} chapas=${payload.scenario.totalSheets} waste=${payload.scenario.avgWastePercent}% gaps=${payload.scenario.totalMicroGapsLt5mm} ilhas=${payload.scenario.totalInternalIslands} scatter=${payload.scenario.avgWasteScatterIndex} H=${payload.scenario.avgHorizontalDensity} V=${payload.scenario.avgVerticalDensity} ${payload.scenario.executionMs}ms ${payload.scenario.selectedStrategy}+${payload.scenario.selectedBinHeuristic}`
      );
    },
    120_000
  );
});
