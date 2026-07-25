/**
 * Subconjunto tipado — snippets de código do arquivo histórico.
 */

import { HISTORICO_DOCS } from "./historicoDocs";
import type { HistoricalDocEntry } from "./historicoTypes";

export const HISTORICO_CODE: HistoricalDocEntry[] = HISTORICO_DOCS.filter(
  (e) => e.kind === "code"
);
