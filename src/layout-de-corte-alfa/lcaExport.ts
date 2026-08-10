/**
 * Exportações visuais — Layout de Corte Alfa.
 * PDF/etiquetas reutilizam módulos V4 de análise; TCN é relatório de simulação apenas.
 */

import type { NestingV4State } from "../nesting-v4/nestingV4Types";
import { downloadNestingV4Pdf } from "../nesting-v4/nestingV4Pdf";
import { downloadNestingV4Labels } from "../nesting-v4/nestingV4Labels";
import { resolveLcaRules } from "./rules/layoutCorteAlfaRules";
import {
  buildVisualSimulation,
  buildVisualTcnReport,
  downloadTextFile,
} from "./simulation/buildVisualToolpaths";

export async function downloadLcaVisualPdf(state: NestingV4State, projectName: string): Promise<void> {
  await downloadNestingV4Pdf(state, `${projectName}_LayoutCorteAlfa`);
}

export function downloadLcaVisualLabels(state: NestingV4State, projectName: string): void {
  downloadNestingV4Labels(state, `${projectName}_LayoutCorteAlfa`);
}

export function downloadLcaVisualTcn(state: NestingV4State, projectName: string): void {
  const sheet = state.sheets[state.activeSheetIndex] ?? state.sheets[0];
  if (!sheet) return;
  const rules = resolveLcaRules();
  const { stats } = buildVisualSimulation(sheet, state.pieces, state.placements, state.settings.kerfMm, rules);
  const report = buildVisualTcnReport(
    projectName,
    sheet,
    state.pieces,
    state.placements,
    state.settings.kerfMm,
    stats
  );
  const safe = projectName.replace(/\s+/g, "_");
  downloadTextFile(`${safe}_LayoutCorteAlfa_SIMULACAO.txt`, report);
}

export async function downloadLcaVisualAll(state: NestingV4State, projectName: string): Promise<void> {
  await downloadLcaVisualPdf(state, projectName);
  downloadLcaVisualLabels(state, projectName);
  downloadLcaVisualTcn(state, projectName);
}
