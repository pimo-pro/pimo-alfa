/**
 * TCN V4 — geração real no Layout de Corte Alfa.
 *
 * ## Entrada
 * `NestingV4State` (peças, placements, rotações, furos, kerf).
 *
 * ## Pipeline (SSOT)
 * 1. `prepareNestingV4IndustrialLayout` (BL físico + preserve-positions)
 * 2. `exportCncFiles` → `generateTcnForPanelNestingMo` (writer «mo»)
 *
 * Módulo: `src/layout-de-corte-alfa/engines/generateTcnV4.ts`
 *
 * ## Nota sobre G0/G1/G2/G3
 * O ficheiro de máquina Albatros usa blocos **W#** (não ISO G-code).
 * `segmentsToPseudoGCode` gera apenas anotação visual para UI/debug.
 *
 * ## Regras
 * `layoutCorteAlfaTcnRules.ts` — visualização, feed/spindle/Z-safe anotados, kerf preferido.
 */
export {};
