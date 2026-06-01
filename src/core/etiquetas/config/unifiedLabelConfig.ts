import {
  DEFAULT_LABEL_CONFIG,
  type LabelConfig,
  type PaletteGroup,
  type ProductionStep,
} from "../../labelConfig/labelConfig";
import type { RulesConfig, LabelV5RulesConfig } from "../../rules/rulesConfig";

/**
 * Configuração unificada do UEE: merge `rules.labelV5` + defaults + overrides de `rules.etiqueta` (QR).
 */
export function resolveUnifiedLabelConfig(rules: RulesConfig): LabelConfig {
  const base = DEFAULT_LABEL_CONFIG;
  const v5 = rules.labelV5 ?? ({} as Partial<LabelV5RulesConfig>);

  const paletteGroups: PaletteGroup[] =
    v5.paletteGroups && v5.paletteGroups.length > 0
      ? v5.paletteGroups.map((g) => ({ code: g.code }))
      : base.paletteGroups.map((g) => ({ ...g }));

  const productionSteps: ProductionStep[] =
    v5.productionSteps && v5.productionSteps.length > 0
      ? v5.productionSteps
          .slice()
          .sort((a, b) => a.defaultOrder - b.defaultOrder)
          .map((s) => ({ id: s.id }))
      : base.productionSteps.map((s) => ({ ...s }));

  const manualPieceNames =
    v5.manualPieceNames && v5.manualPieceNames.length > 0
      ? [...v5.manualPieceNames]
      : [...base.manualPieceNames];

  const qrSize = rules.etiqueta?.tamanhoQr;
  const qrFromRules =
    typeof qrSize === "number" && Number.isFinite(qrSize) && qrSize > 0 ? qrSize : base.dimensions.qrSize_mm;

  return {
    dimensions: {
      totalWidth_mm: base.dimensions.totalWidth_mm,
      totalHeight_mm: base.dimensions.totalHeight_mm,
      bottomStrip_mm: v5.bottomStrip_mm ?? base.dimensions.bottomStrip_mm,
      qrSize_mm: qrFromRules,
      qrColumnWidth_mm: base.dimensions.qrColumnWidth_mm,
      materialHeight_mm: v5.materialHeight_mm ?? base.dimensions.materialHeight_mm,
      medidasHeight_mm: v5.medidasHeight_mm ?? base.dimensions.medidasHeight_mm,
      productionHeight_mm: v5.productionHeight_mm ?? base.dimensions.productionHeight_mm,
      observationHeight_mm: v5.observationHeight_mm ?? base.dimensions.observationHeight_mm,
    },
    paletteGroups,
    productionSteps,
    manualPieceNames,
    noOrlarThickness_mm: v5.noOrlarThickness_mm ?? base.noOrlarThickness_mm,
  };
}
