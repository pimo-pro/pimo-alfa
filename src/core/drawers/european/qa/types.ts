/**
 * european/qa/types — Contratos do Auto QA Stress Testing (Modelo B).
 * Simulação pura: sem CNC, sem industrial/**, sem mutar projeto.
 */

import type { EuropeanDrawerSystemId } from "../types";

export type EuropeanQaFrenteDims = {
  alturaMm?: number;
  larguraMm?: number;
};

export type EuropeanQaGavetaSpec = {
  modelId: EuropeanDrawerSystemId;
  /** Código de altura de catálogo (N, M, K…); vazio se o modelo só usa mm. */
  alturaCode?: string;
  /** Altura em mm (alternativa / fallback). */
  alturaMm?: number;
  /** Corrediça Hettich preferida (mm); opcional. */
  preferedRunner?: number;
  frenteMaterialId?: string;
  frenteDims?: EuropeanQaFrenteDims;
  dualFront?: boolean;
  softClose?: boolean;
  pushOpen?: boolean;
};

export type EuropeanQaScenario = {
  id: string;
  caixa: {
    larguraInternaMm: number;
    alturaInternaMm: number;
    profundidadeInternaMm: number;
  };
  gavetas: EuropeanQaGavetaSpec[];
  /** Metadados para reporters (falhas por dimensão/modelo). */
  meta?: {
    modelId?: EuropeanDrawerSystemId;
    preferedRunner?: number;
    drawerCount?: number;
  };
};

export type EuropeanQaScenarioResult = {
  scenarioId: string;
  valid: boolean;
  skipped?: boolean;
  skipReason?: string;
  errors: string[];
  warnings: string[];
  autoFixes: Array<{ code: string; description: string }>;
  /** true se dry-run inválido e run com autoFix ficou válido. */
  autoFixed: boolean;
  cutlistCount: number;
  pdfOk: boolean;
  viewerOk: boolean;
  runnerDepthMm?: number;
  bodyDepthMm?: number;
  externalWidthMm?: number;
  modelId?: EuropeanDrawerSystemId;
  caixa: EuropeanQaScenario["caixa"];
  drawerCount: number;
  durationMs: number;
};

export type EuropeanQaSummary = {
  total: number;
  ran: number;
  skipped: number;
  valid: number;
  invalid: number;
  autoFixed: number;
  pctValid: number;
  pctInvalid: number;
  pctAutoFixed: number;
  topErrors: Array<{ message: string; count: number }>;
  topWarnings: Array<{ message: string; count: number }>;
  failuresByModel: Array<{ modelId: string; failures: number; total: number }>;
  failuresByDepth: Array<{ profundidadeInternaMm: number; failures: number; total: number }>;
  failuresByWidth: Array<{ larguraInternaMm: number; failures: number; total: number }>;
};

export type EuropeanQaProgress = {
  index: number;
  total: number;
  scenarioId: string;
  result: EuropeanQaScenarioResult;
};
