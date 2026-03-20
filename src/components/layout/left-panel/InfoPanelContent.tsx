import { useState } from "react";
import Panel from "../../ui/Panel";

/** Tab interno da página Info: "geral" | "tecnica" */
const INFO_INNER_TABS = ["geral", "tecnica"] as const;

export function InfoPanelContent() {
  const [infoInnerTab, setInfoInnerTab] = useState<"geral" | "tecnica">("geral");

  return (
    <div className="left-panel-content">
      <div className="left-panel-scroll">
        <aside className="panel-content panel-content--side">
          <div className="design-panel-header">
            <div className="section-title">Info</div>
            <p className="design-panel-subtitle">Ajuda rápida sobre fluxo e operação da página de design.</p>
          </div>
          {/* Tabs internas: preparadas para futura Info Técnica */}
          <div
            style={{
              display: "flex",
              gap: 4,
              marginBottom: 12,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {INFO_INNER_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setInfoInnerTab(tab)}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  background: infoInnerTab === tab ? "rgba(59,130,246,0.2)" : "transparent",
                  border: "none",
                  borderBottom: infoInnerTab === tab ? "2px solid var(--primary)" : "2px solid transparent",
                  color: "var(--text-main)",
                  cursor: "pointer",
                }}
              >
                {tab === "geral" ? "Geral" : "Técnica"}
              </button>
            ))}
          </div>

          {infoInnerTab === "geral" && (
            <>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                Como funciona o PIMO.
              </p>
              <Panel title="Fluxo básico" description="Criar projeto e ver resultado 3D.">
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: "var(--text-muted)" }}>
                  <li>Use <strong>Página inicial</strong> para definir nome, tipo, material e dimensões.</li>
                  <li>Use <strong>Calculadora</strong> para adicionar caixas e gerar design.</li>
                  <li>Use <strong>Móveis</strong> ou <strong>Modelos</strong> para adicionar modelos 3D (GLB) às caixas.</li>
                  <li>O painel direito permite gerar design, adicionar/remover caixas e exportar PDF.</li>
                </ol>
              </Panel>
              <Panel title="Modelos CAD" description="Admin → Modelos CAD para registar ficheiros GLB.">
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                  Em Admin pode carregar ficheiros .glb; depois aparecem em Móveis/Modelos para adicionar à caixa.
                </p>
              </Panel>
            </>
          )}

          {infoInnerTab === "tecnica" && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Documentação técnica em breve.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
