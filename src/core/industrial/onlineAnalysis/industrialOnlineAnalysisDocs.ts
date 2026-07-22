/**
 * Catálogo dos 9 PDFs industriais da Análise arquivo completo (Fase 1).
 * Sem TCN / CNC / etiquetas / drill.
 */

export const INDUSTRIAL_ONLINE_ANALYSIS_DOC_IDS = [
  "cutlist",
  "tecnico",
  "unificado",
  "resumo_financeiro",
  "pecas_totais",
  "ferragens_totais",
  "totais_projeto",
  "industrial_armazem",
  "industrial_ferragens",
] as const;

export type IndustrialOnlineAnalysisDocId =
  (typeof INDUSTRIAL_ONLINE_ANALYSIS_DOC_IDS)[number];

export type IndustrialOnlineAnalysisDocMeta = {
  id: IndustrialOnlineAnalysisDocId;
  label: string;
  description: string;
};

export const INDUSTRIAL_ONLINE_ANALYSIS_DOCS: readonly IndustrialOnlineAnalysisDocMeta[] = [
  { id: "cutlist", label: "Cutlist", description: "Lista de corte industrial" },
  { id: "tecnico", label: "PDF Técnico", description: "Lista técnica de peças" },
  { id: "unificado", label: "Arquivo Unificado", description: "Resumo industrial unificado" },
  {
    id: "resumo_financeiro",
    label: "Resumo Financeiro",
    description: "Totais e peças com custos",
  },
  { id: "pecas_totais", label: "Peças totais", description: "Peças agregadas do projeto" },
  {
    id: "ferragens_totais",
    label: "Ferragens totais",
    description: "Detalhe e totais de ferragens",
  },
  { id: "totais_projeto", label: "Totais do Projeto", description: "Indicadores globais" },
  {
    id: "industrial_armazem",
    label: "Industrial Armazém",
    description: "Chapas e consumo de materiais",
  },
  {
    id: "industrial_ferragens",
    label: "Ferragens Industriais",
    description: "Ferragens por caixa e peça",
  },
] as const;

export function isIndustrialOnlineAnalysisDocId(
  value: string | undefined
): value is IndustrialOnlineAnalysisDocId {
  return (
    !!value &&
    (INDUSTRIAL_ONLINE_ANALYSIS_DOC_IDS as readonly string[]).includes(value)
  );
}
