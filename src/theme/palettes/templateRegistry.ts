import type { ThemeTemplateDefinition, ThemeTemplateId } from "./types";

export const DEFAULT_THEME_TEMPLATE: ThemeTemplateId = "alpha";

export const THEME_TEMPLATES: ThemeTemplateDefinition[] = [
  {
    id: "alpha",
    label: "Alpha",
    description:
      "O visual atual do Pimo, preservado tal como está hoje — claro e escuro, sem nenhuma alteração de cor ou de botões.",
    hasOwnPalette: false,
    hasUnifiedButtons: false,
  },
  {
    id: "pi",
    label: "Pi",
    description:
      "Novo template de cores (Chalk / Iron / Sienna) com sistema de botões unificado e formato configurável.",
    hasOwnPalette: true,
    hasUnifiedButtons: true,
  },
];

export function getThemeTemplate(id: ThemeTemplateId): ThemeTemplateDefinition {
  return THEME_TEMPLATES.find((t) => t.id === id) ?? THEME_TEMPLATES[0];
}
