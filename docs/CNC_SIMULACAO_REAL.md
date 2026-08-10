/**
 * Simulação CNC real — Layout de Corte Alfa.
 *
 * ## Fonte das trajetórias
 * Parser `parseTcnMoPaths.ts` lê o TCN gerado pelo writer «mo»:
 * - `W#2201` → contorno / feed / Z
 * - `W#81` → furação vertical
 *
 * ## Canvas
 * - `canvas/cnc2d.tsx` — overlay 2D, Z-moves por cor, feed anotado
 * - `canvas/cnc3d.tsx` — Three.js: chapa, peças, furos, path 3D, ferramenta
 *
 * ## UI
 * TCN Real | TCN Visual | 2D | 3D | Exportar TCN Real | Simulação CNC Real ON/OFF
 *
 * A simulação **não** substitui a máquina; valida visualmente o mesmo TCN de produção.
 */
export {};
