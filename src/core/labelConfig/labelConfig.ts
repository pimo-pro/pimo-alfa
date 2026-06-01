/**
 * Configuração central do sistema de etiquetas v5.
 * Fase 1 — apenas tipos e defaults estáticos; sem integração com outros módulos.
 */

export interface LabelDimensions {
  totalWidth_mm: number;
  totalHeight_mm: number;
  bottomStrip_mm: number;
  qrSize_mm: number;
  qrColumnWidth_mm: number;
  materialHeight_mm: number;
  medidasHeight_mm: number;
  productionHeight_mm: number;
  observationHeight_mm: number;
}

export interface PaletteGroup {
  /** Código do grupo de palete (v5). */
  code: "D" | "O" | "OD" | "C" | "L" | "E";
}

export interface ProductionStep {
  /** Identificador da etapa de produção (v5). */
  id:
    | "nisting"
    | "manual"
    | "orlar"
    | "drill"
    | "limpezas"
    | "montagem"
    | "embalagem";
}

export interface LabelConfig {
  dimensions: LabelDimensions;
  paletteGroups: PaletteGroup[];
  productionSteps: ProductionStep[];
  /** Nomes de peças tratadas como produção manual (v5). */
  manualPieceNames: string[];
  /** Espessura (mm) abaixo da qual não se orla (v5). */
  noOrlarThickness_mm: number;
}

export const DEFAULT_LABEL_CONFIG: LabelConfig = {
  dimensions: {
    totalWidth_mm: 98,
    totalHeight_mm: 60,
    bottomStrip_mm: 10,
    qrSize_mm: 30,
    qrColumnWidth_mm: 32,
    materialHeight_mm: 8,
    medidasHeight_mm: 5,
    productionHeight_mm: 20,
    observationHeight_mm: 5,
  },
  paletteGroups: [
    { code: "D" },
    { code: "O" },
    { code: "OD" },
    { code: "C" },
    { code: "L" },
    { code: "E" },
  ],
  productionSteps: [
    { id: "nisting" },
    { id: "manual" },
    { id: "orlar" },
    { id: "drill" },
    { id: "limpezas" },
    { id: "montagem" },
    { id: "embalagem" },
  ],
  manualPieceNames: ["SPURT_TRAS", "ENCHIMENTO"],
  noOrlarThickness_mm: 10,
};
