/**
 * Layout de Corte Alfa — estação CNC visual + TCN real.
 *
 * Rota: `/layout_de_corte_alfa`
 *
 * ## Papel
 * - Nesting visual (PRO / Experimental / Deepnest via Nesting V4).
 * - **TCN Real**: `generateTcnV4` → `exportNestingV4ToCnc` → writer **nesting_mo**.
 * - **TCN Visual**: relatório de simulação (não industrial).
 * - Canvas **2D** e **3D** com trajetórias parseadas (W#2201 / W#81).
 *
 * ## Restrições
 * - Não altera `tcnGeneratorNestingMo.ts` nem `cncExport.ts`.
 * - Compatibilidade TCN = chamada ao SSOT existente (paridade com Nesting V3/V4 export).
 *
 * Ver também: `docs/TCN_V4.md`, `docs/CNC_SIMULACAO_REAL.md`.
 */
export {};
