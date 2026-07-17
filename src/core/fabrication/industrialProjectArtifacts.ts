function sanitizeIndustrialSlug(projectNameOrSlug: string): string {
  return (
    (projectNameOrSlug || "projeto")
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s+/g, "_") || "projeto"
  );
}

export function industrialFerragensPdfFileName(projectNameOrSlug: string): string {
  return `${sanitizeIndustrialSlug(projectNameOrSlug)}_industrial_ferragens.pdf`;
}

export function industrialFerragensXlsxFileName(projectNameOrSlug: string): string {
  return `${sanitizeIndustrialSlug(projectNameOrSlug)}_industrial_ferragens.xlsx`;
}

export function resumoFinanceiroIndustrialFileName(projectNameOrSlug: string): string {
  return `${sanitizeIndustrialSlug(projectNameOrSlug)}_resumo_financeiro.pdf`;
}

export function pecasTotaisIndustrialFileName(projectNameOrSlug: string): string {
  return `${sanitizeIndustrialSlug(projectNameOrSlug)}_pecas_totais.pdf`;
}

export function ferragensTotaisIndustrialFileName(projectNameOrSlug: string): string {
  return `${sanitizeIndustrialSlug(projectNameOrSlug)}_ferragens_totais.pdf`;
}

export function totaisProjetoIndustrialFileName(projectNameOrSlug: string): string {
  return `${sanitizeIndustrialSlug(projectNameOrSlug)}_totais_projeto.pdf`;
}

export function industrialArmazemIndustrialFileName(projectNameOrSlug: string): string {
  return `${sanitizeIndustrialSlug(projectNameOrSlug)}_industrial_armazem.pdf`;
}

/** @deprecated Use industrialArmazemIndustrialFileName */
export function consumoMateriaisIndustrialFileName(projectNameOrSlug: string): string {
  return industrialArmazemIndustrialFileName(projectNameOrSlug);
}

/** @deprecated Use industrialArmazemIndustrialFileName */
export function chapasRealIndustrialFileName(projectNameOrSlug: string): string {
  return industrialArmazemIndustrialFileName(projectNameOrSlug);
}

export type IndustrialProjectArtifact = {
  id: string;
  label: string;
  filename: string;
  description?: string;
  downloadable?: boolean;
};

export const INDUSTRIAL_PROJECT_ARTIFACTS: readonly IndustrialProjectArtifact[] = [
  { id: "cutlist", label: "Cutlist", filename: "{slug}_cutlist.pdf" },
  { id: "tecnico", label: "PDF Técnico", filename: "{slug}_tecnico.pdf" },
  { id: "unificado", label: "Arquivo Unificado", filename: "{slug}_unificado.pdf" },
  { id: "resumo-financeiro", label: "Resumo Financeiro", filename: "{slug}_resumo_financeiro.pdf" },
  { id: "pecas-totais", label: "Peças totais", filename: "{slug}_pecas_totais.pdf" },
  { id: "ferragens-totais", label: "Ferragens totais", filename: "{slug}_ferragens_totais.pdf" },
  { id: "totais-projeto", label: "Totais do Projeto", filename: "{slug}_totais_projeto.pdf" },
  {
    id: "industrial-armazem",
    label: "Industrial Armazém",
    filename: "{slug}_industrial_armazem.pdf",
    description: "Resumo de chapas + consumo por chapa (PDF unificado para armazém)",
  },
  {
    id: "ferragens-pdf",
    label: "Ferragens Industriais (PDF)",
    filename: "{slug}_industrial_ferragens.pdf",
    description: "Resumo geral de ferragens por caixa e peça",
    downloadable: true,
  },
  {
    id: "ferragens-xlsx",
    label: "Ferragens Industriais (XLSX)",
    filename: "{slug}_industrial_ferragens.xlsx",
    description: "Versão para armazém",
    downloadable: true,
  },
  { id: "etiquetas", label: "Etiquetas", filename: "cnc/{espessura}/etiquetas_{espessura}.pdf" },
  { id: "layout", label: "Layout de Corte PRO", filename: "cnc/{espessura}/layout_{espessura}.pdf" },
  { id: "tcn", label: "CNC / TCN", filename: "cnc/{espessura}/tcn/*.tcn" },
  { id: "drill", label: "Furação (XML)", filename: "drill/XML/*.xml" },
  { id: "manifest", label: "Manifesto industrial", filename: "manifest-industrial.json" },
  { id: "trak-order", label: "Ordem PIMO TRAK", filename: "industrial_order.json" },
] as const;
