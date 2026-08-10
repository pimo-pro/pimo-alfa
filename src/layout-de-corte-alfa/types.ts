/**
 * Tipos — Layout de Corte Alfa (simulação CNC visual).
 * Estação independente de /nesting_v4; não gera bytes CNC industriais.
 */

import type { NestingV4EngineId } from "../nesting-v4/rules/nestingV4Rules";

export type LcaViewMode = "top" | "floor";

export type LcaEngineMode = NestingV4EngineId;

export type LcaVisualContour = {
  pieceId: string;
  /** Path SVG d=... no referencial da chapa (origem canto inf-esq; Y↑). */
  pathD: string;
  kind: "outer" | "kerf" | "inner";
  order: number;
};

export type LcaVisualHole = {
  pieceId: string;
  xMm: number;
  yMm: number;
  diameterMm: number;
  depthMm: number;
  holeType?: string;
  order: number;
};

export type LcaVisualToolpath = {
  pieceId: string;
  /** Segmentos de trajetória visual (não CNC real). */
  points: Array<{ xMm: number; yMm: number }>;
  kind: "contour" | "drill" | "rapids";
  order: number;
};

export type LcaSimulationStats = {
  utilizationPercent: number;
  wastePercent: number;
  pieceCount: number;
  holeCount: number;
  contourCount: number;
  /** Estimativa visual (segundos). */
  cutTimeSec: number;
  drillTimeSec: number;
};
