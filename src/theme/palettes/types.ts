/**
 * Tipos do sistema de templates de tema (Alpha / Pi).
 * Ver src/theme/palettes/tokenList.ts para a lista de tokens cobertos.
 */

export type ThemeTemplateId = "alpha" | "pi";

export type ButtonShape = "square" | "soft" | "pill";

/** Um valor por token, para um modo (claro OU escuro). */
export type TokenValueMap = Partial<Record<string, string>>;

/** Overrides de um template para os dois modos. Chaves ausentes herdam o valor do Alpha (index.css). */
export interface TemplatePaletteOverrides {
  dark: TokenValueMap;
  light: TokenValueMap;
}

export interface ThemeTemplateDefinition {
  id: ThemeTemplateId;
  label: string;
  description: string;
  /**
   * Se true, o template tem uma paleta de cores própria (overrides de token).
   * Alpha é false: não tem overrides, é literalmente o CSS atual de index.css.
   */
  hasOwnPalette: boolean;
  /** Se true, o template usa o sistema de botão unificado (Fase 4). */
  hasUnifiedButtons: boolean;
}

export const DEFAULT_BUTTON_SHAPE: ButtonShape = "soft";
