/**
 * safetyCutlistGate.ts — Bloqueia cutlist sem identidade/dims industriais válidas.
 */

import type { DrawerCutlistItem } from "../types";
import { isCanonicalEuropeanCode } from "../consistency/namingMap";
import { finalizeGate, issue, type EuropeanSafetyGateResult } from "./safetyReport";

function isWoodLike(item: DrawerCutlistItem): boolean {
  return item.kind === "wood";
}

/**
 * Gate de cutlist: nome/código industrial, espessura, qty, dims.
 * kind optional/hardware/metal: regras mais leves (corpo pode ter espessura 0).
 * Soft-close / push-open / corrediça não exigem código gav_*.
 */
export function runSafetyCutlistGate(cutlist: DrawerCutlistItem[]): EuropeanSafetyGateResult {
  const t0 = performance.now();
  const errors = [];
  const warnings = [];

  for (const item of cutlist) {
    const tag = item.codigo || item.nome || item.id;

    if (!(item.quantidade > 0) || !Number.isFinite(item.quantidade)) {
      errors.push(
        issue("cutlist", "error", "QTY_INVALID", `Quantidade <= 0: ${item.quantidade}`, tag)
      );
    }

    if (isWoodLike(item)) {
      if (!item.nome?.trim()) {
        errors.push(issue("cutlist", "error", "NAME_MISSING", "Peca sem nome industrial", tag));
      }
      if (!item.codigo?.trim()) {
        errors.push(issue("cutlist", "error", "CODE_MISSING", "Peca sem codigo industrial", tag));
      } else if (!isCanonicalEuropeanCode(item.codigo)) {
        errors.push(
          issue("cutlist", "error", "CODE_NOT_CANONICAL", `Codigo nao canonico: ${item.codigo}`, tag)
        );
      }
      if (!(item.espessuraMm > 0) || !Number.isFinite(item.espessuraMm)) {
        errors.push(
          issue("cutlist", "error", "THICKNESS_INVALID", `Espessura invalida: ${item.espessuraMm}`, tag)
        );
      }
      for (const [label, v] of [
        ["larguraMm", item.larguraMm],
        ["alturaMm", item.alturaMm],
        ["profundidadeMm", item.profundidadeMm],
      ] as const) {
        if (!(v > 0) || !Number.isFinite(v)) {
          errors.push(
            issue("cutlist", "error", "DIM_NON_POSITIVE", `${label} <= 0 ou NaN: ${v}`, tag)
          );
        }
      }
    } else if (item.kind === "optional" && item.tipo === "gaveta_corpo") {
      if (!item.nome?.trim() || !item.codigo?.trim()) {
        errors.push(
          issue("cutlist", "error", "OPTIONAL_IDENTITY", "Linha optional sem nome/codigo", tag)
        );
      } else if (!isCanonicalEuropeanCode(item.codigo)) {
        warnings.push(
          issue("cutlist", "warning", "OPTIONAL_CODE", `Codigo optional suspeito: ${item.codigo}`, tag)
        );
      }
    }
  }

  return finalizeGate("cutlist", t0, errors, warnings);
}
