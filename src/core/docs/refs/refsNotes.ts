/**
 * Notas técnicas de referência (specs / howItWorks / features).
 * Migradas do legado Documentacao via snapshot do archive — sem misturar no Histórico do hub.
 */

import { HISTORICO_DOCS } from "../archive/historicoDocs";

export type RefNote = {
  id: string;
  title: string;
  body: string;
};

const NOTE_TITLES = new Set([
  "Especificações Técnicas",
  "Como o Sistema Funciona",
  "O que o Sistema Oferece",
]);

/** Snapshot tipado das notas técnicas (conteúdo 1:1 do legado). */
export const REFS_NOTES: RefNote[] = HISTORICO_DOCS.filter((e) =>
  NOTE_TITLES.has(e.title)
).map((e) => ({
  id: e.id,
  title: e.title,
  body: e.body,
}));
