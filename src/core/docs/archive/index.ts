/**
 * Arquivo histórico da Documentação do Sistema (legado).
 */

export type { HistoricalDocEntry, HistoricalDocKind } from "./historicoTypes";
export { HISTORICO_DOCS } from "./historicoDocs";
export {
  loadHistoricoArchive,
  loadHistoricoByKind,
  getHistoricoEntry,
} from "./loadHistoricoArchive";
