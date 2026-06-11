import { costRulesStore } from "./costRules/rulesStore";
import { snapRulesStore } from "./snapRules/rulesStore";
import { roomRulesStore } from "./roomRules/rulesStore";
import { autoFillRulesStore } from "./autoFillRules/rulesStore";
import { designerRulesStore } from "./designerRules/rulesStore";
import { styleRulesStore } from "./styleRules/rulesStore";
import { conversationRulesStore } from "./conversationRules/rulesStore";
import { ergonomicsRulesStore } from "./ergonomicsRules/rulesStore";
import { manufacturingRulesStore } from "./manufacturingRules/rulesStore";
import { variationRulesStore } from "./variationRules/rulesStore";
import { predictiveRulesStore } from "./predictiveRules/rulesStore";
import { distributionRulesStore } from "./distributionRules/rulesStore";
import { shelfRulesStore } from "./shelfRules/rulesStore";
import { layoutRulesStore } from "./layoutRules/rulesStore";
import { scoringRulesStore } from "./scoringRules/rulesStore";

/** Agregador central — todos os motores leem regras via `rulesStore.<categoria>`. */
export const rulesStore = {
  costRules: costRulesStore,
  snapRules: snapRulesStore,
  roomRules: roomRulesStore,
  autoFillRules: autoFillRulesStore,
  designerRules: designerRulesStore,
  styleRules: styleRulesStore,
  conversationRules: conversationRulesStore,
  ergonomicsRules: ergonomicsRulesStore,
  manufacturingRules: manufacturingRulesStore,
  variationRules: variationRulesStore,
  predictiveRules: predictiveRulesStore,
  distributionRules: distributionRulesStore,
  shelfRules: shelfRulesStore,
  layoutRules: layoutRulesStore,
  scoringRules: scoringRulesStore,
};

export type RulesCategoryId = keyof typeof rulesStore;
