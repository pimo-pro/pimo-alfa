/**
 * validateCutlist.ts ù Cutlist Modelo B.
 */

import type { DrawerCutlistItem, DrawerEuropeanModel, DrawerGeometry } from "../types";
import { euError, EU_ERROR_CODES } from "./errors";
import { emptyValidationResult, type EuropeanDrawerValidationResult } from "./types";

/**
 * Valida pecas de madeira/metal/fixacao do cutlist europeu.
 */
export function validateCutlist(
  model: DrawerEuropeanModel,
  geometry: DrawerGeometry,
  cutlist: DrawerCutlistItem[]
): EuropeanDrawerValidationResult {
  const result = emptyValidationResult();

  for (const item of cutlist) {
    if (item.quantidade < 1) {
      result.errors.push(
        euError(EU_ERROR_CODES.CUT_QTY, `Quantidade invalida em "${item.nome}".`, `cutlist.${item.id}`)
      );
    }
    if (!item.material || !String(item.material).trim()) {
      result.errors.push(
        euError(EU_ERROR_CODES.CUT_MATERIAL, `Material invalido em "${item.nome}".`, `cutlist.${item.id}`)
      );
    }

    if (item.kind === "wood") {
      if (item.larguraMm <= 0 || item.alturaMm <= 0 || item.espessuraMm <= 0) {
        result.errors.push(
          euError(EU_ERROR_CODES.CUT_DIM, `Dimensao <= 0 em peca madeira "${item.nome}".`, `cutlist.${item.id}`)
        );
      }
      if (item.tipo === "gaveta_frente") {
        if (Math.abs(item.larguraMm - geometry.front.widthMm) > 1.5) {
          result.errors.push(
            euError(EU_ERROR_CODES.CUT_WOOD, `Frente cutlist diverge da geometria.`, `cutlist.${item.id}`)
          );
        }
      }
      if (item.tipo === "gaveta_fundo") {
        if (Math.abs(item.larguraMm - geometry.bottom.widthMm) > 1.5) {
          result.errors.push(
            euError(EU_ERROR_CODES.CUT_WOOD, `Fundo cutlist diverge da geometria.`, `cutlist.${item.id}`)
          );
        }
      }
    }

    if (item.kind === "metal") {
      const okMetal =
        item.material === model.displayName ||
        item.material === model.brand ||
        item.nome.includes(model.displayName);
      if (!okMetal) {
        result.errors.push(
          euError(
            EU_ERROR_CODES.CUT_METAL,
            `Peca metalica nao corresponde ao modelo ${model.displayName}.`,
            `cutlist.${item.id}`
          )
        );
      }
      if (item.larguraMm <= 0 || item.alturaMm <= 0) {
        result.errors.push(
          euError(EU_ERROR_CODES.CUT_DIM, `Dimensao invalida na caixa metalica.`, `cutlist.${item.id}`)
        );
      }
    }
  }

  result.valid = result.errors.length === 0;
  return result;
}
