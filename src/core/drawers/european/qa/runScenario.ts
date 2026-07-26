/**
 * runScenario.ts — Executa um cenário QA Modelo B (simulação pura).
 * Import dinâmico de generateEuropeanDrawer para evitar ciclo com european/index.
 */

import { isDrawerModeloAActive } from "../../drawerSystemFlags";
import { getEuropeanDrawerModel } from "../catalog";
import type {
  EuropeanDrawerBoxConfig,
  EuropeanDrawerBoxInput,
  EuropeanDrawerResult,
  EuropeanDrawerSystemId,
} from "../types";
import type { EuropeanQaScenario, EuropeanQaScenarioResult } from "./types";

const WALL_THICKNESS_MM = 19;

function buildSimulatedBox(scenario: EuropeanQaScenario): EuropeanDrawerBoxInput {
  const { larguraInternaMm, alturaInternaMm, profundidadeInternaMm } = scenario.caixa;
  return {
    id: `qa-${scenario.id}`,
    nome: scenario.id,
    dimensoes: {
      largura: larguraInternaMm + 2 * WALL_THICKNESS_MM,
      altura: alturaInternaMm + 2 * WALL_THICKNESS_MM,
      // P externa ? P útil + costa + frente (espessuras)
      profundidade: profundidadeInternaMm + WALL_THICKNESS_MM + WALL_THICKNESS_MM,
    },
    espessura: WALL_THICKNESS_MM,
    gavetas: scenario.gavetas.length,
    material: "mdf_branco",
    profundidadeInternaUtilMm: profundidadeInternaMm,
    espessuraCosta: WALL_THICKNESS_MM,
    costaAtiva: true,
  };
}

function buildConfig(scenario: EuropeanQaScenario): EuropeanDrawerBoxConfig {
  const first = scenario.gavetas[0]!;
  const model = getEuropeanDrawerModel(first.modelId);
  const byCode = first.alturaCode
    ? model.heights.find((h) => h.code === first.alturaCode)
    : undefined;
  const byMm =
    first.alturaMm != null
      ? model.heights.find((h) => h.heightMm === first.alturaMm)
      : undefined;
  const height = byCode ?? byMm ?? model.heights[0]!;

  return {
    systemId: first.modelId,
    heightMm: height.heightMm,
    heightCode: height.code || undefined,
    depthMm: first.preferedRunner ?? 450,
    softClose: first.softClose ?? true,
    pushOpen: first.pushOpen ?? false,
    count: scenario.gavetas.length,
    frontMaterialId: first.frenteMaterialId,
    frontWidthMm: first.frenteDims?.larguraMm,
    frontHeightMm: first.frenteDims?.alturaMm,
    dualFront: first.dualFront === true,
  };
}

function pdfOk(result: EuropeanDrawerResult): boolean {
  const pdf = result.pdf;
  if (!pdf?.title) return false;
  if (!Array.isArray(pdf.measureRows) || !Array.isArray(pdf.pieceRows)) return false;
  if (!result.valid) return true;
  return pdf.pieceRows.length > 0 && pdf.measureRows.length > 0;
}

function viewerOk(result: EuropeanDrawerResult): boolean {
  if (!result.viewer) return false;
  if (!result.valid) return result.viewer.drawers.length === 0;
  return result.viewer.drawers.length > 0 && result.viewer.drawers.every((d) => d.geometry != null);
}

function nowMs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

/**
 * Executa um cenário: generateEuropeanDrawer + métricas.
 * Nunca altera projeto / CNC / industrial.
 */
export async function runScenario(scenario: EuropeanQaScenario): Promise<EuropeanQaScenarioResult> {
  const t0 = nowMs();

  const baseMeta = {
    scenarioId: scenario.id,
    caixa: scenario.caixa,
    drawerCount: scenario.gavetas.length,
    modelId: (scenario.meta?.modelId ?? scenario.gavetas[0]?.modelId) as
      | EuropeanDrawerSystemId
      | undefined,
  };

  if (isDrawerModeloAActive()) {
    return {
      ...baseMeta,
      valid: false,
      skipped: true,
      skipReason: "Modelo A ainda activo — desactivar em Admin ? Produtos ? Gavetas.",
      errors: ["QA bloqueado: Modelo A activo."],
      warnings: [],
      autoFixes: [],
      autoFixed: false,
      cutlistCount: 0,
      pdfOk: false,
      viewerOk: false,
      durationMs: Math.round(nowMs() - t0),
    };
  }

  if (!scenario.gavetas.length) {
    return {
      ...baseMeta,
      valid: false,
      errors: ["Cenário sem gavetas."],
      warnings: [],
      autoFixes: [],
      autoFixed: false,
      cutlistCount: 0,
      pdfOk: false,
      viewerOk: false,
      durationMs: Math.round(nowMs() - t0),
    };
  }

  const { generateEuropeanDrawer } = await import("../index");
  const box = buildSimulatedBox(scenario);
  const config = buildConfig(scenario);

  const dry = generateEuropeanDrawer(config.systemId, box, config, { applyAutoFixes: false });
  const fixed = generateEuropeanDrawer(config.systemId, box, config, { applyAutoFixes: true });
  const autoFixed = !dry.valid && fixed.valid;

  return {
    ...baseMeta,
    valid: fixed.valid,
    errors: fixed.errors,
    warnings: fixed.warnings,
    autoFixes: fixed.autoFixes,
    autoFixed,
    cutlistCount: fixed.cutlist.length,
    pdfOk: pdfOk(fixed),
    viewerOk: viewerOk(fixed),
    runnerDepthMm: fixed.geometry.runnerDepthMm,
    bodyDepthMm: fixed.geometry.bodyDepthMm,
    externalWidthMm: fixed.geometry.externalWidthMm,
    durationMs: Math.round(nowMs() - t0),
  };
}
