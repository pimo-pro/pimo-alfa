/**
 * Regras industriais do motor Deepnest — editáveis em /admin/industrial/.
 */

import {
  DEFAULT_DEEPNEST_OPTIONS,
  type DeepnestMode,
  type DeepnestOptions,
} from "./deepnestOptions";

const STORAGE_KEY = "pimo_nesting_deepnest_rules_v1";

export type DeepnestRules = DeepnestOptions & {
  /** Limite de rotação industrial: only90 = 0/90; free = até 4 ângulos. */
  rotationLimit: "only90" | "free";
  collisionPaddingMm: number;
};

export const DEFAULT_DEEPNEST_RULES: DeepnestRules = {
  ...DEFAULT_DEEPNEST_OPTIONS,
  rotationLimit: "only90",
  collisionPaddingMm: 0,
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function normalizeDeepnestRules(raw: unknown): DeepnestRules {
  const base = DEFAULT_DEEPNEST_RULES;
  if (!isObject(raw)) return { ...base };
  const mode: DeepnestMode = raw.mode === "conservative" ? "conservative" : "aggressive";
  return {
    populationSize: Math.max(3, Number(raw.populationSize) || base.populationSize),
    mutationRate: Math.max(1, Number(raw.mutationRate) || base.mutationRate),
    generations: Math.max(1, Number(raw.generations) || base.generations),
    rotations: raw.rotationLimit === "free" || Number(raw.rotations) >= 4 ? 4 : 2,
    kerfMm: Math.max(0, Number(raw.kerfMm) || base.kerfMm),
    marginMm: Math.max(0, Number(raw.marginMm) || base.marginMm),
    mode,
    nfpSamplesPerEdge: Math.max(2, Number(raw.nfpSamplesPerEdge) || base.nfpSamplesPerEdge),
    enableSa: raw.enableSa !== false,
    saIterations: Math.max(0, Number(raw.saIterations) || base.saIterations),
    saInitialTemperature: Math.max(0.01, Number(raw.saInitialTemperature) || base.saInitialTemperature),
    saCoolingRate: Math.min(0.999, Math.max(0.8, Number(raw.saCoolingRate) || base.saCoolingRate)),
    seed: Number(raw.seed) || base.seed,
    respectGrainLock: raw.respectGrainLock !== false,
    rotationLimit: raw.rotationLimit === "free" ? "free" : "only90",
    collisionPaddingMm: Math.max(0, Number(raw.collisionPaddingMm) || 0),
  };
}

export function loadDeepnestRules(): DeepnestRules {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeDeepnestRules(null);
    return normalizeDeepnestRules(JSON.parse(raw));
  } catch {
    return normalizeDeepnestRules(null);
  }
}

export function saveDeepnestRules(rules: DeepnestRules): DeepnestRules {
  const normalized = normalizeDeepnestRules(rules);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore */
  }
  return normalized;
}

export function resolveDeepnestOptions(overrides?: Partial<DeepnestOptions>): DeepnestOptions {
  const rules = loadDeepnestRules();
  return {
    ...rules,
    ...overrides,
    rotations: rules.rotationLimit === "free" ? 4 : 2,
    kerfMm: (overrides?.kerfMm ?? rules.kerfMm) + (rules.collisionPaddingMm || 0),
  };
}
