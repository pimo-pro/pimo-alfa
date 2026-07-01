/**
 * Contexto para a barra de informação inferior (BottomInfoToolbar).
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type BottomInfoGroupId = "financeiro" | "industriais" | "operacoes";

/** IDs legados (sub-secções) — mantidos para compatibilidade interna. */
export type BottomInfoLegacySectionId =
  | "resumo"
  | "pecasTotais"
  | "ferragensTotais"
  | "totais"
  | "resumoIndustriais"
  | "operacoesIndustriais"
  | "consumoMateriais"
  | "chapasReal";

export type BottomInfoPanelId = BottomInfoGroupId | BottomInfoLegacySectionId | null;

export type FinanceiroSectionId = "resumo" | "totais" | "custos";
export type IndustriaisSectionId =
  | "pecasTotais"
  | "ferragensTotais"
  | "consumoMateriais"
  | "chapasReal"
  | "resumoIndustriais"
  | "enviarFabrica";
export type OperacoesSectionId =
  | "todas"
  | "NESTING"
  | "CNC"
  | "DRILL"
  | "ORLAR"
  | "MONTAGEM"
  | "EMBALAGEM";

export type BottomInfoSectionId = FinanceiroSectionId | IndustriaisSectionId | OperacoesSectionId;

const DEFAULT_SECTION: Record<BottomInfoGroupId, BottomInfoSectionId> = {
  financeiro: "resumo",
  industriais: "pecasTotais",
  operacoes: "todas",
};

const LEGACY_TO_GROUP: Record<
  BottomInfoLegacySectionId,
  { group: BottomInfoGroupId; section: BottomInfoSectionId }
> = {
  resumo: { group: "financeiro", section: "resumo" },
  totais: { group: "financeiro", section: "totais" },
  pecasTotais: { group: "industriais", section: "pecasTotais" },
  ferragensTotais: { group: "industriais", section: "ferragensTotais" },
  consumoMateriais: { group: "industriais", section: "consumoMateriais" },
  chapasReal: { group: "industriais", section: "chapasReal" },
  resumoIndustriais: { group: "industriais", section: "resumoIndustriais" },
  operacoesIndustriais: { group: "operacoes", section: "todas" },
};

function resolveOpenTarget(id: Exclude<BottomInfoPanelId, null>): {
  group: BottomInfoGroupId;
  section: BottomInfoSectionId;
} {
  if (id === "financeiro" || id === "industriais" || id === "operacoes") {
    return { group: id, section: DEFAULT_SECTION[id] };
  }
  return LEGACY_TO_GROUP[id];
}

type BottomInfoContextValue = {
  /** Grupo aberto (null = fechado). */
  openPanel: BottomInfoGroupId | null;
  activeSection: BottomInfoSectionId;
  setOpenPanel: (_id: BottomInfoPanelId) => void;
  setActiveSection: (_section: BottomInfoSectionId) => void;
  togglePanel: (_id: Exclude<BottomInfoPanelId, null>) => void;
  openGroupSection: (_group: BottomInfoGroupId, _section?: BottomInfoSectionId) => void;
};

const BottomInfoContext = createContext<BottomInfoContextValue | null>(null);

export function BottomInfoProvider({ children }: { children: React.ReactNode }) {
  const [openPanel, setOpenPanelState] = useState<BottomInfoGroupId | null>(null);
  const [activeSection, setActiveSection] = useState<BottomInfoSectionId>("resumo");

  const openGroupSection = useCallback(
    (group: BottomInfoGroupId, section?: BottomInfoSectionId) => {
      setOpenPanelState(group);
      setActiveSection(section ?? DEFAULT_SECTION[group]);
    },
    []
  );

  const setOpenPanel = useCallback((id: BottomInfoPanelId) => {
    if (id === null) {
      setOpenPanelState(null);
      return;
    }
    const { group, section } = resolveOpenTarget(id);
    setOpenPanelState(group);
    setActiveSection(section);
  }, []);

  const togglePanel = useCallback(
    (id: Exclude<BottomInfoPanelId, null>) => {
      const { group, section } = resolveOpenTarget(id);
      setOpenPanelState((prev) => {
        if (prev === group) return null;
        setActiveSection(section);
        return group;
      });
    },
    []
  );

  const value = useMemo<BottomInfoContextValue>(
    () => ({
      openPanel,
      activeSection,
      setOpenPanel,
      setActiveSection,
      togglePanel,
      openGroupSection,
    }),
    [openPanel, activeSection, setOpenPanel, togglePanel, openGroupSection]
  );

  return <BottomInfoContext.Provider value={value}>{children}</BottomInfoContext.Provider>;
}

export function useBottomInfo() {
  const ctx = useContext(BottomInfoContext);
  if (!ctx) throw new Error("useBottomInfo must be used within BottomInfoProvider");
  return ctx;
}
