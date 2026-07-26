/**
 * catalog.ts — Catálogo unificado dos sistemas europeus (Modelo B).
 *
 * STUB: lista os 4 modelos sem medidas, furos ou regras.
 */

import type { EuropeanDrawerSystemProfile } from "./types";

/** Inventário mínimo dos sistemas — sem dados técnicos ainda. */
export const EUROPEAN_DRAWER_SYSTEMS: readonly EuropeanDrawerSystemProfile[] = [
  {
    id: "blum-legrabox",
    brand: "Blum",
    displayName: "Blum Legrabox",
    notes: "Estrutura preparada — specs na próxima fase.",
  },
  {
    id: "blum-tandembox-antaro",
    brand: "Blum",
    displayName: "Blum TandemBox Antaro",
    notes: "Estrutura preparada — specs na próxima fase.",
  },
  {
    id: "hettich-innotech-atira",
    brand: "Hettich",
    displayName: "Hettich InnoTech Atira",
    notes: "Estrutura preparada — specs na próxima fase.",
  },
  {
    id: "grass-nova-pro-scala",
    brand: "Grass",
    displayName: "Grass Nova Pro Scala",
    notes: "Estrutura preparada — specs na próxima fase.",
  },
] as const;
