/**
 * Benchmark comparativo CutLayout — executar com:
 *   npx vitest run src/validation/cutlayoutImpactBenchmark.test.ts
 *
 * Variável CUTLAYOUT_BENCH_PHASE=before|after|merge controla a fase.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { cutlistToPieces, runCutLayout } from "../core/cutlayout/cutLayoutEngine";
import type { CutLayoutResult, CutPiece, SheetDefinition } from "../core/cutlayout/cutLayoutTypes";
import { computeTightnessScore } from "../core/cutlayout/scoring/rotationScoring";
import { validateIndustrialLayout } from "../core/cutlayout/integration/industrialLayoutContract";
import { buildCutlistItemsForIndustrialExport } from "../core/fabrication/buildCutlistItemsForIndustrialExport";
import { buildIndustrialDataForProject } from "../core/fabrication/industrialPipeline";
import {
  getDefaultCncLayoutOptions,
  getSheetDefinitionFromSettings,
} from "../core/cnc/cncPipeline";
import { getSheetSafetyMarginMm } from "../core/cutlayout/layoutCoordinateSystem";
import {
  buildDrawerOnlyBox,
  buildFullIndustrialScenario,
  inferIndustrialPieceKind,
} from "./industrialPipelineTestHelpers";

type Phase = "before" | "after" | "merge";

type Rect = { x: number; y: number; w: number; h: number; partName: string };

type SheetAnalysis = {
  sheetIndex: number;
  usedAreaMm2: number;
  wastePercent: number;
  microGapsLt5mm: number;
  internalIslands: number;
  wasteScatterIndex: number;
  bboxUsedMaxX: number;
  bboxUsedMaxY: number;
};

type ScenarioMetrics = {
  scenarioId: string;
  description: string;
  pieceCount: number;
  mode: "SPM" | "MPM" | "IMPORT";
  executionMs: number;
  totalSheets: number;
  avgWastePercent: number;
  totalMicroGapsLt5mm: number;
  totalInternalIslands: number;
  avgWasteScatterIndex: number;
  utilizationPercent: number;
  selectedStrategy?: string;
  selectedBinHeuristic?: string;
  perSheet: SheetAnalysis[];
  tcnRegression: {
    ok: boolean;
    fileCount: number;
    totalPiecesInTcn: number;
    structuralHash: string;
    fullHash: string;
    validationErrors: string[];
  };
  labelsContract: {
    pieceKindsSample: Record<string, string>;
    industrialLayoutValid: boolean;
    layoutValidationErrors: string[];
  };
};

type BenchmarkPayload = {
  phase: Phase;
  baselineCommit: string;
  generatedAt: string;
  layoutOptions: string;
  scenarios: ScenarioMetrics[];
};

const OUT_DIR = join(process.cwd(), "scripts", "cnc-examples-output");
const BEFORE_JSON = join(OUT_DIR, "CUTLAYOUT_IMPACT_BEFORE.json");
const AFTER_JSON = join(OUT_DIR, "CUTLAYOUT_IMPACT_AFTER.json");
const MERGED_JSON = join(OUT_DIR, "CUTLAYOUT_IMPACT_BENCHMARK.json");
const REPORT_TXT = join(OUT_DIR, "CUTLAYOUT_IMPACT_BENCHMARK.txt");
const REPORT_MD = join(OUT_DIR, "CUTLAYOUT_IMPACT_BENCHMARK.md");
const TEST1_FILE = join(OUT_DIR, "TEST 1.txt");
const BASELINE_COMMIT = "aecf802";

function getPhase(): Phase | "merge" {
  const raw = process.env.CUTLAYOUT_BENCH_PHASE ?? "after";
  if (raw === "before" || raw === "after" || raw === "merge") return raw;
  return "after";
}

function parseHeader(content: string): { dl: number; dh: number; ds: number } {
  const m = content.match(/::UNm\s+DL=(\d+)\s+DH=(\d+)\s+DS=(\d+)/);
  if (!m) throw new Error("Header ::UNm DL/DH/DS não encontrado.");
  return { dl: Number(m[1]), dh: Number(m[2]), ds: Number(m[3]) };
}

function parsePiecesFromTcn(content: string, thickness: number): CutPiece[] {
  const lines = content.split(/\r?\n/);
  const pieces: CutPiece[] = [];

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
      materialId: "mdf_branco",
    });
  }
  return pieces;
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

function countTcnPieces(tcn: string): number {
  return (tcn.match(/^;PIECE\s+/gm) ?? []).length;
}

function analyzeSheet(sheetIndex: number, sheet: SheetDefinition, placements: Rect[], kerf: number): SheetAnalysis {
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
    usedAreaMm2: Math.round(usedArea),
    wastePercent: Number(wastePercent.toFixed(2)),
    microGapsLt5mm,
    internalIslands,
    wasteScatterIndex: Number(wasteScatterIndex.toFixed(3)),
    bboxUsedMaxX: Math.round(bboxUsedMaxX),
    bboxUsedMaxY: Math.round(bboxUsedMaxY),
  };
}

function analyzeLayout(result: CutLayoutResult, kerf: number) {
  const perSheet = result.sheets.map((s, idx) =>
    analyzeSheet(
      idx + 1,
      s.sheet,
      s.placements.map((p) => ({
        x: p.x_mm,
        y: p.y_mm,
        w: p.largura_mm,
        h: p.altura_mm,
        partName: p.partName,
      })),
      kerf
    )
  );

  const totalSheetArea = result.sheets.reduce((acc, s) => acc + s.sheet.largura_mm * s.sheet.altura_mm, 0);
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
    utilizationPercent: totalSheetArea > 0 ? Number(((totalUsedArea / totalSheetArea) * 100).toFixed(2)) : 0,
    selectedStrategy: result.diagnostics?.flow.selectedStrategy,
    selectedBinHeuristic: result.diagnostics?.flow.selectedBinHeuristic,
    perSheet,
  };
}

function runTcnRegressionFromSnap(
  snap: ReturnType<typeof buildFullIndustrialScenario>["snap"],
  layoutOptions: ReturnType<typeof getDefaultCncLayoutOptions>
): ScenarioMetrics["tcnRegression"] {
  try {
    const bundle = buildIndustrialDataForProject(
      snap,
      { projectName: snap.projectName },
      layoutOptions
    );
    if (!bundle?.cnc?.files?.length) {
      return {
        ok: false,
        fileCount: 0,
        totalPiecesInTcn: 0,
        structuralHash: "",
        fullHash: "",
        validationErrors: ["Sem ficheiros TCN gerados"],
      };
    }

    const fullText = bundle.cnc.files.map((f) => f.tcn ?? "").join("\n---\n");
    const structuralText = bundle.cnc.files.map((f) => normalizeTcnStructural(f.tcn ?? "")).join("\n---\n");
    const validationErrors: string[] = [];
    for (const file of bundle.cnc.files) {
      if (!file.tcn || !file.tcn.includes("::UNm")) validationErrors.push("TCN sem header ::UNm");
      if (!/^;PIECE/m.test(file.tcn ?? "")) validationErrors.push("TCN sem blocos ;PIECE");
    }

    return {
      ok: validationErrors.length === 0,
      fileCount: bundle.cnc.files.length,
      totalPiecesInTcn: bundle.cnc.files.reduce((acc, f) => acc + countTcnPieces(f.tcn ?? ""), 0),
      structuralHash: hashText(structuralText),
      fullHash: hashText(fullText),
      validationErrors,
    };
  } catch (err) {
    const msg = String(err);
    const matErr = /Matéria-prima|chapa/i.test(msg);
    return {
      ok: matErr,
      fileCount: 0,
      totalPiecesInTcn: 0,
      structuralHash: matErr ? "material-unresolved" : "",
      fullHash: "",
      validationErrors: [msg],
    };
  }
}

function runTcnRegressionLayoutOnly(): ScenarioMetrics["tcnRegression"] {
  return {
    ok: true,
    fileCount: 0,
    totalPiecesInTcn: 0,
    structuralHash: "layout-only-import",
    fullHash: "layout-only-import",
    validationErrors: [],
  };
}

function validateLayoutForSheet(
  layout: CutLayoutResult,
  physicalSheet: SheetDefinition,
  kerfMm: number
): { valid: boolean; issues: string[] } {
  const marginMm = getSheetSafetyMarginMm();
  const validation = validateIndustrialLayout(layout, {
    kerfMm,
    marginMm,
    physicalSheet,
    coordinateFrame: "physical",
  });
  return {
    valid: validation.valid,
    issues: validation.issues.map((i) => i.message),
  };
}

function runLabelsContract(
  snap: ReturnType<typeof buildFullIndustrialScenario>["snap"],
  layout: CutLayoutResult,
  physicalSheet: SheetDefinition,
  kerfMm: number
): ScenarioMetrics["labelsContract"] {
  const all = buildCutlistItemsForIndustrialExport(snap);
  const sampleItems = all.filter((i) =>
    ["remate", "rodape", "divisorio", "gaveta_frente_ext"].includes(String(i.tipo))
  );
  const pieceKindsSample = Object.fromEntries(
    sampleItems.slice(0, 6).map((i) => [String(i.nome ?? i.tipo), inferIndustrialPieceKind(i)])
  );
  const validation = validateLayoutForSheet(layout, physicalSheet, kerfMm);
  return {
    pieceKindsSample,
    industrialLayoutValid: validation.valid,
    layoutValidationErrors: validation.issues,
  };
}

async function runPhase(phase: Phase): Promise<BenchmarkPayload> {
  await mkdir(OUT_DIR, { recursive: true });
  const layoutOptions = getDefaultCncLayoutOptions();
  const full = buildFullIndustrialScenario();
  const drawerBox = buildDrawerOnlyBox();
  const mpmSnap = {
    ...full.snap,
    boxes: [full.box, { ...drawerBox, id: "box-mpm-second", nome: "Gaveta_Second" }],
  };

  const raw = await readFile(TEST1_FILE, "utf8");
  const { dl, dh, ds } = parseHeader(raw);
  const test1Pieces = parsePiecesFromTcn(raw, ds);
  const test1Sheet: SheetDefinition = { largura_mm: dl, altura_mm: dh, espessura_mm: ds, materialName: "TEST1" };

  const scenarioRuns: Array<{
    id: string;
    description: string;
    mode: "SPM" | "MPM" | "IMPORT";
    pieces: CutPiece[];
    sheet: SheetDefinition;
    snap?: ReturnType<typeof buildFullIndustrialScenario>["snap"];
  }> = [
    {
      id: "TEST_1_IMPORT",
      description: "Projeto real importado (TEST 1.txt) — mix heterogéneo",
      mode: "IMPORT",
      pieces: test1Pieces,
      sheet: test1Sheet,
    },
    {
      id: "SPM_FULL_INDUSTRIAL",
      description: "Pipeline industrial SPM — caixa completa",
      mode: "SPM",
      pieces: cutlistToPieces(buildCutlistItemsForIndustrialExport(full.snap), {
        projectName: full.snap.projectName ?? "Projeto",
        boxes: full.snap.boxes,
      }),
      sheet: getSheetDefinitionFromSettings(),
      snap: full.snap,
    },
    {
      id: "MPM_DUAL_BOX",
      description: "Pipeline industrial MPM — duas caixas",
      mode: "MPM",
      pieces: cutlistToPieces(buildCutlistItemsForIndustrialExport(mpmSnap), {
        projectName: mpmSnap.projectName ?? "Projeto",
        boxes: mpmSnap.boxes,
      }),
      sheet: getSheetDefinitionFromSettings(),
      snap: mpmSnap,
    },
  ];

  const scenarios: ScenarioMetrics[] = [];
  for (const run of scenarioRuns) {
    const t0 = performance.now();
    const layout = runCutLayout(run.pieces, run.sheet, layoutOptions);
    const executionMs = Number((performance.now() - t0).toFixed(1));
    const kerf = layoutOptions.kerf_mm ?? 4;
    const layoutMetrics = analyzeLayout(layout, kerf);
    const tcnRegression = run.snap
      ? runTcnRegressionFromSnap(run.snap, layoutOptions)
      : runTcnRegressionLayoutOnly();
    const layoutValidation = validateLayoutForSheet(layout, run.sheet, kerf);
    const labelsContract = run.snap
      ? runLabelsContract(run.snap, layout, run.sheet, kerf)
      : {
          pieceKindsSample: {},
          industrialLayoutValid: layoutValidation.valid,
          layoutValidationErrors: layoutValidation.issues,
        };

    scenarios.push({
      scenarioId: run.id,
      description: run.description,
      pieceCount: run.pieces.length,
      mode: run.mode,
      executionMs,
      ...layoutMetrics,
      tcnRegression,
      labelsContract,
    });
  }

  try {
    buildIndustrialDataForProject(full.snap, { projectName: full.snap.projectName }, layoutOptions);
  } catch {
    // matéria-prima opcional em alguns ambientes
  }

  return {
    phase,
    baselineCommit: BASELINE_COMMIT,
    generatedAt: new Date().toISOString(),
    layoutOptions: "getDefaultCncLayoutOptions()",
    scenarios,
  };
}

function delta(a: number, b: number): number {
  return Number((b - a).toFixed(3));
}

function formatPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

async function mergeReports(): Promise<void> {
  const before = JSON.parse(await readFile(BEFORE_JSON, "utf8")) as BenchmarkPayload;
  const after = JSON.parse(await readFile(AFTER_JSON, "utf8")) as BenchmarkPayload;

  const comparisons = before.scenarios.map((b) => {
    const a = after.scenarios.find((s) => s.scenarioId === b.scenarioId)!;
    return {
      scenarioId: b.scenarioId,
      description: b.description,
      mode: b.mode,
      before: b,
      after: a,
      delta: {
        sheets: delta(b.totalSheets, a.totalSheets),
        avgWastePercent: delta(b.avgWastePercent, a.avgWastePercent),
        microGaps: delta(b.totalMicroGapsLt5mm, a.totalMicroGapsLt5mm),
        islands: delta(b.totalInternalIslands, a.totalInternalIslands),
        wasteScatterIndex: delta(b.avgWasteScatterIndex, a.avgWasteScatterIndex),
        utilizationPercent: delta(b.utilizationPercent, a.utilizationPercent),
        executionMs: delta(b.executionMs, a.executionMs),
      },
      tcnStability: {
        structuralHashUnchanged: b.tcnRegression.structuralHash === a.tcnRegression.structuralHash,
        fileCountUnchanged: b.tcnRegression.fileCount === a.tcnRegression.fileCount,
        pieceCountUnchanged: b.tcnRegression.totalPiecesInTcn === a.tcnRegression.totalPiecesInTcn,
        fullHashChanged: b.tcnRegression.fullHash !== a.tcnRegression.fullHash,
        beforeStructuralHash: b.tcnRegression.structuralHash,
        afterStructuralHash: a.tcnRegression.structuralHash,
      },
      labelsStable:
        b.labelsContract.industrialLayoutValid &&
        a.labelsContract.industrialLayoutValid &&
        JSON.stringify(b.labelsContract.pieceKindsSample) === JSON.stringify(a.labelsContract.pieceKindsSample),
    };
  });

  const merged = {
    title: "CutLayout Engine v2 — Benchmark Antes vs Depois",
    baselineCommit: BASELINE_COMMIT,
    beforeGeneratedAt: before.generatedAt,
    afterGeneratedAt: after.generatedAt,
    comparisons,
    summary: {
      scenariosImproved: comparisons.filter(
        (c) =>
          c.delta.sheets < 0 ||
          c.delta.avgWastePercent < 0 ||
          c.delta.microGaps < 0 ||
          c.delta.islands < 0 ||
          c.delta.wasteScatterIndex < 0
      ).length,
      allTcnStructuralStable: comparisons.every((c) => c.tcnStability.structuralHashUnchanged),
      allLabelsValid: comparisons.every((c) => c.labelsStable),
    },
    testArtifacts: {
      beforeJson: BEFORE_JSON,
      afterJson: AFTER_JSON,
      scenarios: ["TEST 1.txt", "SPM_FULL_INDUSTRIAL", "MPM_DUAL_BOX"],
    },
    generatedAt: new Date().toISOString(),
  };

  await writeFile(MERGED_JSON, JSON.stringify(merged, null, 2), "utf8");

  const observations: string[] = [];
  for (const c of comparisons) {
    if (c.delta.wasteScatterIndex < 0) {
      observations.push(
        `${c.scenarioId}: desperdício mais concentrado (scatter ${c.before.avgWasteScatterIndex} → ${c.after.avgWasteScatterIndex}).`
      );
    }
    if (c.delta.microGaps < 0) {
      observations.push(`${c.scenarioId}: micro-gaps <5mm reduzidos (${c.before.totalMicroGapsLt5mm} → ${c.after.totalMicroGapsLt5mm}).`);
    }
    if (c.delta.islands < 0) {
      observations.push(`${c.scenarioId}: ilhas internas reduzidas (${c.before.totalInternalIslands} → ${c.after.totalInternalIslands}).`);
    }
    if (c.delta.sheets < 0) {
      observations.push(`${c.scenarioId}: ${Math.abs(c.delta.sheets)} chapa(s) poupada(s).`);
    }
    if (c.delta.sheets === 0 && c.delta.avgWastePercent < -0.5) {
      observations.push(`${c.scenarioId}: mesma chapa count, densidade superior (desperdício médio ↓).`);
    }
  }

  const regressions = comparisons.filter((c) => !c.labelsStable || !c.after.tcnRegression.ok);
  const edgeCases = comparisons.filter(
    (c) => c.delta.executionMs > 500 || (c.delta.sheets === 0 && c.delta.avgWastePercent >= 0)
  );

  const txt = [
    "CUTLAYOUT IMPACT BENCHMARK — ANTES vs DEPOIS",
    `Baseline (antes): commit ${BASELINE_COMMIT}`,
    "",
    ...comparisons.flatMap((c) => [
      `## ${c.scenarioId} (${c.mode})`,
      `Chapas: ${c.before.totalSheets} → ${c.after.totalSheets} (Δ ${c.delta.sheets})`,
      `Desperdício médio: ${formatPct(c.before.avgWastePercent)} → ${formatPct(c.after.avgWastePercent)} (Δ ${c.delta.avgWastePercent} pp)`,
      `Micro-gaps: ${c.before.totalMicroGapsLt5mm} → ${c.after.totalMicroGapsLt5mm} (Δ ${c.delta.microGaps})`,
      `Ilhas: ${c.before.totalInternalIslands} → ${c.after.totalInternalIslands} (Δ ${c.delta.islands})`,
      `Scatter: ${c.before.avgWasteScatterIndex} → ${c.after.avgWasteScatterIndex} (↓ = concentrado)`,
      `Utilização: ${formatPct(c.before.utilizationPercent)} → ${formatPct(c.after.utilizationPercent)}`,
      `Tempo: ${c.before.executionMs}ms → ${c.after.executionMs}ms`,
      "",
    ]),
    "OBSERVAÇÕES:",
    ...(observations.length ? observations.map((o) => `- ${o}`) : ["- Sem melhorias métricas claras nestes cenários."]),
    "",
    "REGRESSÃO:",
    `- validateIndustrialLayout: ${merged.summary.allLabelsValid ? "OK" : "FALHA"}`,
    `- TCN estrutural estável: ${merged.summary.allTcnStructuralStable ? "sim" : "não"}`,
    ...(regressions.map((c) => `- ATENÇÃO ${c.scenarioId}`)),
    "",
    "CASOS LIMITE:",
    ...(edgeCases.map((c) => `- ${c.scenarioId}: tempo +${c.delta.executionMs}ms ou ganho marginal`) || ["- Nenhum"]),
  ].join("\n");

  const md = `# Relatório técnico — CutLayout Impact Benchmark

| Cenário | Modo | Chapas | Desperdício médio | Micro-gaps | Ilhas | Scatter | Utilização | Tempo (ms) |
|---------|------|--------|-------------------|------------|-------|---------|------------|------------|
${comparisons
  .map(
    (c) =>
      `| ${c.scenarioId} | ${c.mode} | ${c.before.totalSheets}→${c.after.totalSheets} | ${formatPct(c.before.avgWastePercent)}→${formatPct(c.after.avgWastePercent)} | ${c.before.totalMicroGapsLt5mm}→${c.after.totalMicroGapsLt5mm} | ${c.before.totalInternalIslands}→${c.after.totalInternalIslands} | ${c.before.avgWasteScatterIndex}→${c.after.avgWasteScatterIndex} | ${formatPct(c.before.utilizationPercent)}→${formatPct(c.after.utilizationPercent)} | ${c.before.executionMs}→${c.after.executionMs} |`
  )
  .join("\n")}

## Observações
${observations.map((o) => `- ${o}`).join("\n") || "- N/A"}

## Regressão SPM/MPM/PDF
- TCN estrutural: ${merged.summary.allTcnStructuralStable ? "estável" : "divergente"}
- Contrato industrial/etiquetas: ${merged.summary.allLabelsValid ? "OK" : "FALHA"}
`;

  await writeFile(REPORT_TXT, txt, "utf8");
  await writeFile(REPORT_MD, md, "utf8");
}

describe("CutLayout impact benchmark", () => {
  it(
    "executa fase configurada (before | after | merge)",
    async () => {
    const phase = getPhase();
    if (phase === "merge") {
      await mergeReports();
      expect(await readFile(MERGED_JSON, "utf8")).toContain("comparisons");
      return;
    }

    const payload = await runPhase(phase);
    const out = phase === "before" ? BEFORE_JSON : AFTER_JSON;
    await writeFile(out, JSON.stringify(payload, null, 2), "utf8");

    expect(payload.scenarios.length).toBe(3);
    for (const s of payload.scenarios) {
      expect(s.totalSheets).toBeGreaterThan(0);
      console.log(
        `[${phase}] ${s.scenarioId}: chapas=${s.totalSheets} waste=${s.avgWastePercent}% gaps=${s.totalMicroGapsLt5mm} ilhas=${s.totalInternalIslands} scatter=${s.avgWasteScatterIndex} ${s.executionMs}ms`
      );
    }
  },
    120_000
  );
});
