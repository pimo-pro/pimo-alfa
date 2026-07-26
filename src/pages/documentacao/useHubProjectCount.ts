/**
 * Contagem dinamica de projetos alinhada a `/PROJETOS`
 * (loadProjectCountAsync — sem rotas novas).
 */

import { useEffect, useState } from "react";
import { loadProjectCountAsync } from "@/core/projects/loadProjectCount";

export function useHubProjectCount(): number | null {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadProjectCountAsync()
      .then(({ totalProjects }) => {
        if (!cancelled) setTotal(totalProjects);
      })
      .catch(() => {
        if (!cancelled) setTotal(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return total;
}

export function applyHubProjectCount<T extends { id: string; value: string; hint?: string }>(
  cards: T[],
  total: number | null
): T[] {
  if (total === null) return cards;
  const value = total.toLocaleString("pt-PT");
  return cards.map((card) =>
    card.id === "projects"
      ? {
          ...card,
          value,
          hint: "Din\u00e2mico \u2014 alinhado a /PROJETOS",
        }
      : card
  );
}
