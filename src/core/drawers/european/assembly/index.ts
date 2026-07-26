/**
 * assembly/ — Regras de montagem do Sistema Europeu (Modelo B).
 */

import type {
  DrawerAssemblyRules,
  DrawerEuropeanModel,
  EuropeanDrawerBoxConfig,
  EuropeanDrawerBoxInput,
} from "../types";
import { calcUsefulCabinetHeightMm } from "../geometry";
import { calcDrawerInternalWidthMm } from "../measures";

export function getAssemblyRules(model: DrawerEuropeanModel): DrawerAssemblyRules {
  return { ...model.assembly, warnings: [...model.assembly.warnings] };
}

export function validateEuropeanDrawerBox(
  box: EuropeanDrawerBoxInput,
  model: DrawerEuropeanModel,
  config: EuropeanDrawerBoxConfig
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [...model.assembly.warnings];

  const count = Math.max(1, Math.floor(config.count ?? box.gavetas ?? 1));
  const usefulH = calcUsefulCabinetHeightMm(box);
  const needed = count * config.heightMm + Math.max(0, count - 1) * 6;

  if (config.heightMm <= 0) errors.push("Altura do sistema invalida.");
  if (!model.heights.some((h) => h.heightMm === config.heightMm)) {
    warnings.push(`Altura ${config.heightMm} mm nao e um codigo exacto do catalogo ${model.displayName}.`);
  }
  if (config.depthMm < model.depthProfile.minMm || config.depthMm > model.depthProfile.maxMm) {
    errors.push(
      `Profundidade ${config.depthMm} mm fora da gama ${model.depthProfile.minMm}–${model.depthProfile.maxMm} mm.`
    );
  }
  if (needed > usefulH + 0.5) {
    errors.push(
      `Altura insuficiente no modulo: necessario ~${needed.toFixed(0)} mm, disponivel ~${usefulH.toFixed(0)} mm.`
    );
  }

  const internal = calcDrawerInternalWidthMm(box, model);
  if (internal < 150) {
    errors.push(`Largura interna do corpo demasiado estreita (${internal.toFixed(0)} mm). Minimo recomendado 150 mm.`);
  }

  if (config.pushOpen && config.softClose) {
    warnings.push("Push-Open e Soft-Close activos em simultaneo — confirmar ferragem combinada do fabricante.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function buildAssemblyChecklist(model: DrawerEuropeanModel, config: EuropeanDrawerBoxConfig): string[] {
  const list = [...model.assembly.order];
  if (config.softClose) list.push("6. Verificar amortecimento Soft-Close");
  if (config.pushOpen) list.push("7. Regular tip-on / Push-Open");
  return list;
}
