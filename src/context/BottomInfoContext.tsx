/**
 * Contexto para a barra de informação inferior (BottomInfoToolbar).
 * Controla qual painel está aberto: apenas um por vez; toggle ao clicar no mesmo botão.
 */

import { createContext, useCallback, useContext, useState } from "react";

export type BottomInfoPanelId =
  | "resumo"
  | "cutlist"
  | "portas"
  | "ferragens"
  | "ferragensDetalhado"
  | "totais"
  | null;

type BottomInfoContextValue = {
  openPanel: BottomInfoPanelId;
  setOpenPanel: (_id: BottomInfoPanelId) => void;
  togglePanel: (_id: Exclude<BottomInfoPanelId, null>) => void;
};

const BottomInfoContext = createContext<BottomInfoContextValue | null>(null);

export function BottomInfoProvider({ children }: { children: React.ReactNode }) {
  const [openPanel, setOpenPanel] = useState<BottomInfoPanelId>(null);
  const togglePanel = useCallback((id: Exclude<BottomInfoPanelId, null>) => {
    setOpenPanel((prev) => (prev === id ? null : id));
  }, []);
  return (
    <BottomInfoContext.Provider value={{ openPanel, setOpenPanel, togglePanel }}>
      {children}
    </BottomInfoContext.Provider>
  );
}

export function useBottomInfo() {
  const ctx = useContext(BottomInfoContext);
  if (!ctx) throw new Error("useBottomInfo must be used within BottomInfoProvider");
  return ctx;
}
