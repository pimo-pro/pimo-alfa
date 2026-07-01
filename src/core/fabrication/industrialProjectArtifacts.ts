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
    description: "Versão para armazém — mesmas colunas do PDF",
    downloadable: true,
  },
  { id: "etiquetas", label: "Etiquetas", filename: "cnc/{espessura}/etiquetas_{espessura}.pdf" },
  { id: "layout", label: "Layout de Corte PRO", filename: "cnc/{espessura}/layout_{espessura}.pdf" },
  { id: "tcn", label: "CNC / TCN", filename: "cnc/{espessura}/tcn/*.tcn" },
  { id: "drill", label: "Furação (XML)", filename: "drill/XML/*.xml" },
  { id: "manifest", label: "Manifesto industrial", filename: "manifest-industrial.json" },
] as const;
