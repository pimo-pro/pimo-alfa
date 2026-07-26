/**
 * Loader local de Estatisticas do Projeto (Hub Documentacao).
 * KPIs oficiais + contagem dinamica de projetos (loadProjectCount).
 */

import { loadProjectCount } from "@/core/projects/loadProjectCount";

export type HubStatTone = "neutral" | "blue" | "green";

export type HubStatIcon = "code" | "files" | "projects" | "designer" | "dev" | "ai";

export type HubStatDelta = {
  /** Percentagem ja formatada (ex.: "306,5%"). */
  percentLabel: string;
  /** Direcao do indicador. */
  direction: "up" | "down" | "flat";
};

export type HubStatCard = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  icon: HubStatIcon;
  tone: HubStatTone;
  delta?: HubStatDelta;
};

export type HubStatsSnapshot = {
  sourceLabel: string;
  /** Contagem dinamica de projetos (loadProjectCount / /PROJETOS). */
  totalProjects: number;
  cards: HubStatCard[];
};

/** Snapshot de stats do Hub (projetos via loadProjectCount). */
export function loadHubStats(): HubStatsSnapshot {
  const { totalProjects } = loadProjectCount();
  const projectsValue = totalProjects.toLocaleString("pt-PT");

  return {
    sourceLabel: "\u00daltimo scan VS Code + Clin \u00b7 ops internas \u00b7 /PROJETOS",
    totalProjects,
    cards: [
      {
        id: "loc",
        label: "Linhas de c\u00f3digo",
        value: "297.871",
        hint: "Scan de c\u00f3digo",
        icon: "code",
        tone: "blue",
        delta: { percentLabel: "306,5%", direction: "up" },
      },
      {
        id: "files",
        label: "Arquivos",
        value: "2.027",
        hint: "Scan de c\u00f3digo",
        icon: "files",
        tone: "blue",
        delta: { percentLabel: "324,9%", direction: "up" },
      },
      {
        id: "projects",
        label: "Projetos criados",
        value: projectsValue,
        hint: "Din\u00e2mico \u2014 alinhado a /PROJETOS",
        icon: "projects",
        tone: "neutral",
      },
      {
        id: "designers",
        label: "Designers ativos",
        value: "1",
        icon: "designer",
        tone: "neutral",
      },
      {
        id: "devs",
        label: "Programadores ativos",
        value: "1",
        icon: "dev",
        tone: "neutral",
      },
      {
        id: "agents",
        label: "Agentes de IA ativos",
        value: "6",
        icon: "ai",
        tone: "green",
      },
    ],
  };
}
