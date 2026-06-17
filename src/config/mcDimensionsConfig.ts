/**
 * Configuração independente do pipeline industrial MC (Unified Box Dimensions Overlay).
 * Persistida em localStorage — não altera settings industriais TCN/TXML.
 */

export type McDimensionsFormat = "pdf" | "svg" | "png" | "json";

export type McDimensionsConfig = {
  /** Ativa geração MC no «Gerar arquivo completo». */
  enabled: boolean;
  formats: Record<McDimensionsFormat, boolean>;
  /** Tamanho do texto das cotas (pt no PDF; px equivalente no SVG/PNG). */
  textSizePt: number;
  /** Cor das linhas de cota (hex). */
  lineColor: string;
  /** Cor de fundo do desenho (hex). */
  backgroundColor: string;
  /** Espessura das linhas (px no SVG/PNG; escala no PDF). */
  lineWidthPx: number;
  /** Margem em torno do desenho (mm). */
  marginMm: number;
  /** Escala base mm→unidade de desenho; 0 = auto-fit. */
  baseScale: number;
};

export const MC_DIMENSIONS_STORAGE_KEY = "pimo_mc_dimensions_config";

export const defaultMcDimensionsConfig: McDimensionsConfig = {
  enabled: true,
  formats: {
    pdf: true,
    svg: true,
    png: true,
    json: true,
  },
  textSizePt: 10,
  lineColor: "#1e293b",
  backgroundColor: "#ffffff",
  lineWidthPx: 1.2,
  marginMm: 18,
  baseScale: 0,
};

function toFiniteNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : fallback;
}

export function normalizeMcDimensionsConfig(
  partial?: Partial<McDimensionsConfig> | null
): McDimensionsConfig {
  const def = defaultMcDimensionsConfig;
  const formats: Partial<Record<McDimensionsFormat, boolean>> = partial?.formats ?? {};
  return {
    enabled: partial?.enabled !== false,
    formats: {
      pdf: formats.pdf !== false,
      svg: formats.svg !== false,
      png: formats.png !== false,
      json: formats.json !== false,
    },
    textSizePt: Math.max(6, toFiniteNumber(partial?.textSizePt, def.textSizePt)),
    lineColor: normalizeHex(partial?.lineColor, def.lineColor),
    backgroundColor: normalizeHex(partial?.backgroundColor, def.backgroundColor),
    lineWidthPx: Math.max(0.25, toFiniteNumber(partial?.lineWidthPx, def.lineWidthPx)),
    marginMm: Math.max(4, toFiniteNumber(partial?.marginMm, def.marginMm)),
    baseScale: Math.max(0, toFiniteNumber(partial?.baseScale, def.baseScale)),
  };
}

export function loadMcDimensionsConfig(): McDimensionsConfig {
  try {
    const raw = localStorage.getItem(MC_DIMENSIONS_STORAGE_KEY);
    if (!raw) return { ...defaultMcDimensionsConfig, formats: { ...defaultMcDimensionsConfig.formats } };
    return normalizeMcDimensionsConfig(JSON.parse(raw) as Partial<McDimensionsConfig>);
  } catch {
    return { ...defaultMcDimensionsConfig, formats: { ...defaultMcDimensionsConfig.formats } };
  }
}

export function saveMcDimensionsConfig(config: McDimensionsConfig): void {
  localStorage.setItem(MC_DIMENSIONS_STORAGE_KEY, JSON.stringify(normalizeMcDimensionsConfig(config)));
}
