/**
 * Constantes de dimensões de painéis MDF.
 * LF = comprimento, HF = altura, SF = espessura (conforme ficheiro .tcn).
 * Utilizado em: Layout de Corte PRO, export .tcn, Configurações.
 */

/** Padrão MDF Branco PT: 2800×2070×19 mm */
export const PANEL_DEFAULT_LF_MM = 2800;
export const PANEL_DEFAULT_HF_MM = 2070;
export const PANEL_DEFAULT_SF_MM = 19;

export const PANEL_DEFAULTS = {
  largura_mm: PANEL_DEFAULT_LF_MM,
  altura_mm: PANEL_DEFAULT_HF_MM,
  espessura_mm: PANEL_DEFAULT_SF_MM,
} as const;

/** Presets de painéis disponíveis na seleção (LF×HF×SF em mm) */
export const PANEL_PRESETS = [
  { id: "2800x2070x19", lf: 2800, hf: 2070, sf: 19, label: "2800 × 2070 × 19 mm (Padrão PT)" },
  { id: "2750x1830x18", lf: 2750, hf: 1830, sf: 18, label: "2750 × 1830 × 18 mm (Padrão BR)" },
  { id: "2440x1220x19", lf: 2440, hf: 1220, sf: 19, label: "2440 × 1220 × 19 mm (Imperial 8×4)" },
  { id: "2800x2070x15", lf: 2800, hf: 2070, sf: 15, label: "2800 × 2070 × 15 mm" },
  { id: "2750x1830x15", lf: 2750, hf: 1830, sf: 15, label: "2750 × 1830 × 15 mm" },
  { id: "2750x1830x25", lf: 2750, hf: 1830, sf: 25, label: "2750 × 1830 × 25 mm" },
] as const;
