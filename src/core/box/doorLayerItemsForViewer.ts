import type { DoorLayerItem } from "../../models/BoxLayers";

/** Compensa Z das portas quando a carcaça usa profundidade útil centrada. */
export function doorLayerItemsForViewer(
  items: DoorLayerItem[],
  profundidadeExternaMm: number,
  profundidadeInternaUtilMm: number
): DoorLayerItem[] {
  if (items.length === 0) return items;
  const dzMm = (profundidadeInternaUtilMm - profundidadeExternaMm) / 2;
  if (dzMm === 0) return items;
  return items.map((d) => ({
    ...d,
    posZ: (d.posZ ?? 0) + dzMm,
  }));
}
