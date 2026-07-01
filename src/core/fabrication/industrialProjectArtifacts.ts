export function industrialFerragensPdfFileName(projectNameOrSlug: string): string {
  const safe =
    (projectNameOrSlug || "projeto")
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s+/g, "_") || "projeto";
  return `${safe}_industrial_ferragens.pdf`;
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
    id: "ferragens",
    label: "Ferragens Industriais",
    filename: "{slug}_industrial_ferragens.pdf",
    description: "Resumo geral de ferragens por caixa e peça",
    downloadable: true,
  },
  { id: "etiquetas", label: "Etiquetas", filename: "cnc/{espessura}/etiquetas_{espessura}.pdf" },
  { id: "layout", label: "Layout de Corte PRO", filename: "cnc/{espessura}/layout_{espessura}.pdf" },
  { id: "tcn", label: "CNC / TCN", filename: "cnc/{espessura}/tcn/*.tcn" },
  { id: "drill", label: "Furação (XML)", filename: "drill/XML/*.xml" },
  { id: "manifest", label: "Manifesto industrial", filename: "manifest-industrial.json" },
] as const;
