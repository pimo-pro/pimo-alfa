/**
 * Subconjunto tipado — referências (specs / features / changelog legado).
 */

import { HISTORICO_DOCS } from "./historicoDocs";
import type { HistoricalDocEntry } from "./historicoTypes";

export const HISTORICO_REFERENCIAS: HistoricalDocEntry[] = HISTORICO_DOCS.filter(
  (e) => e.kind === "reference"
);
