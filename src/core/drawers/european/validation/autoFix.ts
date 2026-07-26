/**
 * autoFix.ts — Correcoes automaticas seguras (Modelo B).
 * Nunca altera o catalogo oficial — apenas EuropeanDrawerBoxConfig.
 */

import type {
  DrawerEuropeanModel,
  EuropeanDrawerBoxConfig,
  EuropeanDrawerBoxInput,
} from "../types";
import { findHeightProfile, findNearestDepthMm } from "../catalog";
import { calcUsefulCabinetHeightMm } from "../geometry";
import { pickRunnerDepthMm } from "../measures";
import type { EuropeanDrawerAutoFixAction } from "./types";
import type { EuropeanDrawerValidationError } from "./errors";
import { EU_ERROR_CODES } from "./errors";

/**
 * Constroi lista de auto-fixes a partir dos erros detectados + geometria da caixa.
 */
export function buildEuropeanAutoFixes(
  box: EuropeanDrawerBoxInput,
  model: DrawerEuropeanModel,
  config: EuropeanDrawerBoxConfig,
  errors: EuropeanDrawerValidationError[]
): EuropeanDrawerAutoFixAction[] {
  const fixes: EuropeanDrawerAutoFixAction[] = [];
  const codes = new Set(errors.map((e) => e.code));

  if (codes.has(EU_ERROR_CODES.BOX_DEPTH) || codes.has(EU_ERROR_CODES.DIM_BOTTOM)) {
    fixes.push({
      code: "FIX_DEPTH_FIT",
      description: "Ajustar profundidade do runner para caber na caixa (valor de catalogo).",
      apply: (cfg) => {
        const fitted = pickRunnerDepthMm(model, cfg.depthMm, box.dimensoes.profundidade, box.espessura);
        const snapped = findNearestDepthMm(model, fitted);
        // Preferir o maior runner que ainda cabe
        const internalDepth = Math.max(0, box.dimensoes.profundidade - box.espessura - 20);
        const candidates = model.depthsMm.filter((d) => d <= internalDepth + 0.5);
        const best = candidates.length > 0 ? candidates[candidates.length - 1]! : snapped;
        return { ...cfg, depthMm: best };
      },
    });
  }

  if (codes.has(EU_ERROR_CODES.BOX_HEIGHT) || codes.has(EU_ERROR_CODES.DIM_USEFUL_HEIGHT)) {
    fixes.push({
      code: "FIX_HEIGHT_OR_COUNT",
      description: "Reduzir quantidade ou altura de catalogo para caber na altura util.",
      apply: (cfg) => {
        const useful = calcUsefulCabinetHeightMm(box);
        const gap = 6;
        let count = Math.max(1, Math.floor(cfg.count ?? 1));
        let height = cfg.heightMm;

        const fits = (c: number, h: number) => c * h + Math.max(0, c - 1) * gap <= useful + 0.5;

        // 1) reduzir count
        while (count > 1 && !fits(count, height)) count -= 1;

        // 2) se ainda nao cabe, descer na lista de alturas do catalogo
        if (!fits(count, height)) {
          const sorted = [...model.heights].sort((a, b) => b.heightMm - a.heightMm);
          for (const h of sorted) {
            if (fits(count, h.heightMm)) {
              height = h.heightMm;
              break;
            }
          }
          // ultimo recurso: menor altura + count 1
          if (!fits(count, height)) {
            const smallest = model.heights.reduce((a, b) => (a.heightMm < b.heightMm ? a : b));
            height = smallest.heightMm;
            count = 1;
          }
        }

        const profile = findHeightProfile(model, height);
        return {
          ...cfg,
          count,
          heightMm: profile.heightMm,
          heightCode: profile.code || cfg.heightCode,
        };
      },
    });
  }

  if (codes.has(EU_ERROR_CODES.HOLE_SETBACK) || codes.has(EU_ERROR_CODES.DIM_FRONT_SETBACK)) {
    fixes.push({
      code: "FIX_FRONT_SETBACK_NOTE",
      description: "Re-snap profundidade/altura ao catalogo para regenerar frente com setback oficial.",
      apply: (cfg) => {
        const depth = findNearestDepthMm(model, cfg.depthMm);
        const height = findHeightProfile(model, cfg.heightMm);
        return {
          ...cfg,
          depthMm: depth,
          heightMm: height.heightMm,
          heightCode: height.code || cfg.heightCode,
        };
      },
    });
  }

  if (codes.has(EU_ERROR_CODES.HOLE_BOTTOM_GAP) || codes.has(EU_ERROR_CODES.HOLE_PITCH32)) {
    fixes.push({
      code: "FIX_HOLE_PATTERN_REGEN",
      description: "Normalizar config ao catalogo para regenerar padrao de furos oficial.",
      apply: (cfg) => {
        const depth = findNearestDepthMm(model, cfg.depthMm);
        const height = findHeightProfile(model, cfg.heightMm);
        return { ...cfg, depthMm: depth, heightMm: height.heightMm, heightCode: height.code || undefined };
      },
    });
  }

  // Tolerancias minimas: garantir count >= 1 e depth no catalogo
  fixes.push({
    code: "FIX_MIN_TOLERANCE_NORMALIZE",
    description: "Normalizar count/depth/height aos valores minimos validos do catalogo.",
    apply: (cfg) => {
      const depth = findNearestDepthMm(model, Math.max(model.depthProfile.minMm, cfg.depthMm));
      const height = findHeightProfile(model, cfg.heightMm);
      return {
        ...cfg,
        count: Math.max(1, Math.floor(cfg.count ?? 1)),
        depthMm: depth,
        heightMm: height.heightMm,
        heightCode: height.code || cfg.heightCode,
        softClose: cfg.softClose ?? true,
        pushOpen: cfg.pushOpen ?? false,
      };
    },
  });

  // Dedup by code
  const seen = new Set<string>();
  return fixes.filter((f) => {
    if (seen.has(f.code)) return false;
    seen.add(f.code);
    return true;
  });
}

/** Aplica todas as acoes em sequencia. */
export function applyEuropeanAutoFixes(
  config: EuropeanDrawerBoxConfig,
  fixes: EuropeanDrawerAutoFixAction[]
): EuropeanDrawerBoxConfig {
  return fixes.reduce((cfg, fix) => fix.apply(cfg), { ...config });
}
