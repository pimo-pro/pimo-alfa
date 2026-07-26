/**
 * industrialRules.ts — Regras industriais documentais da Kitchen Library.
 * Não altera regras do Modelo B / Modelo A.
 */

import type { KitchenIndustrialRules } from "../types";

export function buildKitchenIndustrialRules(): KitchenIndustrialRules {
  return {
    assembly: [
      "Montar corpo do módulo antes de frentes/portas",
      "Fixar corrediças Hettich com setback frontal de catálogo",
      "Verificar prumo e nível antes de remates",
    ],
    spacing: [
      "Folga lateral gaveta Modelo B: 7 mm por lado",
      "Gap entre gavetas empilhadas: 6 mm",
      "Gap frente externa: 1 mm por lado na abertura",
    ],
    tolerance: [
      "Tolerância geral de montagem: 0.5 mm",
      "Runner Hettich estritamente < profundidade útil interna",
      "Espessuras madeira corpo: laterais/costa 16 mm, fundo 10 mm",
    ],
    frontDoorDrawer: [
      "Frente de gaveta: material independente do corpo",
      "Dual-front: frente interna 16 mm com folga 2 mm/lado",
      "Portas duplas em módulos ? 800 mm quando aplicável",
    ],
    remateRodape: [
      "Remates cima/baixo/laterais documentais — layer REMATE",
      "Roda-pé industrial padrão: 100 mm — layer RODAPE",
      "Recuo padrão de remate/rodapé: 0 mm (ajustável na UI de projeto)",
    ],
    module: [
      "Base: larguras 300–1200 mm, altura tip. 720, profundidade tip. 560",
      "Alto: alturas 1500–2200 mm",
      "Superior: larguras 300–900 mm, profundidade tip. 320",
      "Canto: L ou diagonal — integração documental com DXF/vistas",
    ],
  };
}
