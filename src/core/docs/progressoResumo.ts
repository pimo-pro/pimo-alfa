/**
 * Resumo do progresso do projeto.
 * Utilizado no Painel de Referência e para alinhamento com o Roadmap.
 * Atualizar quando houver conclusões ou novas etapas.
 */

export type ProgressoItem = {
  id: string;
  titulo: string;
};

export const TAREFAS_CONCLUIDAS: ProgressoItem[] = [
  { id: "tc-1", titulo: "Implementação completa da interface multi-box no Viewer." },
  { id: "tc-2", titulo: "Criação do módulo src/core/multibox/ com tipos, manager e re-exports." },
  { id: "tc-3", titulo: "Integração total do MultiBoxManager ao Workspace." },
  { id: "tc-4", titulo: "Documentação completa do módulo multi-box em docs/multibox-architecture.md." },
  { id: "tc-5", titulo: "Garantia de build estável e manutenção das funcionalidades existentes." },
  { id: "tc-6", titulo: "Página dedicada para o Painel de Referência (/painel-referencia)." },
  {
    id: "tc-7",
    titulo:
      "Fase 1 — Análise arquivo completo: /PROJETOS/:project/analise (9 PDFs industriais read-only; flag off; ZIP intacto).",
  },
  {
    id: "tc-8",
    titulo:
      "Fase 2 — Edição online + industrialDocumentOverrides + highlight; ZIP PDFs com rows efetivas; etiquetas/CNC intocados.",
  },
  {
    id: "tc-9",
    titulo:
      "Fase 3 — Histórico documental append-only (industrialDocumentHistory) + jump-to-cell; UI doc/global; CNC/etiquetas intactos.",
  },
  {
    id: "tc-10",
    titulo:
      "Fase 4 — Re-geração seletiva / multi-download PDFs industriais (effective/canonical); ZIP documental; ZIP clássico intacto.",
  },
  {
    id: "tc-11",
    titulo:
      "Fase 5 — Overrides.cutlist → etiquetas UEE (whitelist); CNC/TCN/drill/nesting intocados; merge mesmo com flag off.",
  },
  {
    id: "tc-12",
    titulo:
      "Fase 6 — Robustez industrial: validações/sanitize, testes P0+P1, polish UI, aviso export flag off.",
  },
];

export const EM_ANDAMENTO: ProgressoItem[] = [
  { id: "ea-1", titulo: "Preparação para integração do configurador 3D com o MultiBoxManager." },
  {
    id: "ea-2",
    titulo: "Expansão futura do viewer para snapshot e renderização (stubs documentados).",
  },
];

export const PROXIMAS_ETAPAS: ProgressoItem[] = [
  {
    id: "pe-1",
    titulo: "Criar UI inicial para manipulação de múltiplos boxes (seleção, reorder, propriedades).",
  },
  { id: "pe-2", titulo: "Integrar o MultiBoxManager ao PIMO Calculator." },
  { id: "pe-3", titulo: "Unificar padrões de viewer e sincronização em todos os módulos." },
];
