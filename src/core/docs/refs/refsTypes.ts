/**
 * Tipos do hub — Referências Técnicas (Fase 9).
 */

export type HubRefKind = "link" | "module" | "flow" | "section" | "note" | "structure";

export type HubRefEntry = {
  id: string;
  kind: HubRefKind;
  title: string;
  summary: string;
  details?: string;
  paths?: string[];
  meta?: Record<string, string>;
};

export type HubRefsSnapshot = {
  entries: HubRefEntry[];
  folderStructure: string;
  navLabels: string[];
};
