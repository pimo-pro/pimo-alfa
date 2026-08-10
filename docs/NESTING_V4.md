/**
 * Nesting V4 — estação visual/análise de distribuição em chapas.
 *
 * Rota: `/nesting_v4` (legado `/nesting_v3` redirecciona).
 *
 * ## Papel
 * - Visualização industrial do nesting (peças, rotação 0°/90°, furos, grain, desperdício).
 * - Consome `runCutLayout` com perfis **PRO** ou **Experimental**, ou o motor **Deepnest**.
 * - **Não** altera o writer TCN «mo» nem o pipeline CNC de produção.
 *
 * ## Motores
 * - PRO → `getDefaultCncLayoutOptions`
 * - Experimental → `getExperimentalCncLayoutOptions`
 * - Deepnest → `deepnestEngine` (GA + NFP + SA; MIT adaptado) — ver `docs/NESTING_DEEPNEST.md`
 * Selecção na UI da estação e em `/admin/industrial/` → Nesting V4 / Nesting Deepnest.
 *
 * ## Regras
 * - V4: `src/nesting-v4/rules/nestingV4Rules.ts` (`pimo_nesting_v4_rules_v1`)
 * - Deepnest: `src/nesting-v4/deepnestEngine/deepnestRules.ts` (`pimo_nesting_deepnest_rules_v1`)
 *
 * ## Compatibilidade
 * `src/nesting-v3/*` são shims que reexportam V4.
 */
export {};
