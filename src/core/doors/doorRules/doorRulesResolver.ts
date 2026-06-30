/**
 * Resolver unificado — agrega RulesConfig.portas + SettingsSchema.portas/furação
 * sem alterar persistência nem motores industriais (Fase 0).
 */

import type { RulesConfig } from "../../rules/rulesConfig";
import { defaultRulesConfig } from "../../rules/rulesConfig";
import type { SettingsSchema } from "../../settings/settingsSchema";
import { settingsDefaults } from "../../settings/settingsSchema";
import {
  DOOR_ANIMATION_DURATION_MS,
  DOOR_MIN_HEIGHT_MM,
  DOOR_MIN_WIDTH_MM,
  DOOR_OVERLAY_FABRICO_MM,
} from "./doorRulesDefaults";
import type { DoorRulesSources, ResolvedDoorRules } from "./doorRulesTypes";

function mergeSettingsPortas(
  settings?: Pick<SettingsSchema, "portas" | "furação"> | null
): Pick<SettingsSchema, "portas" | "furação"> {
  const base = settingsDefaults;
  return {
    portas: { ...base.portas, ...settings?.portas },
    furação: {
      ...base.furação,
      ...settings?.furação,
      dobradica: { ...base.furação?.dobradica, ...settings?.furação?.dobradica },
      dobradicaFixacao: {
        ...base.furação?.dobradicaFixacao,
        ...settings?.furação?.dobradicaFixacao,
      },
    },
  };
}

/**
 * Resolve regras efectivas da porta a partir das fontes actuais (perfil + settings globais).
 */
export function resolveDoorRules(
  rules: RulesConfig,
  settings?: Pick<SettingsSchema, "portas" | "furação"> | null
): ResolvedDoorRules {
  const merged = mergeSettingsPortas(settings);
  const dobradica = rules.furos.tecnicos.dobradica;

  return {
    gaps: {
      verticalMm: merged.portas.portaGapVerticalMm,
      horizontalMm: merged.portas.portaGapHorizontalMm,
      duplaMm: merged.portas.portaGapDuplaMm,
      posZOffsetMm: merged.portas.portaPosZOffsetMm,
    },
    hingeRanges: rules.portas.ranges.map((r) => ({ ...r })),
    drilling: {
      profile: { ...dobradica },
      settingsHinge: { ...merged.furação!.dobradica },
      lateralFixation: { ...merged.furação!.dobradicaFixacao },
    },
    overlayFabricoMm: DOOR_OVERLAY_FABRICO_MM,
    minHeightMm: DOOR_MIN_HEIGHT_MM,
    minWidthMm: DOOR_MIN_WIDTH_MM,
    viewerAnimationDurationMs: DOOR_ANIMATION_DURATION_MS,
  };
}

/** Atalho com defaults de sistema (testes / documentação). */
export function resolveDefaultDoorRules(): ResolvedDoorRules {
  return resolveDoorRules(defaultRulesConfig, settingsDefaults);
}

export function resolveDoorRulesFromSources(sources: DoorRulesSources): ResolvedDoorRules {
  return resolveDoorRules(sources.rules, sources.settings);
}
