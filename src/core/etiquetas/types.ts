import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import type { SettingsSchema } from "../settings/settingsService";
import type { LabelDesignerConfig } from "../labelDesigner/labelDesignerTypes";
import type { PieceOrlaConfigInput } from "../labelConfig/labelSequenceEngine";
import type { LabelSheetPlacement } from "./qr/etiquetaCodeV5";
import type { LabelSystemV5 } from "../labelSystem/LabelSystemV5";

/** Entrada unificada do UnifiedEtiquetaEngine (UEE). */
export type UnifiedEtiquetaProjectInput = {
  projectName: string;
  boxes: BoxModule[];
  rules: RulesConfig;
  materialId?: string;
  extractedPartsByBoxId?: Record<string, Record<string, CutListItemComPreco[]>>;
  settings?: SettingsSchema;
  cutLayoutPlacements?: LabelSheetPlacement[];
  /** Ignorado em produção — ver `shouldUseDesignerInProductionExport`. */
  designerConfig?: LabelDesignerConfig;
  precomputedItems?: CutListItemComPreco[];
  orlaPiecesByPanelId?: Record<string, PieceOrlaConfigInput>;
  /**
   * Configuração unificada de etiquetas v5 (LabelSystemV5).
   * Quando presente, o UEE usa-a como SSOT em vez de resolver regras legadas.
   */
  labelSystemV5?: LabelSystemV5;
};

export type { LabelSheetPlacement };
