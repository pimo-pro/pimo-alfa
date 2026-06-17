/**
 * Documentação READ-ONLY — Sistema de Gavetas (Master Plan FASE 1 → FINAL).
 */

import type { ReactNode } from "react";
import { DocMarkdown } from "../DocMarkdown";
import { HELP_DOC_THEME as T } from "../helpDocTheme";
import { DRAWER_TEST_SUITES, getDrawerDocumentationBundle } from "../../../utils/loadSystemDoc";

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

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        margin: "10px 0",
        padding: 12,
        background: "rgba(0,0,0,0.35)",
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        fontSize: 11,
        color: T.text,
        overflow: "auto",
        fontFamily: "ui-monospace, monospace",
        lineHeight: 1.55,
      }}
    >
      {children}
    </pre>
  );
}

function Pill({ label, tone = "default" }: { label: string; tone?: "done" | "default" }) {
  const color = tone === "done" ? T.green : T.muted;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        color,
        border: `1px solid ${color}44`,
        background: `${color}14`,
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      {label}
    </span>
  );
}

export default function DrawersSystemDocs() {
  const doc = getDrawerDocumentationBundle();
  const { stats, phases, pipelines, geometryPhase6, uiPhase4, viewerPhase5 } = doc;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div
        style={{
          padding: 16,
          borderRadius: 10,
          background: "rgba(56,189,248,0.08)",
          border: "1px solid rgba(56,189,248,0.22)",
        }}
      >
        <p style={{ margin: "0 0 6px", fontSize: 12, color: T.muted }}>
          Versão doc: <strong style={{ color: T.text }}>{doc.exportMeta.version}</strong> · Atualizado:{" "}
          <strong style={{ color: T.text }}>{doc.exportMeta.lastUpdated}</strong>
        </p>
        <p style={{ margin: 0, fontSize: 12, color: T.muted }}>
          {stats.rules} regras · {stats.official} oficiais · {stats.inconsistencies} inconsistências mapeadas ·
          veredito certificação: <strong style={{ color: T.green }}>APROVADO</strong>
        </p>
      </div>

      <Section id="drawers-timeline" title="Linha do tempo — FASES 1 a FINAL">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {phases.map((phase) => (
            <div
              key={phase.phase}
              style={{
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Pill label={`FASE ${phase.phase}`} tone={phase.phase <= 6 ? "done" : "default"} />
                <strong style={{ fontSize: 13, color: T.text }}>{phase.title}</strong>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
                {phase.actions.slice(0, 4).map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              <p style={{ margin: "8px 0 0", fontSize: 10, color: T.muted }}>
                Ficheiros: {phase.files.join(", ")}
              </p>
            </div>
          ))}
          <div style={{ padding: 12, borderRadius: 8, border: `1px solid ${T.green}44`, background: `${T.green}0a` }}>
            <Pill label="FASE FINAL" tone="done" />
            <strong style={{ fontSize: 13, color: T.text }}> QA + Stress + Certificação</strong>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: T.muted }}>
              76 testes automatizados — ver relatório de certificação abaixo.
            </p>
          </div>
        </div>
      </Section>

      <Section id="drawers-architecture" title="Arquitetura do Sistema de Gavetas">
        <p style={{ margin: "0 0 10px", fontSize: 13, color: T.muted, lineHeight: 1.65 }}>
          Domínios oficiais mapeados em <code>DrawerSystemReference.ts</code>. O sistema separa regras globais
          (settings), geometria paramétrica, layers, cutlist, furação, viewer e legado deprecado.
        </p>
        <CodeBlock>
          {doc.referenceReport.domains.map((d) => `• ${d.title} [${d.status}]`).join("\n")}
        </CodeBlock>
      </Section>

      <Section id="drawers-pipeline" title="Pipeline Industrial">
        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: T.green }}>Pipeline oficial</p>
        <CodeBlock>{pipelines.official.join("\n  → ")}</CodeBlock>
        <p style={{ margin: "16px 0 8px", fontSize: 12, fontWeight: 700, color: T.amber }}>Legado (deprecado)</p>
        <CodeBlock>{pipelines.legacy.join("\n  → ")}</CodeBlock>
        <p style={{ margin: "12px 0 0", fontSize: 12, color: T.muted }}>{geometryPhase6.pipelineUnified}</p>
      </Section>

      <Section id="drawers-overrides" title="Overrides UI">
        <CodeBlock>
          {`Campos: ${geometryPhase6.uiOverrides.fields.join(", ")}\n\nFluxo:\n${geometryPhase6.uiOverrides.flow}\n\nProfundidade:\n${geometryPhase6.nominalDepth.formula}\n\nRecuo:\n${geometryPhase6.runnerClearance.formula}`}
        </CodeBlock>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: T.muted }}>
          UI FASE 4: campos editáveis — {uiPhase4.editableFields.join(", ")}.
        </p>
      </Section>

      <Section id="drawers-drilling" title="Furação">
        <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.65 }}>
          FASE 3 unificou regras em <code>DrawerDrillingRules.ts</code>. Com <code>drawersLayer.length &gt; 0</code>,
          a cutlist passa <code>metadata.drawerRules</code> (slideType, metalBoxType, softClose) ao adaptador de furação.
          Corrediças: 2 furos face B, offset 37 mm do fundo (sistema europeu).
        </p>
      </Section>

      <Section id="drawers-viewer" title="Viewer + Motion">
        <CodeBlock>
          {`Offset vertical base: ${viewerPhase5.verticalPosition.baseOffsetMm} mm\nColisões: ${viewerPhase5.collisions.module}\nCurvas: ${viewerPhase5.motionCurves.join(", ")}\nSync: ${viewerPhase5.sync.viewerToState}`}
        </CodeBlock>
      </Section>

      <Section id="drawers-legacy" title="Legado removido (FASE 6)">
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: T.muted, lineHeight: 1.7 }}>
          <li>{geometryPhase6.legacyRemoved.gerarPaineisGavetaFrente}</li>
          <li>{geometryPhase6.legacyRemoved.gerarGavetas}</li>
          <li>{geometryPhase6.legacyRemoved.gerarFerragensCorredicas}</li>
        </ul>
      </Section>

      <Section id="drawers-tests" title="Testes relevantes">
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.8, fontFamily: "ui-monospace, monospace" }}>
          {DRAWER_TEST_SUITES.map((path) => (
            <li key={path}>{path}</li>
          ))}
        </ul>
      </Section>

      <Section id="drawers-certification" title="Relatório de Certificação Industrial">
        <p style={{ margin: "0 0 12px", fontSize: 12, color: T.muted }}>
          Fonte: <code>{doc.certification.sourcePath}</code> · carregado automaticamente via{" "}
          <code>loadSystemDoc.ts</code>
        </p>
        <DocMarkdown source={doc.certification.raw} />
      </Section>

      <Section id="drawers-reference-json" title="DrawerSystemReference (export JSON)">
        <details>
          <summary style={{ cursor: "pointer", fontSize: 13, color: T.accent }}>Expandir relatório JSON</summary>
          <CodeBlock>{doc.reference.raw}</CodeBlock>
        </details>
      </Section>
    </div>
  );
}
