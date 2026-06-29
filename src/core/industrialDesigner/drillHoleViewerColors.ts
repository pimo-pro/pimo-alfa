/**
 * Cores de visualização de furos no viewer (modo design industrial).
 */

import type { DrillType } from "../types";

/** Hex 0xRRGGBB para THREE.LineBasicMaterial.color */
export const DRILL_HOLE_VIEWER_COLORS = {
  cavilha: 0x38bdf8,
  dobradica: 0x4ade80,
  tecnico: 0xfacc15,
  parafuso: 0xfb923c,
  fixacaoEstrutural: 0xef4444,
  default: 0xe2e8f0,
} as const;

export const INDUSTRIAL_DESIGN_PANEL_SELECTION_COLOR = 0x3b82f6;
export const INDUSTRIAL_DESIGN_PANEL_ERROR_COLOR = 0xff3344;
export const INDUSTRIAL_DESIGN_PAIRING_LINE_COLOR = 0xc8d0dc;

const DOBRADICA_TYPES = new Set<DrillType>([
  "dobradica",
  "dobradica_fixacao",
  "dobradica_parafuso_uniao",
]);

const TECNICO_TYPES = new Set<DrillType>([
  "prateleira",
  "corredica",
  "puxador",
]);

const FIXACAO_TYPES = new Set<DrillType>([
  "fixacao_estrutural",
  "fixacao_metalica",
  "minifix",
]);

export function resolveDrillHoleViewerColorHex(tipo: DrillType | string | undefined): number {
  const t = String(tipo ?? "");
  if (t === "cavilha") return DRILL_HOLE_VIEWER_COLORS.cavilha;
  if (DOBRADICA_TYPES.has(t as DrillType)) return DRILL_HOLE_VIEWER_COLORS.dobradica;
  if (TECNICO_TYPES.has(t as DrillType)) return DRILL_HOLE_VIEWER_COLORS.tecnico;
  if (t === "parafuso") return DRILL_HOLE_VIEWER_COLORS.parafuso;
  if (FIXACAO_TYPES.has(t as DrillType)) return DRILL_HOLE_VIEWER_COLORS.fixacaoEstrutural;
  return DRILL_HOLE_VIEWER_COLORS.default;
}

export type PanelOutlineHighlight = "default" | "selected" | "error";

export function resolvePanelOutlineHighlight(
  hasValidationError: boolean,
  isSelected: boolean
): PanelOutlineHighlight {
  if (hasValidationError) return "error";
  if (isSelected) return "selected";
  return "default";
}

export function resolvePanelOutlineColorHex(highlight: PanelOutlineHighlight): number | null {
  if (highlight === "error") return INDUSTRIAL_DESIGN_PANEL_ERROR_COLOR;
  if (highlight === "selected") return INDUSTRIAL_DESIGN_PANEL_SELECTION_COLOR;
  return null;
}
