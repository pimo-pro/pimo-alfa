/**
 * drawerModeloAGate.ts
 *
 * Gates de runtime do Modelo A / B.
 * - Modelo A activo: layers classicas (exclui metadata.modeloB)
 * - Modelo A desactivado: apenas layers do Sistema Europeu (Modelo B)
 */

import type { DrawerLayerItem } from "../../models/BoxLayers";
import { isDrawerModeloAActive } from "./drawerSystemFlags";

/**
 * Camada de gavetas efetiva para UI / cutlist / viewer / PDF.
 */
export function resolveActiveDrawersLayer(box: {
  drawersLayer?: DrawerLayerItem[] | null;
}): DrawerLayerItem[] {
  const layer = box.drawersLayer ?? [];
  if (isDrawerModeloAActive()) {
    return layer.filter((d) => !d.metadata?.modeloB);
  }
  return layer.filter((d) => d.metadata?.modeloB === true);
}

/**
 * Contagem efetiva de gavetas.
 */
export function resolveActiveGavetasCount(box: {
  gavetas?: number | null;
  drawersLayer?: DrawerLayerItem[] | null;
}): number {
  const activeLayer = resolveActiveDrawersLayer(box);
  if (activeLayer.length > 0) return activeLayer.length;
  if (!isDrawerModeloAActive()) {
    return Math.max(0, Math.floor(Number(box.gavetas) || 0));
  }
  return Math.max(0, Math.floor(Number(box.gavetas) || 0));
}

/**
 * True se o modulo tem gavetas activas no sistema vigente (A ou B).
 */
export function boxHasActiveDrawers(box: {
  gavetas?: number | null;
  drawersLayer?: DrawerLayerItem[] | null;
}): boolean {
  return resolveActiveGavetasCount(box) > 0 || resolveActiveDrawersLayer(box).length > 0;
}

/** True quando o Sistema Europeu (Modelo B) esta o pipeline activo. */
export function isDrawerModeloBActive(): boolean {
  return !isDrawerModeloAActive();
}
