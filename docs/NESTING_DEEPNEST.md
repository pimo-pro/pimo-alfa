/**
 * Nesting Deepnest — motor adicional no Nesting V4 (visual/análise).
 *
 * ## Origem
 * Algoritmos adaptados de [SVGnest](https://github.com/Jack000/SVGnest) (MIT, Jack Qiao).
 * Código portado para TypeScript autónomo em `src/nesting-v4/deepnestEngine/`.
 * Atribuição: `ATTRIBUTION.md` + `LICENSE-SVGnest-MIT.txt` na mesma pasta.
 * **Não** há clone do repositório externo no build nem dependência npm do Deepnest.
 *
 * ## O que inclui
 * - NFP rectangular (aproximação industrial sem ClipperLib)
 * - Genetic Algorithm (ordem + rotação)
 * - Simulated Annealing (refino local complementar)
 * - Packing multi-chapa com kerf/margem
 *
 * ## Integração
 * - Motor id: `deepnest` (junto com `pro` | `experimental`)
 * - Entrada: `runNestingV4AutoLayout` / `engines/resolveEngine.ts`
 * - UI: `/nesting_v4` → painel «Nesting Deepnest (MIT)»
 * - Regras: `/admin/industrial/` → **Nesting Deepnest (Regras)**
 * - SSOT regras: `deepnestRules.ts` (`localStorage` `pimo_nesting_deepnest_rules_v1`)
 *
 * ## Restrições
 * - Não altera writer TCN «mo» nem pipelines CNC de produção.
 * - Rotação industrial tipicamente 0°/90°; grain YY respeitado via settings/regras.
 */
export {};
