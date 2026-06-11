import type { ComponentType } from "react";
import { CostRulesEditor } from "./costRules/rulesEditor";
import { SnapRulesEditor } from "./snapRules/rulesEditor";
import { RoomRulesEditor } from "./roomRules/rulesEditor";
import { AutoFillRulesEditor } from "./autoFillRules/rulesEditor";
import { DesignerRulesEditor } from "./designerRules/rulesEditor";
import { StyleRulesEditor } from "./styleRules/rulesEditor";
import { ConversationRulesEditor } from "./conversationRules/rulesEditor";
import { ErgonomicsRulesEditor } from "./ergonomicsRules/rulesEditor";
import { ManufacturingRulesEditor } from "./manufacturingRules/rulesEditor";
import { VariationRulesEditor } from "./variationRules/rulesEditor";
import { PredictiveRulesEditor } from "./predictiveRules/rulesEditor";
import { DistributionRulesEditor } from "./distributionRules/rulesEditor";
import { ShelfRulesEditor } from "./shelfRules/rulesEditor";
import { LayoutRulesEditor } from "./layoutRules/rulesEditor";
import { ScoringRulesEditor } from "./scoringRules/rulesEditor";
import type { RulesCategoryId } from "./rulesStore";

export type RulesRegistryEntry = {
  id: RulesCategoryId;
  label: string;
  description: string;
  Editor: ComponentType;
};

export const RULES_REGISTRY: RulesRegistryEntry[] = [
  { id: "costRules", label: "Regras de Custo", description: "Intelligent Cost Estimator (Fase 9)", Editor: CostRulesEditor },
  { id: "snapRules", label: "Regras de Snap", description: "Smart Align & Snap", Editor: SnapRulesEditor },
  { id: "roomRules", label: "Regras de Sala", description: "Room Snap", Editor: RoomRulesEditor },
  { id: "autoFillRules", label: "Regras de Auto-Fill", description: "Auto-Wall-Fill e Auto-Room-Fill", Editor: AutoFillRulesEditor },
  { id: "designerRules", label: "Designer Inteligente", description: "Designs A/B/C e aprendizagem", Editor: DesignerRulesEditor },
  { id: "styleRules", label: "Regras de Estilos", description: "Modern, Nordic, Industrial…", Editor: StyleRulesEditor },
  { id: "conversationRules", label: "Regras de Conversação", description: "Conversational Designer", Editor: ConversationRulesEditor },
  { id: "ergonomicsRules", label: "Regras de Ergonomia", description: "Distâncias e alturas ergonómicas", Editor: ErgonomicsRulesEditor },
  { id: "manufacturingRules", label: "Regras de Produção", description: "Auto-Manufacturing AI (Fase 8)", Editor: ManufacturingRulesEditor },
  { id: "variationRules", label: "Regras de Variações", description: "moreSpace, moreSymmetry…", Editor: VariationRulesEditor },
  { id: "predictiveRules", label: "Layout Preditivo", description: "Predictive Layout", Editor: PredictiveRulesEditor },
  { id: "distributionRules", label: "Regras de Distribuição", description: "Distribuição inteligente", Editor: DistributionRulesEditor },
  { id: "shelfRules", label: "Regras de Prateleiras", description: "Auto-Stack Shelves", Editor: ShelfRulesEditor },
  { id: "layoutRules", label: "Regras de Layout", description: "Layout Profiles", Editor: LayoutRulesEditor },
  { id: "scoringRules", label: "Regras de Pontuação", description: "Ergonomia, custo e produção", Editor: ScoringRulesEditor },
];
