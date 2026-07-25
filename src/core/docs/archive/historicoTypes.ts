/**
 * Tipos do arquivo histórico (Fase 4).
 * Conteúdo migrado de DocumentacaoSistemaLegacy — só leitura.
 */

export type HistoricalDocKind =
  | "intro"
  | "notes"
  | "code"
  | "markdown"
  | "reference";

export type HistoricalDocEntry = {
  id: string;
  title: string;
  kind: HistoricalDocKind;
  /** Corpo textual migrado do legado (não reescrito). */
  body: string;
  source: "DocumentacaoSistemaLegacy";
};
