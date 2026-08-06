import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";

import PageContainer from "@/components/ui/PageContainer";
import { buildProjetosPagePath } from "@/app/PROJETOS/projetosPageSlug";
import { buildIndustrialOnlineAnalysisIndexPath } from "@/core/industrial/onlineAnalysis";

type Props = {
  projectName: string;
  pageSlug: string;
  docLabel?: string;
  children: ReactNode;
};

const shell: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
  maxWidth: 1200,
  width: "100%",
  margin: "0 auto",
  color: "var(--text-main)",
};

const header: CSSProperties = {
  paddingBottom: 16,
  borderBottom: "1px solid var(--border, rgba(127,127,127,0.25))",
};

const crumb: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: "var(--text-muted)",
};

const linkStyle: CSSProperties = {
  color: "var(--blue-light, #2563eb)",
  textDecoration: "none",
};

export default function IndustrialOnlineAnalysisLayout({
  projectName,
  pageSlug,
  docLabel,
  children,
}: Props) {
  const projectHref = buildProjetosPagePath({ name: pageSlug });
  const indexHref = buildIndustrialOnlineAnalysisIndexPath(projectName);

  return (
    <PageContainer>
      <div style={shell} className="ui-projetos-analise">
        <header style={header}>
          <nav style={crumb} aria-label="Navegação da análise">
            <Link to="/PROJETOS" style={linkStyle}>
              PROJETOS
            </Link>
            <span aria-hidden>/</span>
            <Link to={projectHref} style={linkStyle}>
              {projectName}
            </Link>
            <span aria-hidden>/</span>
            {docLabel ? (
              <>
                <Link to={indexHref} style={linkStyle}>
                  Análise
                </Link>
                <span aria-hidden>/</span>
                <span style={{ color: "var(--text-main)", fontWeight: 600 }}>{docLabel}</span>
              </>
            ) : (
              <span style={{ color: "var(--text-main)", fontWeight: 600 }}>Análise</span>
            )}
          </nav>
          <h1 style={{ margin: "10px 0 0", fontSize: 18, fontWeight: 700, color: "var(--text-main)" }}>
            {docLabel ? docLabel : "Análise arquivo completo"}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            Consulta, edição documental, histórico e download dos PDFs industriais. CNC/TCN/drill
            permanecem no pipeline clássico; a cutlist editada alimenta as etiquetas UEE.
          </p>
        </header>
        {children}
      </div>
    </PageContainer>
  );
}
