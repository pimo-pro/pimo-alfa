/**
 * Contexto para modais da toolbar do Viewer.
 * Permite que ViewerToolbar (no topo do Viewer) abra modais
 * que são renderizados por ToolbarModals (overlay no layout principal).
 */

/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useState } from "react";

export type ToolbarModalType = "projects" | "image" | "integration" | null;

export type OpenToolbarModalOptions = {
  integrationMessage?: string;
};

type ToolbarModalContextValue = {
  modal: ToolbarModalType;
  integrationMessage: string;
  openModal: (type: ToolbarModalType, options?: OpenToolbarModalOptions) => void;
  closeModal: () => void;
};

const ToolbarModalContext = createContext<ToolbarModalContextValue | null>(null);

export function ToolbarModalProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ToolbarModalType>(null);
  const [integrationMessage, setIntegrationMessage] = useState("");

  const openModal = useCallback((type: ToolbarModalType, options?: OpenToolbarModalOptions) => {
    if (options?.integrationMessage != null) {
      setIntegrationMessage(options.integrationMessage);
    } else if (type !== "integration") {
      setIntegrationMessage("");
    }
    setModal(type);
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
    setIntegrationMessage("");
  }, []);

  return (
    <ToolbarModalContext.Provider value={{ modal, integrationMessage, openModal, closeModal }}>
      {children}
    </ToolbarModalContext.Provider>
  );
}

export function useToolbarModal() {
  const ctx = useContext(ToolbarModalContext);
  if (!ctx) throw new Error("useToolbarModal must be used within ToolbarModalProvider");
  return ctx;
}
