/**
 * Documentação READ-ONLY — PDF Engine + Análise arquivo completo (Fase 1).
 */

import type { ReactNode } from "react";
import { DocMarkdown } from "../DocMarkdown";
import { HELP_DOC_THEME as T } from "../helpDocTheme";
import { loadSystemMarkdown } from "../../../utils/loadSystemDoc";
import { INDUSTRIAL_ONLINE_ANALYSIS_DOCS } from "@/core/industrial/onlineAnalysis";

function Section({
  title,
  children,
  id,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} style={{ scrollMarginTop: 80 }}>
      <h2
        style={{
          margin: "0 0 14px",
          fontSize: 17,
          fontWeight: 700,
          color: T.engineering,
          borderBottom: `1px solid ${T.border}`,
          paddingBottom: 8,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function PdfSystemDocs() {
  const analysisDoc = loadSystemMarkdown("industrial-online-analysis");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, fontFamily: T.font }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 22, color: T.text }}>PDF Engine</h1>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: T.muted, lineHeight: 1.55 }}>
          Documentação técnica dos PDFs industriais e da análise online (Fases 1–6).
          Inclui robustez (validações, testes) e integração UEE via whitelist da cutlist.
        </p>
      </header>

      <Section id="online-analysis" title="Análise arquivo completo / PDFs industriais online">
        <DocMarkdown source={analysisDoc.raw} />
        <p style={{ margin: "14px 0 8px", fontSize: 12, color: T.muted }}>
          Fonte: <code>{analysisDoc.sourcePath}</code> · v{analysisDoc.version}
        </p>
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
              color: T.text,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    borderBottom: `1px solid ${T.border}`,
                    color: T.muted,
                  }}
                >
                  docId
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    borderBottom: `1px solid ${T.border}`,
                    color: T.muted,
                  }}
                >
                  Label
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    borderBottom: `1px solid ${T.border}`,
                    color: T.muted,
                  }}
                >
                  Descrição
                </th>
              </tr>
            </thead>
            <tbody>
              {INDUSTRIAL_ONLINE_ANALYSIS_DOCS.map((doc) => (
                <tr key={doc.id}>
                  <td style={{ padding: "6px 8px", borderBottom: `1px solid ${T.border}` }}>
                    <code>{doc.id}</code>
                  </td>
                  <td style={{ padding: "6px 8px", borderBottom: `1px solid ${T.border}` }}>
                    {doc.label}
                  </td>
                  <td style={{ padding: "6px 8px", borderBottom: `1px solid ${T.border}`, color: T.muted }}>
                    {doc.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
