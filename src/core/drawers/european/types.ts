/**
 * types.ts — Tipos base do Sistema Europeu (Modelo B).
 *
 * STUB: sem lógica. Preencher na fase de implementação das specs.
 */

/** Marcas europeias alvo desta fase. */
export type EuropeanDrawerBrand = "Blum" | "Hettich" | "Grass";

/**
 * Identificadores canónicos dos 4 sistemas.
 * Nomes alinhados com as pastas em ./models/
 */
export type EuropeanDrawerSystemId =
  | "blum-legrabox"
  | "blum-tandembox-antaro"
  | "hettich-innotech-atira"
  | "grass-nova-pro-scala";

/**
 * Perfil futuro de um sistema europeu (alturas, profundidades, furação…).
 * Campos intencionalmente mínimos nesta fase.
 */
export type EuropeanDrawerSystemProfile = {
  id: EuropeanDrawerSystemId;
  brand: EuropeanDrawerBrand;
  displayName: string;
  /** Placeholder — tabelas oficiais na próxima fase. */
  notes?: string;
};
