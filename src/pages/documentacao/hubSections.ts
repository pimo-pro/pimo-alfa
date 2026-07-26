/**
 * Seccoes do Hub de Documentacao (/documentacao).
 * Ids estaveis para hash e navegacao.
 */

import type { IconName } from "@/components/icons";

export type HubSectionId =
  | "atual"
  | "historico"
  | "adicionados"
  | "removidos"
  | "progresso"
  | "refs"
  | "logs"
  | "planeamento"
  | "dashboard"
  | "pimo-soon";

export type HubSectionDef = {
  id: HubSectionId;
  label: string;
  blurb: string;
  icon: IconName;
};

export const HUB_SECTIONS: HubSectionDef[] = [
  {
    id: "atual",
    label: "Documenta\u00e7\u00e3o atual",
    blurb: "\u00cdndice curado e refer\u00eancias vigentes",
    icon: "adminDocs",
  },
  {
    id: "historico",
    label: "Documenta\u00e7\u00e3o hist\u00f3rica",
    blurb: "Arquivo imut\u00e1vel migrado do legado",
    icon: "adminArchive",
  },
  {
    id: "adicionados",
    label: "Funcionalidades adicionadas",
    blurb: "Features publicadas (news.json)",
    icon: "highlight",
  },
  {
    id: "removidos",
    label: "Funcionalidades removidas",
    blurb: "Registo de itens descontinuados",
    icon: "delete",
  },
  {
    id: "progresso",
    label: "Progresso do projeto",
    blurb: "Estado de constru\u00e7\u00e3o e fases",
    icon: "adminChart",
  },
  {
    id: "refs",
    label: "Refer\u00eancias t\u00e9cnicas",
    blurb: "architectureIndex e m\u00f3dulos core",
    icon: "blueprint",
  },
  {
    id: "logs",
    label: "Logs internos",
    blurb: "Feed de releases e updates",
    icon: "adminBook",
  },
  {
    id: "planeamento",
    label: "Planeamento futuro",
    blurb: "Pr\u00f3ximas etapas e roadmap",
    icon: "adminChecklist",
  },
  {
    id: "dashboard",
    label: "Dashboard avan\u00e7ado",
    blurb: "KPIs, gr\u00e1ficos SVG e sa\u00fade do Hub",
    icon: "adminChart",
  },
  {
    id: "pimo-soon",
    label: "pimo-soon",
    blurb: "Plano oficial de fases futuras (13\u201318)",
    icon: "adminChecklist",
  },
];

/** Seccao inicial de /documentacao quando nao ha hash (e sem override Admin). */
export const DEFAULT_HUB_SECTION: HubSectionId = "atual";

export function isHubSectionId(value: string): value is HubSectionId {
  return HUB_SECTIONS.some((s) => s.id === value);
}

export function parseHubSectionHash(hash: string): HubSectionId | null {
  const raw = hash.replace(/^#/, "").trim().toLowerCase();
  if (!raw) return null;
  return isHubSectionId(raw) ? raw : null;
}
