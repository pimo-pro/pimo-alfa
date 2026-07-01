/**
 * Overlay de painéis agrupados acima da BottomInfoToolbar.
 */

import { useRef, useEffect } from "react";
import { useBottomInfo } from "../../../context/BottomInfoContext";
import FinanceiroHub from "./hubs/FinanceiroHub";
import IndustriaisHub from "./hubs/IndustriaisHub";
import OperacoesHub from "./hubs/OperacoesHub";

function HubContent({ group }: { group: "financeiro" | "industriais" | "operacoes" }) {
  switch (group) {
    case "financeiro":
      return <FinanceiroHub />;
    case "industriais":
      return <IndustriaisHub />;
    case "operacoes":
      return <OperacoesHub />;
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
    >
      <button
        type="button"
        className="bottom-info-panels-overlay__close"
        title="Fechar painel"
        aria-label="Fechar painel"
        onClick={() => setOpenPanel(null)}
      >
        ×
      </button>
      <div ref={scrollRef} className="bottom-info-panels-overlay__scroll">
        <HubContent group={openPanel} />
      </div>
    </div>
  );
}
