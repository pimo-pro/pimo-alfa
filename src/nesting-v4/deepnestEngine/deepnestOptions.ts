/**
 * Opções do motor Deepnest (Nesting V4 — visual/análise).
 */

export type DeepnestMode = "aggressive" | "conservative";

export type DeepnestOptions = {
  populationSize: number;
  mutationRate: number;
  /** Gerações GA. */
  generations: number;
  /** Ângulos: 2 = 0/90 (industrial CNC). */
  rotations: number;
  kerfMm: number;
  marginMm: number;
  mode: DeepnestMode;
  nfpSamplesPerEdge: number;
  /** Activar SA após GA. */
  enableSa: boolean;
  saIterations: number;
  saInitialTemperature: number;
  saCoolingRate: number;
  seed: number;
  respectGrainLock: boolean;
};

export const DEFAULT_DEEPNEST_OPTIONS: DeepnestOptions = {
  populationSize: 12,
  mutationRate: 12,
  generations: 8,
  rotations: 2,
  kerfMm: 3,
  marginMm: 10,
  mode: "aggressive",
  nfpSamplesPerEdge: 6,
  enableSa: true,
  saIterations: 80,
  saInitialTemperature: 1.2,
  saCoolingRate: 0.96,
  seed: 2026,
  respectGrainLock: true,
};
