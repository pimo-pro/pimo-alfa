/**
 * Secções do Hub de Documentação Interna (/documentacao).
 * Ids estáveis para hash e navegação.
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
    label: "Documentação atual",
    blurb: "Índice curado e referências vigentes",
    icon: "adminDocs",
  },
  {
    id: "historico",
    label: "Documentação histórica",
    blurb: "Arquivo imutável migrado do legado",
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
    blurb: "Estado de construção e fases",
    icon: "adminChart",
  },
  {
    id: "refs",
    label: "Referências técnicas",
    blurb: "architectureIndex e módulos core",
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
    blurb: "Próximas etapas e roadmap",
    icon: "adminChecklist",
  },
  {
    id: "dashboard",
    label: "Dashboard avançado",
    blurb: "KPIs, gráficos SVG e saúde do Hub",
    icon: "adminChart",
  },
  {
    id: "pimo-soon",
    label: "pimo-soon",
    blurb: "Plano oficial de fases futuras (13–18)",
    icon: "adminChecklist",
  },
];

/** Secção inicial de /documentacao quando não há hash (e sem override Admin). */
export const DEFAULT_HUB_SECTION: HubSectionId = "progresso";

export function isHubSectionId(value: string): value is HubSectionId {
  return HUB_SECTIONS.some((s) => s.id === value);
}

export function parseHubSectionHash(hash: string): HubSectionId | null {
  const raw = hash.replace(/^#/, "").trim().toLowerCase();
  if (!raw) return null;
  return isHubSectionId(raw) ? raw : null;
}
