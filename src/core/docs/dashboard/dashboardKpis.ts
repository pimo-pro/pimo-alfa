/**
 * KPIs do Dashboard — derivados de loadHubStats + loadHubProgresso + loadHubAtual.
 * Sem fetch; não altera loaders existentes.
 */

import { loadHubStats } from "@/pages/documentacao/loadHubStats";
import { loadHubProgresso } from "../progresso/loadHubProgresso";
import { loadHubAtual } from "../atual/loadHubAtual";
import type { DashboardCounters, DashboardKpi, DashboardTone } from "./dashboardTypes";

function sparkFromDelta(base: number, upPercent: number): number[] {
  const start = Math.max(1, Math.round(base / (1 + upPercent / 100)));
  const steps = 6;
  const out: number[] = [];
  for (let i = 0; i < steps; i += 1) {
    const t = i / (steps - 1);
    out.push(Math.round(start + (base - start) * t));
  }
  return out;
}

function parsePtNumber(raw: string): number {
  return Number(String(raw).replace(/\./g, "").replace(",", ".")) || 0;
}

function parsePtPercent(raw: string): number {
  return Number(String(raw).replace("%", "").replace(",", ".")) || 0;
}

function toneOf(id: string): DashboardTone {
  if (id === "loc" || id === "files") return "blue";
  if (id === "agents" || id === "completion") return "green";
  if (id === "projects") return "amber";
  return "neutral";
}

export function buildDashboardKpis(): {
  kpis: DashboardKpi[];
  counters: DashboardCounters;
} {
  const stats = loadHubStats();
  const progresso = loadHubProgresso();
  const atual = loadHubAtual();

  const kpis: DashboardKpi[] = stats.cards.map((card) => {
    const valueNum = parsePtNumber(card.value);
    const up = card.delta ? parsePtPercent(card.delta.percentLabel) : 0;
    return {
      id: card.id,
      label: card.label,
      value: card.value,
      hint: card.hint,
      tone: toneOf(card.id),
      deltaLabel:
        card.delta && card.delta.direction === "up"
          ? "↑ " + card.delta.percentLabel
          : undefined,
      sparkline:
        card.delta && valueNum > 0
          ? sparkFromDelta(valueNum, up)
          : [1, 1, 1, 1, 1, Math.max(1, valueNum || Number(card.value) || 1)],
    };
  });

  kpis.push({
    id: "completion",
    label: "Conclusão (secções)",
    value: String(progresso.counters.completionPercent) + "%",
    hint: progresso.counters.completed + "/" + progresso.counters.total + " itens",
    tone: "green",
    sparkline: [
      Math.max(0, progresso.counters.completionPercent - 40),
      Math.max(0, progresso.counters.completionPercent - 30),
      Math.max(0, progresso.counters.completionPercent - 20),
      Math.max(0, progresso.counters.completionPercent - 10),
      Math.max(0, progresso.counters.completionPercent - 5),
      progresso.counters.completionPercent,
    ],
  });

  kpis.push({
    id: "roadmap",
    label: "Roadmap",
    value: String(atual.resumo.roadmapProgress) + "%",
    hint: atual.resumo.currentPhaseTitle ?? "Phase atual",
    tone: "blue",
    sparkline: [
      Math.max(0, atual.resumo.roadmapProgress - 25),
      Math.max(0, atual.resumo.roadmapProgress - 18),
      Math.max(0, atual.resumo.roadmapProgress - 12),
      Math.max(0, atual.resumo.roadmapProgress - 6),
      Math.max(0, atual.resumo.roadmapProgress - 2),
      atual.resumo.roadmapProgress,
    ],
  });

  return {
    kpis,
    counters: {
      completed: progresso.counters.completed,
      inProgress: progresso.counters.inProgress,
      planned: progresso.counters.planned,
      total: progresso.counters.total,
      completionPercent: progresso.counters.completionPercent,
      roadmapProgress: atual.resumo.roadmapProgress,
    },
  };
}
