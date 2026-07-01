/**
 * Overlay de painéis de informação acima da BottomInfoToolbar.
 */

import { useRef, useEffect } from "react";
import { useBottomInfo, type BottomInfoPanelId } from "../../../context/BottomInfoContext";
import ResumoFinanceiroPanel from "../../panels/ResumoFinanceiroPanel";
import PecasTotaisPanel from "../../panels/PecasTotaisPanel";
import FerragensTotaisPanel from "../../panels/FerragensTotaisPanel";
import TotaisProjetoPanel from "../../panels/TotaisProjetoPanel";
import PainelResumoIndustriais from "../../panels/painelResumoIndustriais";

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  zIndex: 50,
  display: "flex",
  flexDirection: "column",
  background: "rgba(5, 8, 22, 0.92)",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 -4px 24px rgba(0,0,0,0.3)",
  overflow: "hidden",
};

const scrollAreaStyle: React.CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: "16px 20px",
  minHeight: 0,
};

const closeButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: 10,
  right: 14,
  width: 28,
  height: 28,
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.06)",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2,
};

function PanelContent({ panelId }: { panelId: Exclude<BottomInfoPanelId, null> }) {
  switch (panelId) {
    case "resumo":
      return <ResumoFinanceiroPanel />;
    case "pecasTotais":
      return <PecasTotaisPanel />;
    case "ferragensTotais":
      return <FerragensTotaisPanel />;
    case "totais":
      return <TotaisProjetoPanel />;
    case "resumoIndustriais":
      return <PainelResumoIndustriais />;
    default:
      return null;
  }
}

export default function BottomInfoPanelsOverlay() {
  const { openPanel, setOpenPanel } = useBottomInfo();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openPanel && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [openPanel]);

  if (!openPanel) return null;

  return (
    <div
      className="bottom-info-panels-overlay"
      role="dialog"
      aria-label={`Painel ${openPanel}`}
      style={overlayStyle}
    >
      <button
        type="button"
        title="Fechar painel"
        aria-label="Fechar painel"
        onClick={() => setOpenPanel(null)}
        style={closeButtonStyle}
      >
        ×
      </button>
      <div ref={scrollRef} style={scrollAreaStyle}>
        <PanelContent panelId={openPanel} />
      </div>
    </div>
  );
}
