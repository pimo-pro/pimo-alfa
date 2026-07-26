/**
 * scenarios.ts — ~200 cenários industriais determinísticos (Modelo B).
 */

import type { EuropeanDrawerSystemId } from "../types";
import { EUROPEAN_DRAWER_SYSTEMS } from "../catalog";
import { HETTICH_RUNNER_LENGTHS_MM } from "../measures/hettichRunners";
import type { EuropeanQaGavetaSpec, EuropeanQaScenario } from "./types";

const BOX_HEIGHTS_INTERNAL_MM = [400, 480, 560, 640, 720, 800, 880, 960, 1040, 1200] as const;
const BOX_DEPTHS_INTERNAL_MM = [320, 360, 400, 450, 500, 520, 560, 600] as const;
const BOX_WIDTHS_INTERNAL_MM = [300, 350, 400, 450, 500, 550, 600, 800] as const;
const DRAWER_COUNTS = [1, 2, 3, 4] as const;
const FRONT_MATERIALS = ["mdf_branco", "carvalho", "cinza_antracite", "branco_brilho", "nogueira"] as const;

const MODEL_IDS: EuropeanDrawerSystemId[] = EUROPEAN_DRAWER_SYSTEMS.map((m) => m.id);

/** Alvo aproximado de cenários. */
const TARGET_SCENARIO_COUNT = 200;

function padId(n: number): string {
  return `EU-QA-${String(n).padStart(3, "0")}`;
}

function pickHeightForModel(
  modelId: EuropeanDrawerSystemId,
  comboIndex: number
): { alturaCode?: string; alturaMm: number } {
  const model = EUROPEAN_DRAWER_SYSTEMS.find((m) => m.id === modelId)!;
  const h = model.heights[comboIndex % model.heights.length]!;
  return {
    alturaCode: h.code || undefined,
    alturaMm: h.heightMm,
  };
}

/**
 * Gera combinações estáveis (mesma ordem em todos os runs).
 * Cobre larguras — profundidades — alturas — modelos — counts — runners.
 */
export function buildEuropeanQaScenarios(targetCount = TARGET_SCENARIO_COUNT): EuropeanQaScenario[] {
  const scenarios: EuropeanQaScenario[] = [];
  let n = 0;

  // Passada principal: grelha densa mas truncada a ~200
  outer: for (let wi = 0; wi < BOX_WIDTHS_INTERNAL_MM.length; wi++) {
    for (let di = 0; di < BOX_DEPTHS_INTERNAL_MM.length; di++) {
      for (let hi = 0; hi < BOX_HEIGHTS_INTERNAL_MM.length; hi++) {
        for (let mi = 0; mi < MODEL_IDS.length; mi++) {
          for (let ci = 0; ci < DRAWER_COUNTS.length; ci++) {
            for (let ri = 0; ri < HETTICH_RUNNER_LENGTHS_MM.length; ri++) {
              if (n >= targetCount) break outer;

              const larguraInternaMm = BOX_WIDTHS_INTERNAL_MM[wi]!;
              const profundidadeInternaMm = BOX_DEPTHS_INTERNAL_MM[di]!;
              const alturaInternaMm = BOX_HEIGHTS_INTERNAL_MM[hi]!;
              const modelId = MODEL_IDS[mi]!;
              const drawerCount = DRAWER_COUNTS[ci]!;
              const preferedRunner = HETTICH_RUNNER_LENGTHS_MM[ri]!;

              // Runner preferido deve ser tipicamente < profundidade útil
              if (preferedRunner >= profundidadeInternaMm) continue;

              const height = pickHeightForModel(modelId, n);
              const gavetas: EuropeanQaGavetaSpec[] = [];
              for (let g = 0; g < drawerCount; g++) {
                const gHeight = pickHeightForModel(modelId, n + g);
                gavetas.push({
                  modelId,
                  alturaCode: gHeight.alturaCode,
                  alturaMm: gHeight.alturaMm,
                  preferedRunner,
                  frenteMaterialId: FRONT_MATERIALS[(n + g) % FRONT_MATERIALS.length],
                  frenteDims:
                    n % 7 === 0
                      ? {
                          larguraMm: Math.max(100, larguraInternaMm - 2),
                          alturaMm: gHeight.alturaMm,
                        }
                      : undefined,
                  dualFront: n % 11 === 0,
                  softClose: n % 5 !== 0,
                  pushOpen: n % 13 === 0,
                });
              }

              scenarios.push({
                id: padId(n + 1),
                caixa: {
                  larguraInternaMm,
                  alturaInternaMm,
                  profundidadeInternaMm,
                },
                gavetas,
                meta: {
                  modelId,
                  preferedRunner,
                  drawerCount,
                },
              });
              n += 1;
              void height;
            }
          }
        }
      }
    }
  }

  // Se a filtragem de runners deixou poucos cenários, completar com amostras forçadas
  let fill = 0;
  while (scenarios.length < targetCount && fill < targetCount * 2) {
    const wi = fill % BOX_WIDTHS_INTERNAL_MM.length;
    const di = fill % BOX_DEPTHS_INTERNAL_MM.length;
    const hi = fill % BOX_HEIGHTS_INTERNAL_MM.length;
    const mi = fill % MODEL_IDS.length;
    const ci = fill % DRAWER_COUNTS.length;
    const profundidadeInternaMm = BOX_DEPTHS_INTERNAL_MM[di]!;
    const runners = HETTICH_RUNNER_LENGTHS_MM.filter((r) => r < profundidadeInternaMm);
    const preferedRunner = runners[fill % Math.max(1, runners.length)] ?? 300;
    const modelId = MODEL_IDS[mi]!;
    const drawerCount = DRAWER_COUNTS[ci]!;
    const gavetas: EuropeanQaGavetaSpec[] = [];
    for (let g = 0; g < drawerCount; g++) {
      const gHeight = pickHeightForModel(modelId, fill + g);
      gavetas.push({
        modelId,
        alturaCode: gHeight.alturaCode,
        alturaMm: gHeight.alturaMm,
        preferedRunner,
        frenteMaterialId: FRONT_MATERIALS[(fill + g) % FRONT_MATERIALS.length],
      });
    }
    scenarios.push({
      id: padId(scenarios.length + 1),
      caixa: {
        larguraInternaMm: BOX_WIDTHS_INTERNAL_MM[wi]!,
        alturaInternaMm: BOX_HEIGHTS_INTERNAL_MM[hi]!,
        profundidadeInternaMm,
      },
      gavetas,
      meta: { modelId, preferedRunner, drawerCount },
    });
    fill += 1;
  }

  return scenarios.slice(0, targetCount);
}

/** Lista SSOT usada pelo stress runner. */
export const ALL_SCENARIOS: readonly EuropeanQaScenario[] = buildEuropeanQaScenarios(200);
