/**
 * Vista unificada (read model) das regras da porta.
 * Fase 0: agrega RulesConfig + SettingsSchema sem novo formato de persistência.
 */

import type { PortaRange, RulesConfig } from "../../rules/rulesConfig";
import type { SettingsSchema } from "../../settings/settingsSchema";

export type DoorRulesGaps = {
  verticalMm: number;
  horizontalMm: number;
  duplaMm: number;
  posZOffsetMm: number;
};

export type DoorRulesDrillingProfile = RulesConfig["furos"]["tecnicos"]["dobradica"];

export type DoorRulesSettingsHinge = NonNullable<SettingsSchema["furação"]>["dobradica"];

export type DoorRulesLateralFixation = NonNullable<SettingsSchema["furação"]>["dobradicaFixacao"];

/** Regras da porta resolvidas para consumo (viewer, fabrico, admin). */
export type ResolvedDoorRules = {
  gaps: DoorRulesGaps;
  hingeRanges: PortaRange[];
  drilling: {
    profile: DoorRulesDrillingProfile;
    settingsHinge: DoorRulesSettingsHinge;
    lateralFixation: DoorRulesLateralFixation;
  };
  /** Folga overlay em gerarPortas (mm) — constante documentada, não editável na Fase 1. */
  overlayFabricoMm: number;
  minHeightMm: number;
  minWidthMm: number;
  viewerAnimationDurationMs: number;
};

export type DoorRulesValidationIssue = {
  field: string;
  message: string;
};

export type DoorRulesSources = {
  rules: RulesConfig;
  settings: Pick<SettingsSchema, "portas" | "furação">;
};
