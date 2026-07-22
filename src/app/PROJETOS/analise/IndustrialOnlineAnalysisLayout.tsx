import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";

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
  minHeight: "100%",
  background: "#fafafa",
  color: "#0f172a",
};

const header: CSSProperties = {
  padding: "12px 20px",
  borderBottom: "1px solid #e2e8f0",
  background: "#fff",
};

const crumb: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: "#64748b",
};

const linkStyle: CSSProperties = {
  color: "#2563eb",
  textDecoration: "none",
};

const main: CSSProperties = {
  flex: 1,
  padding: "20px 24px 40px",
  maxWidth: 1200,
  width: "100%",
  margin: "0 auto",
  boxSizing: "border-box",
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
              <span style={{ color: "#334155", fontWeight: 600 }}>{docLabel}</span>
            </>
          ) : (
            <span style={{ color: "#334155", fontWeight: 600 }}>Análise</span>
          )}
        </nav>
        <h1 style={{ margin: "10px 0 0", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
          {docLabel ? docLabel : "Análise arquivo completo"}
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
          Consulta, edição documental, histórico e download dos PDFs industriais. CNC/TCN/drill
          permanecem no pipeline clássico; a cutlist editada alimenta as etiquetas UEE.
        </p>
      </header>
      <main style={main}>{children}</main>
    </div>
  );
}
