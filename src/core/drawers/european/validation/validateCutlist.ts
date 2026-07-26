/**
 * validateCutlist.ts — Cutlist Modelo B (nomes/códigos industriais).
 */

import type { DrawerCutlistItem, DrawerEuropeanModel, DrawerGeometry } from "../types";
import { euError, EU_ERROR_CODES } from "./errors";
import { emptyValidationResult, type EuropeanDrawerValidationResult } from "./types";

const REQUIRED_WOOD_TIPOS = [
  "gaveta_frente",
  "gaveta_lat_esq",
  "gaveta_lat_dir",
  "gaveta_traseira",
  "gaveta_fundo",
] as const;

/**
 * Valida peças de madeira/hardware do cutlist europeu.
 */
export function validateCutlist(
  _model: DrawerEuropeanModel,
  geometry: DrawerGeometry,
  cutlist: DrawerCutlistItem[]
): EuropeanDrawerValidationResult {
  const result = emptyValidationResult();
  void _model;

  const woodTipos = new Set(cutlist.filter((i) => i.kind === "wood").map((i) => i.tipo));
  for (const tipo of REQUIRED_WOOD_TIPOS) {
    if (!woodTipos.has(tipo)) {
      result.errors.push(
        euError(EU_ERROR_CODES.CUT_WOOD, `Cutlist sem peça obrigatória "${tipo}".`, `cutlist.${tipo}`)
      );
    }
  }

  for (const item of cutlist) {
    if (item.quantidade < 1) {
      result.errors.push(
        euError(EU_ERROR_CODES.CUT_QTY, `Quantidade inválida em "${item.nome}".`, `cutlist.${item.id}`)
      );
    }
    if (item.kind !== "optional" && (!item.material || !String(item.material).trim())) {
      result.errors.push(
        euError(EU_ERROR_CODES.CUT_MATERIAL, `Material inválido em "${item.nome}".`, `cutlist.${item.id}`)
      );
    }

    if (item.kind === "wood") {
      if (item.larguraMm <= 0 || item.alturaMm <= 0 || item.espessuraMm <= 0) {
        result.errors.push(
          euError(EU_ERROR_CODES.CUT_DIM, `Dimensão <= 0 em peça madeira "${item.nome}".`, `cutlist.${item.id}`)
        );
      }
      if (!item.codigo) {
        result.errors.push(
          euError(EU_ERROR_CODES.CUT_WOOD, `Código industrial em falta em "${item.nome}".`, `cutlist.${item.id}`)
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
      if (item.tipo === "gaveta_lat_esq" || item.tipo === "gaveta_lat_dir") {
        if (Math.abs(item.larguraMm - geometry.bodyDepthMm) > 1.5) {
          result.errors.push(
            euError(EU_ERROR_CODES.CUT_WOOD, `Lateral cutlist diverge da profundidade do corpo.`, `cutlist.${item.id}`)
          );
        }
      }
    }
  }

  result.valid = result.errors.length === 0;
  return result;
}
