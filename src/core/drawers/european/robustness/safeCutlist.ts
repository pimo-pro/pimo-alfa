/**
 * safeCutlist.ts — Filtra peças cutlist inválidas sem alterar válidas.
 */

import type { DrawerCutlistItem } from "../types";
import { ensureArray, isFinitePositive, robustDebug } from "./safeNumbers";

function isWoodPieceValid(item: DrawerCutlistItem): boolean {
  if (item.quantidade < 1 || !Number.isFinite(item.quantidade)) return false;
  // Corpo opcional pode ter espessura 0 (linha de grupo)
  if (item.tipo === "gaveta_corpo" || item.kind === "optional" || item.kind === "hardware") {
    return (
      Number.isFinite(item.larguraMm) &&
      Number.isFinite(item.alturaMm) &&
      Number.isFinite(item.espessuraMm) &&
      item.quantidade >= 1
    );
  }
  if (item.kind !== "wood") return true;
  return (
    isFinitePositive(item.larguraMm) &&
    isFinitePositive(item.alturaMm) &&
    isFinitePositive(item.espessuraMm) &&
    item.quantidade >= 1
  );
}

/**
 * Remove peças madeira com dims ?0 / NaN. Mantém restantes intactas.
 */
export function sanitizeCutlist(items: DrawerCutlistItem[] | null | undefined): DrawerCutlistItem[] {
  const list = ensureArray(items, "cutlist");
  const out: DrawerCutlistItem[] = [];
  for (const item of list) {
    if (!isWoodPieceValid(item)) {
      robustDebug("cutlist", `peça omitida (dims/qty inválidos)`, {
        id: item.id,
        tipo: item.tipo,
        L: item.larguraMm,
        A: item.alturaMm,
        E: item.espessuraMm,
        qty: item.quantidade,
      });
      continue;
    }
    out.push(item);
  }
  return out;
}
