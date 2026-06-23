/**
 * Posicionamento automático de puxadores na frente da gaveta.
 * Fonte única para furação, cutlist, XML e 3D.
 */

import type { DrawerHandlePosition } from "../settings/settingsSchema";

export type HandlePlacementInput = {
  larguraMm: number;
  alturaMm: number;
  handlePosition?: DrawerHandlePosition;
  handlePositionPercent?: number;
  handleOffsetXMm?: number;
  handleOffsetYMm?: number;
  /** Legado — equivale a handleOffsetYMm quando este não está definido. */
  handleOffsetMm?: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const EDGE_INSET_MM = 40;
const SAFE_MARGIN_MM = 20;

/** Y do centro do puxador/rasgo (mm, origem no topo da peça). */
export function resolveHandlePlacementY(input: HandlePlacementInput): number {
  const { alturaMm } = input;
  const position = input.handlePosition ?? "Centro";

  let yBase: number;
  switch (position) {
    case "Topo":
      yBase = EDGE_INSET_MM;
      break;
    case "Inferior":
      yBase = alturaMm - EDGE_INSET_MM;
      break;
    case "Percentual": {
      const pct = clamp(input.handlePositionPercent ?? 50, 5, 95);
      yBase = (alturaMm * pct) / 100;
      break;
    }
    case "Centro":
    default:
      yBase = alturaMm / 2;
  }

  const offsetY = input.handleOffsetYMm ?? input.handleOffsetMm ?? 0;
  return clamp(yBase + offsetY, SAFE_MARGIN_MM, Math.max(SAFE_MARGIN_MM, alturaMm - SAFE_MARGIN_MM));
}

/** X do centro do puxador (mm, origem à esquerda). */
export function resolveHandlePlacementX(input: HandlePlacementInput): number {
  const offsetX = input.handleOffsetXMm ?? 0;
  return clamp(
    input.larguraMm / 2 + offsetX,
    SAFE_MARGIN_MM,
    Math.max(SAFE_MARGIN_MM, input.larguraMm - SAFE_MARGIN_MM)
  );
}
