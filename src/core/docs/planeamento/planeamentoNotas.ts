/**
 * Notas de Planeamento — organização de dados já existentes.
 * Histórico do Hub permanece separado (não misturar).
 */

import { MODULES } from "../refs/refsIndex";
import { painelReferenciaSections } from "../refs/refsSections";
import {
  EM_ANDAMENTO,
  PROXIMAS_ETAPAS,
  TAREFAS_CONCLUIDAS,
} from "../progressoResumo";
import type { PlaneamentoNote } from "./planeamentoTypes";

function fromPainel(): PlaneamentoNote[] {
  return painelReferenciaSections
    .filter((s) => {
      const blob = `${s.title} ${s.description} ${s.internals ?? ""}`.toLowerCase();
      return (
        blob.includes("roadmap") ||
        blob.includes("phase") ||
        blob.includes("fase") ||
        blob.includes("planeamento")
      );
    })
    .map((s, i) => ({
      id: `note-painel-${i + 1}`,
      title: s.title,
      body: [s.description, s.internals, s.notes].filter(Boolean).join("\n\n"),
      source: "painelReferencia" as const,
    }));
}

function fromArchitecture(): PlaneamentoNote[] {
  return MODULES.filter((m) => {
    const blob = `${m.name} ${m.responsibility}`.toLowerCase();
    return blob.includes("roadmap") || blob.includes("progresso") || blob.includes("fase");
  }).map((m) => ({
    id: `note-mod-${m.id}`,
    title: m.name,
    body: `${m.responsibility}\nPath: ${m.path}`,
    source: "painelReferencia" as const,
  }));
}

function fromResumoEditorial(): PlaneamentoNote[] {
  const lines = [
    ...TAREFAS_CONCLUIDAS.slice(0, 3).map((t) => `Concluída: ${t.titulo}`),
    ...EM_ANDAMENTO.map((t) => `Em andamento: ${t.titulo}`),
    ...PROXIMAS_ETAPAS.map((t) => `Próxima: ${t.titulo}`),
  ];
  return [
    {
      id: "note-resumo-editorial",
      title: "Alinhamento progressoResumo",
      body: lines.join("\n"),
      source: "progressoResumo",
    },
  ];
}

/** Snapshot tipado das notas de planeamento (só dados existentes). */
export const PLANEAMENTO_NOTAS: PlaneamentoNote[] = [
  ...fromPainel(),
  ...fromArchitecture(),
  ...fromResumoEditorial(),
];
