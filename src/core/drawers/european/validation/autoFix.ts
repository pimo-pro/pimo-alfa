/**
 * autoFix.ts — Correções automáticas seguras (Modelo B).
 * Nunca altera o catálogo oficial — apenas EuropeanDrawerBoxConfig.
 */

import type {
  DrawerEuropeanModel,
  EuropeanDrawerBoxConfig,
  EuropeanDrawerBoxInput,
} from "../types";
import { findHeightProfile } from "../catalog";
import { calcUsefulCabinetHeightMm } from "../geometry";
import {
  HETTICH_RUNNER_LENGTHS_MM,
  pickHettichRunnerForBox,
  resolveEuropeanUsefulInternalDepthMm,
} from "../measures";
import type { EuropeanDrawerAutoFixAction } from "./types";
import type { EuropeanDrawerValidationError } from "./errors";
import { EU_ERROR_CODES } from "./errors";

/**
 * Constrói lista de auto-fixes a partir dos erros detectados + geometria da caixa.
 */
export function buildEuropeanAutoFixes(
  box: EuropeanDrawerBoxInput,
  model: DrawerEuropeanModel,
  config: EuropeanDrawerBoxConfig,
  errors: EuropeanDrawerValidationError[]
): EuropeanDrawerAutoFixAction[] {
  const fixes: EuropeanDrawerAutoFixAction[] = [];
  const codes = new Set(errors.map((e) => e.code));
  void config;

  if (codes.has(EU_ERROR_CODES.BOX_DEPTH) || codes.has(EU_ERROR_CODES.DIM_BOTTOM)) {
    fixes.push({
      code: "FIX_DEPTH_FIT",
      description: "Ajustar corrediça Hettich (maior comprimento < profundidade útil interna).",
      apply: (cfg) => {
        const useful = resolveEuropeanUsefulInternalDepthMm(box);
        const best = pickHettichRunnerForBox({ ...box, profundidadeInternaUtilMm: useful });
        return { ...cfg, depthMm: best };
      },
    });
  }

  if (codes.has(EU_ERROR_CODES.BOX_HEIGHT) || codes.has(EU_ERROR_CODES.DIM_USEFUL_HEIGHT)) {
    fixes.push({
      code: "FIX_HEIGHT_OR_COUNT",
      description: "Reduzir quantidade ou altura de catálogo para caber na altura útil.",
      apply: (cfg) => {
        const useful = calcUsefulCabinetHeightMm(box);
        const gap = 6;
        let count = Math.max(1, Math.floor(cfg.count ?? 1));
        let height = cfg.heightMm;

        const fits = (c: number, h: number) => c * h + Math.max(0, c - 1) * gap <= useful + 0.5;

        while (count > 1 && !fits(count, height)) count -= 1;

        if (!fits(count, height)) {
          const sorted = [...model.heights].sort((a, b) => b.heightMm - a.heightMm);
          for (const h of sorted) {
            if (fits(count, h.heightMm)) {
              height = h.heightMm;
              break;
            }
          }
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
      description: "Re-snap profundidade Hettich / altura para regenerar frente.",
      apply: (cfg) => {
        const useful = resolveEuropeanUsefulInternalDepthMm(box);
        const depth = pickHettichRunnerForBox({ ...box, profundidadeInternaUtilMm: useful });
        const height = findHeightProfile(model, cfg.heightMm);
        return {
          ...cfg,
          depthMm: depth,
          heightMm: height.heightMm,
          heightCode: height.code || cfg.heightCode,
          frontWidthMm: undefined,
        };
      },
    });
  }

  if (codes.has(EU_ERROR_CODES.HOLE_BOTTOM_GAP) || codes.has(EU_ERROR_CODES.HOLE_PITCH32)) {
    fixes.push({
      code: "FIX_HOLE_PATTERN_REGEN",
      description: "Normalizar config Hettich para regenerar padrão de furos.",
      apply: (cfg) => {
        const useful = resolveEuropeanUsefulInternalDepthMm(box);
        const depth = pickHettichRunnerForBox({ ...box, profundidadeInternaUtilMm: useful });
        const height = findHeightProfile(model, cfg.heightMm);
        return { ...cfg, depthMm: depth, heightMm: height.heightMm, heightCode: height.code || undefined };
      },
    });
  }

  fixes.push({
    code: "FIX_MIN_TOLERANCE_NORMALIZE",
    description: "Normalizar count/depth/height aos valores Hettich válidos.",
    apply: (cfg) => {
      const useful = resolveEuropeanUsefulInternalDepthMm(box);
      let depth = pickHettichRunnerForBox({ ...box, profundidadeInternaUtilMm: useful });
      if (
        (HETTICH_RUNNER_LENGTHS_MM as readonly number[]).includes(cfg.depthMm) &&
        cfg.depthMm < useful
      ) {
        depth = cfg.depthMm;
      }
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

  const seen = new Set<string>();
  return fixes.filter((f) => {
    if (seen.has(f.code)) return false;
    seen.add(f.code);
    return true;
  });
}

/** Aplica todas as ações em sequência. */
export function applyEuropeanAutoFixes(
  config: EuropeanDrawerBoxConfig,
  fixes: EuropeanDrawerAutoFixAction[]
): EuropeanDrawerBoxConfig {
  return fixes.reduce((cfg, fix) => fix.apply(cfg), { ...config });
}
