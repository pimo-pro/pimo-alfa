/**
 * Facade de regras industriais críticas (Fase ALTA).
 * Não duplica stores: lê/escreve os SSOT já existentes (settings, regras de porta/gaveta).
 * A página /admin/industrial/ usa este mapa para organizar edição por domínio.
 */

import { getSettings, saveSettings } from "../../settings/settingsService";
import type { SettingsSchema } from "../../settings/settingsSchema";
import { DOOR_OVERLAY_FABRICO_MM } from "../../doors/doorRules/doorRulesDefaults";
import {
  DRAWER_FRONT_LATERAL_GAP_MM,
  DRAWER_VERTICAL_GAP_MM,
  DRAWER_SIDE_BASE_ELEVATION_MM,
  DRAWER_LOWEST_BODY_ABOVE_MODULE_BASE_MM,
} from "../../drawers/drawerGeometryConstants";
import { TCN_METODO_PRODUCAO } from "../../cnc/tcnMetodo";

export type IndustrialRulesDomainId =
  | "cnc"
  | "nesting"
  | "nestingV4"
  | "nestingDeepnest"
  | "layoutCorteAlfa"
  | "portas"
  | "gavetas"
  | "furacao"
  | "materiais"
  | "etiquetas"
  | "divSep"
  | "remates"
  | "prateleiras";

export type IndustrialRulesDomainMeta = {
  id: IndustrialRulesDomainId;
  label: string;
  description: string;
  /** Se true, editável directamente nesta consolidação via settings. */
  editableInHub: boolean;
  /** Fonte actual da verdade (documentação). */
  ssot: string;
};

export const INDUSTRIAL_RULES_DOMAINS: IndustrialRulesDomainMeta[] = [
  {
    id: "cnc",
    label: "CNC / TCN",
    description: "Método TCN fixo nesting_mo; parâmetros de máquina e margem.",
    editableInHub: true,
    ssot: "settings.cnc + tcnMetodo.ts",
  },
  {
    id: "nesting",
    label: "Nesting (CNC)",
    description: "Motor PRO vs Experimental do pipeline CNC; kerf; rotação global.",
    editableInHub: true,
    ssot: "settings.cnc.nestingEngine + settings.nesting + cncPipeline",
  },
  {
    id: "nestingV4",
    label: "Nesting V4 (Visual)",
    description: "Regras da estação /nesting_v4: rotação, margem, kerf, grain, compactação.",
    editableInHub: true,
    ssot: "nesting-v4/rules/nestingV4Rules",
  },
  {
    id: "nestingDeepnest",
    label: "Nesting Deepnest (Regras)",
    description: "Parâmetros GA/SA/NFP do motor Deepnest (visual/análise; MIT adaptado).",
    editableInHub: true,
    ssot: "nesting-v4/deepnestEngine/deepnestRules",
  },
  {
    id: "layoutCorteAlfa",
    label: "Layout de Corte Alfa (Simulação CNC)",
    description: "Velocidade visual, trajetórias TCN real (mo), 2D/3D, Z-moves e feedrate.",
    editableInHub: true,
    ssot: "layout-de-corte-alfa/rules/layoutCorteAlfaRules + layoutCorteAlfaTcnRules",
  },
  {
    id: "portas",
    label: "Portas",
    description: "Gaps, overlay de fabrico e offsets de porta.",
    editableInHub: true,
    ssot: "settings.portas + doorRulesDefaults",
  },
  {
    id: "gavetas",
    label: "Gavetas",
    description: "Folgas e offsets de fabrico (settings + constantes industriais).",
    editableInHub: true,
    ssot: "settings.gavetas + drawerGeometryConstants",
  },
  {
    id: "furacao",
    label: "Furação",
    description: "Parâmetros de furação em System Settings / RulesConfig.",
    editableInHub: true,
    ssot: "settings.furacao + RulesConfig",
  },
  {
    id: "materiais",
    label: "Materiais / Chapas",
    description: "Dimensões de chapa default e nomes.",
    editableInHub: true,
    ssot: "settings.materiais",
  },
  {
    id: "prateleiras",
    label: "Prateleiras",
    description: "Furação e clearances (RulesConfig / settings).",
    editableInHub: true,
    ssot: "settings.furacao.prateleira + RulesConfig",
  },
  {
    id: "divSep",
    label: "DIV / SEP",
    description: "Editável na página DIV/SEP (mesmo SSOT); hub liga ao editor.",
    editableInHub: false,
    ssot: "admin/rules/divSepRules",
  },
  {
    id: "remates",
    label: "Remates / Rodapés / Hemati",
    description: "Constantes de produto; exposição gradual no hub.",
    editableInHub: false,
    ssot: "core/remate + core/rodape + finishTypes",
  },
  {
    id: "etiquetas",
    label: "Etiquetas",
    description: "LabelConfig v5 (página dedicada).",
    editableInHub: false,
    ssot: "LabelConfigPage / etiquetas SSOT",
  },
];

/** Constantes industriais de gaveta ainda não espelhadas em settings (somente leitura no hub). */
export function getDrawerIndustrialConstantsReadonly() {
  return {
    folgaVerticalFrentesMm: DRAWER_VERTICAL_GAP_MM,
    folgaLateralFrenteMm: DRAWER_FRONT_LATERAL_GAP_MM,
    elevacaoCorpoMm: DRAWER_SIDE_BASE_ELEVATION_MM,
    folgaCorpoSobreFundoMm: DRAWER_LOWEST_BODY_ABOVE_MODULE_BASE_MM,
    /** SSOT produção: laterais = frente − 64,5 (documentado; não editável sem migração). */
    lateralHeightOffsetFromFrontMm: 64.5,
    overlayPortaFabricoMm: DOOR_OVERLAY_FABRICO_MM,
    tcnMetodo: TCN_METODO_PRODUCAO,
  };
}

export type IndustrialCriticalSettingsPatch = {
  nestingEngine?: "pro" | "experimental";
  portas?: Partial<SettingsSchema["portas"]>;
  gavetas?: Partial<
    Pick<
      SettingsSchema["gavetas"],
      | "gavetaFolgaFrenteMm"
      | "gavetaFolgaLateralMm"
      | "gavetaRecuoCorpoMm"
      | "gavetaRecuoProfundidadeCorredicaMm"
    >
  >;
  cnc?: Partial<
    Pick<
      SettingsSchema["cnc"],
      | "sheetMarginMm"
      | "minSpacingMm"
      | "zSafetyMm"
      | "rampDistanceMm"
      | "diametroFresaContornoMm"
      | "compensacaoFerramenta"
      | "nestingEngine"
    >
  >;
  nesting?: Partial<Pick<SettingsSchema["nesting"], "kerfPadraoMm" | "permitirRotacaoGlobal">>;
  materiais?: Partial<
    Pick<SettingsSchema["materiais"], "sheetWidthMm" | "sheetHeightMm" | "sheetThicknessMm" | "sheetName">
  >;
};

/** Aplica patch crítico sem permitir alterar tcnMetodo. */
export function applyIndustrialCriticalSettingsPatch(patch: IndustrialCriticalSettingsPatch): SettingsSchema {
  const current = getSettings();
  const next: SettingsSchema = {
    ...current,
    cnc: {
      ...current.cnc,
      ...(patch.cnc ?? {}),
      tcnMetodo: "nesting_mo",
      nestingEngine:
        patch.nestingEngine ??
        patch.cnc?.nestingEngine ??
        current.cnc.nestingEngine ??
        "pro",
    },
    nesting: {
      ...current.nesting,
      ...(patch.nesting ?? {}),
    },
    portas: {
      ...current.portas,
      ...(patch.portas ?? {}),
    },
    gavetas: {
      ...current.gavetas,
      ...(patch.gavetas ?? {}),
    },
    materiais: {
      ...current.materiais,
      ...(patch.materiais ?? {}),
    },
  };
  return saveSettings(next).settings;
}
