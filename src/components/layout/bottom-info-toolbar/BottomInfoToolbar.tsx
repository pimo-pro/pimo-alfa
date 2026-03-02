/**
 * Barra de ferramentas fixa acima do Footer.
 * Botões de texto para abrir/fechar painéis de informação (Resumo, Cutlist, Portas, etc.).
 * Um único painel aberto por vez; clique no mesmo botão fecha.
 * Estilo alinhado ao Tools3DToolbar.
 */

import { useBottomInfo, type BottomInfoPanelId } from "../../../context/BottomInfoContext";

const PANELS: { id: Exclude<BottomInfoPanelId, null>; label: string }[] = [
  { id: "resumo", label: "Resumo Financeiro" },
  { id: "cutlist", label: "Cutlist Industrial" },
  { id: "portas", label: "Portas" },
  { id: "ferragens", label: "Ferragens Industriais" },
  { id: "ferragensDetalhado", label: "Ferragens Detalhado" },
  { id: "totais", label: "Totais do Projeto" },
];

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  background: "rgba(15, 23, 42, 0.85)",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  flexShrink: 0,
  minHeight: 40,
  boxSizing: "border-box",
};

const buttonBaseStyle: React.CSSProperties = {
  padding: "6px 12px",
  border: "none",
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  color: "var(--text-main)",
  background: "transparent",
  whiteSpace: "nowrap",
};

export default function BottomInfoToolbar() {
  const { openPanel, togglePanel } = useBottomInfo();

  return (
    <div
      className="bottom-info-toolbar"
      role="toolbar"
      aria-label="Painéis de informação do projeto"
      style={toolbarStyle}
    >
      {PANELS.map(({ id, label }) => {
        const isActive = openPanel === id;
        return (
          <button
            key={id}
            type="button"
            title={isActive ? `Fechar ${label}` : `Abrir ${label}`}
            aria-label={isActive ? `Fechar ${label}` : `Abrir ${label}`}
            aria-pressed={isActive}
            onClick={() => togglePanel(id)}
            style={{
              ...buttonBaseStyle,
              background: isActive ? "rgba(59, 130, 246, 0.25)" : "transparent",
              color: isActive ? "var(--text-main)" : "var(--text-muted)",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              else e.currentTarget.style.background = "rgba(59, 130, 246, 0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isActive ? "rgba(59, 130, 246, 0.25)" : "transparent";
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
