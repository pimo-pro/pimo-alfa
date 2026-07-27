/**
 * drawerModeloAGate.ts
 *
 * Helpers de camada de gavetas efectiva (pipeline clássico / Modelo A).
 * Ignora layers órfãs do antigo Modelo B se ainda existirem no JSON do projecto.
 */

import type { DrawerLayerItem } from "../../models/BoxLayers";

/**
 * Camada de gavetas efectiva para UI / cutlist / viewer / PDF.
 * Apenas layers clássicas (sem metadata.modeloB).
 */
export function resolveActiveDrawersLayer(box: {
  drawersLayer?: DrawerLayerItem[] | null;
}): DrawerLayerItem[] {
  const layer = box.drawersLayer ?? [];
  return layer.filter((d) => !d.metadata?.modeloB);
}

/**
 * Contagem efectiva de gavetas.
 */
export function resolveActiveGavetasCount(box: {
  gavetas?: number | null;
  drawersLayer?: DrawerLayerItem[] | null;
}): number {
  const activeLayer = resolveActiveDrawersLayer(box);
  if (activeLayer.length > 0) return activeLayer.length;
  return Math.max(0, Math.floor(Number(box.gavetas) || 0));
}

/**
 * True se o modulo tem gavetas activas no sistema clássico.
 */
export function boxHasActiveDrawers(box: {
  gavetas?: number | null;
  drawersLayer?: DrawerLayerItem[] | null;
}): boolean {
  return resolveActiveGavetasCount(box) > 0 || resolveActiveDrawersLayer(box).length > 0;
}

/** Modelo B desactivado no restauro — sempre false. */
export function isDrawerModeloBActive(): boolean {
  return false;
}
