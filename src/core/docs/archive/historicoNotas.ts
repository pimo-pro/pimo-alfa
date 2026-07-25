/**
 * Subconjunto tipado — notas / intro / markdown do arquivo histórico.
 */

import { HISTORICO_DOCS } from "./historicoDocs";
import type { HistoricalDocEntry } from "./historicoTypes";

export const HISTORICO_NOTAS: HistoricalDocEntry[] = HISTORICO_DOCS.filter(
  (e) => e.kind === "intro" || e.kind === "notes" || e.kind === "markdown"
);
