/**
 * Loader local do arquivo historico (sem fetch).
 */

import { HISTORICO_DOCS } from "./historicoDocs";
import type { HistoricalDocEntry, HistoricalDocKind } from "./historicoTypes";

export type { HistoricalDocEntry, HistoricalDocKind };

export function loadHistoricoArchive(): HistoricalDocEntry[] {
  return HISTORICO_DOCS;
}

export function loadHistoricoByKind(kind: HistoricalDocKind): HistoricalDocEntry[] {
  return HISTORICO_DOCS.filter((e) => e.kind === kind);
}

export function getHistoricoEntry(id: string): HistoricalDocEntry | undefined {
  return HISTORICO_DOCS.find((e) => e.id === id);
}
