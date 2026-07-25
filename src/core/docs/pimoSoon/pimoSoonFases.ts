/**
 * Lista completa das fases futuras oficiais (pimo-soon).
 * Conteúdo editorial fixo — pronto para execução posterior.
 */

import type { PimoSoonFase } from "./pimoSoonTypes";

export const PIMO_SOON_FASES: PimoSoonFase[] = [
  {
    id: "fase-13-documentacao-automatica",
    number: 13,
    title: "Fase 13 — Documentação automática",
    summary: "Geração automática de artefactos técnicos e documentais.",
    status: "optional",
    items: [
      { id: "f13-1", label: "Geração automática de PDFs técnicos" },
      { id: "f13-2", label: "Geração de desenhos e esquemas" },
      { id: "f13-3", label: "Geração de fluxos e diagramas" },
      { id: "f13-4", label: "Geração de listas de peças (cutlist)" },
      { id: "f13-5", label: "Geração de instruções de montagem" },
    ],
  },
  {
    id: "fase-14-dashboard-performance",
    number: 14,
    title: "Fase 14 — Dashboard de performance",
    summary: "Medição de performance do sistema e dos loaders.",
    status: "optional",
    items: [
      { id: "f14-1", label: "Medição de velocidade do sistema" },
      { id: "f14-2", label: "Tempo de carregamento das páginas" },
      { id: "f14-3", label: "Tempo dos loaders" },
      { id: "f14-4", label: "Consumo de memória" },
      { id: "f14-5", label: "Indicadores de performance" },
    ],
  },
  {
    id: "fase-15-alertas-inteligentes",
    number: 15,
    title: "Fase 15 — Sistema de alertas inteligentes",
    summary: "Alertas para encoding, bloqueios e inconsistências.",
    status: "optional",
    items: [
      { id: "f15-1", label: "Alerta para erros de encoding" },
      { id: "f15-2", label: "Alerta para fases bloqueadas" },
      { id: "f15-3", label: "Alerta para inconsistências entre progresso × planeamento" },
      { id: "f15-4", label: "Alerta para dados incompletos ou divergentes" },
    ],
  },
  {
    id: "fase-16-historico-avancado",
    number: 16,
    title: "Fase 16 — Histórico avançado",
    summary: "Comparação temporal entre versões, ficheiros e fases.",
    status: "optional",
    items: [
      { id: "f16-1", label: "Comparação entre versões" },
      { id: "f16-2", label: "Diferenças de ficheiros" },
      { id: "f16-3", label: "Diferenças de linhas de código" },
      { id: "f16-4", label: "Diferenças entre fases" },
      { id: "f16-5", label: "Evolução temporal do projeto" },
    ],
  },
  {
    id: "fase-17-planeamento-inteligente",
    number: 17,
    title: "Fase 17 — Planeamento inteligente",
    summary: "Sugestões automáticas de fases, melhorias e priorização.",
    status: "optional",
    items: [
      { id: "f17-1", label: "Sugestão automática de novas fases" },
      { id: "f17-2", label: "Sugestão de melhorias" },
      { id: "f17-3", label: "Sugestão de reorganização" },
      { id: "f17-4", label: "Sugestão de reestruturação" },
      { id: "f17-5", label: "Priorização inteligente" },
    ],
  },
  {
    id: "fase-18-dashboard-ia",
    number: 18,
    title: "Fase 18 — Dashboard de IA",
    summary: "Indicadores de desempenho e eficiência dos agentes de IA.",
    status: "optional",
    items: [
      { id: "f18-1", label: "Desempenho dos agentes de IA" },
      { id: "f18-2", label: "Número de tarefas executadas" },
      { id: "f18-3", label: "Taxa de sucesso" },
      { id: "f18-4", label: "Erros e falhas" },
      { id: "f18-5", label: "Indicadores de eficiência" },
    ],
  },
];
