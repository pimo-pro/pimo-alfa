/**
 * drawerModeloAGate.ts
 *
 * Gates de runtime do Modelo A (sistema atual de gavetas).
 * Quando o Modelo A está desativado, estas funções devolvem valores “vazios”
 * sem apagar dados do projeto nem código do domínio.
 */

import type { DrawerLayerItem } from "../../models/BoxLayers";
import { isDrawerModeloAActive } from "./drawerSystemFlags";

/**
 * Camada de gavetas efetiva para UI / cutlist / viewer / PDF.
 * Preserva `box.drawersLayer` no estado; apenas ignora quando Modelo A está off.
 */
export function resolveActiveDrawersLayer(box: {
  drawersLayer?: DrawerLayerItem[] | null;
}): DrawerLayerItem[] {
  if (!isDrawerModeloAActive()) return [];
  return box.drawersLayer ?? [];
}

/**
 * Contagem efetiva de gavetas (campo `gavetas`).
 */
export function resolveActiveGavetasCount(box: { gavetas?: number | null }): number {
  if (!isDrawerModeloAActive()) return 0;
  return Math.max(0, Math.floor(Number(box.gavetas) || 0));
}

/**
 * True se o módulo tem gavetas ativas sob o Modelo A.
 */
export function boxHasActiveDrawers(box: {
  gavetas?: number | null;
  drawersLayer?: DrawerLayerItem[] | null;
}): boolean {
  if (!isDrawerModeloAActive()) return false;
  return resolveActiveGavetasCount(box) > 0 || resolveActiveDrawersLayer(box).length > 0;
}
