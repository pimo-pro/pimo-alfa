/**
 * Loader local de Estatísticas do Projeto (Hub Documentação).
 * Sem fetch — snapshot estático dos KPIs oficiais mais recentes.
 */

export type HubStatTone = "neutral" | "blue" | "green";

export type HubStatIcon = "code" | "files" | "projects" | "designer" | "dev" | "ai";

export type HubStatDelta = {
  /** Percentagem já formatada (ex.: "306,5%"). */
  percentLabel: string;
  /** Direção do indicador. */
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
  cards: HubStatCard[];
};

/** Valores oficiais do último scan VS Code + Clin + ops internas. */
export function loadHubStats(): HubStatsSnapshot {
  return {
    sourceLabel: "Último scan VS Code + Clin · ops internas",
    cards: [
      {
        id: "loc",
        label: "Linhas de código",
        value: "297.871",
        hint: "Scan de código",
        icon: "code",
        tone: "blue",
        delta: { percentLabel: "306,5%", direction: "up" },
      },
      {
        id: "files",
        label: "Arquivos",
        value: "2.027",
        hint: "Scan de código",
        icon: "files",
        tone: "blue",
        delta: { percentLabel: "324,9%", direction: "up" },
      },
      {
        id: "projects",
        label: "Projetos criados",
        value: "0",
        hint: "Campo novo — placeholder",
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
