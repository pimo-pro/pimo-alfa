/**
 * Camada futura SSOT do namespace `--ci-*` / escalas 7 tons
 * (derivada de `reference/chalk_iron_sienna_full_system.html` — ADR Opção C).
 *
 * Hoje está **vazia de propósito**: nenhuma escala é aplicada ao runtime.
 * Quando for preenchida, entra no merge Pi *depois* de `piPalette.ts` e
 * *antes* dos overrides de utilizador (`pimo-pi-token-overrides`).
 *
 * Não importar este módulo em CSS. Não expor no preload até um passo explícito.
 */

import type { TemplatePaletteOverrides } from "./types";

/**
 * Bridge opcional: chaves = tokens Alpha (ex. `blue-light`) ou futuros `--ci-*`
 * sem o prefixo `--`. Valores vazios = sem contribuição ao merge.
 */
export const CI_SSOT_TOKEN_BRIDGE: TemplatePaletteOverrides = {
  dark: {},
  light: {},
};

/** Indica se a camada SSOT ainda não contribui (estado atual). */
export function isCiSsotBridgeEmpty(): boolean {
  return (
    Object.keys(CI_SSOT_TOKEN_BRIDGE.dark).length === 0 &&
    Object.keys(CI_SSOT_TOKEN_BRIDGE.light).length === 0
  );
}
