import type { RodapeKind, ProjectRodape } from "./rodapeTypes";
import { RODAPE_MAX_LENGTH_MM } from "../kitchenFinish/finishTypes";

export type RodapeMergeGroup = {
  id: string;
  rodapeIds: string[];
  kind: RodapeKind;
  spanMm: number;
};

function sameKind(a: ProjectRodape, b: ProjectRodape): boolean {
  return a.kind === b.kind && a.kind !== "L" && a.kind !== "U";
}

export function areRodapesTouching(a: ProjectRodape, b: ProjectRodape): boolean {
  if (!sameKind(a, b)) return false;
  const tx = Math.abs((a.transform?.xMm ?? 0) - (b.transform?.xMm ?? 0));
  const ty = Math.abs((a.transform?.yMm ?? 0) - (b.transform?.yMm ?? 0));
  const tz = Math.abs((a.transform?.zMm ?? 0) - (b.transform?.zMm ?? 0));
  const dist = Math.max(tx, ty, tz);
  const span = Math.max(a.dimensions.widthMm, b.dimensions.widthMm);
  return dist <= span + 8;
}

export function computeRodapeVisualMergeGroups(rodapes: ProjectRodape[]): RodapeMergeGroup[] {
  const groups: RodapeMergeGroup[] = [];
  const used = new Set<string>();

  for (let i = 0; i < rodapes.length; i++) {
    const a = rodapes[i]!;
    if (used.has(a.id) || a.kind === "L" || a.kind === "U") continue;
    const cluster: ProjectRodape[] = [a];
    used.add(a.id);

    for (let j = i + 1; j < rodapes.length; j++) {
      const b = rodapes[j]!;
      if (used.has(b.id) || !sameKind(a, b)) continue;
      if (!cluster.some((m) => areRodapesTouching(m, b))) continue;
      cluster.push(b);
      used.add(b.id);
    }

    if (cluster.length < 2) continue;
    const spanMm = cluster.reduce((sum, r) => sum + r.dimensions.widthMm, 0);
    if (spanMm > RODAPE_MAX_LENGTH_MM) continue;

    groups.push({
      id: `rodape-merge-${cluster.map((r) => r.id).join("-")}`,
      rodapeIds: cluster.map((r) => r.id),
      kind: cluster[0]!.kind,
      spanMm,
    });
  }

  return groups;
}

export function rodapeIdsInMergeGroup(groups: RodapeMergeGroup[]): Set<string> {
  const set = new Set<string>();
  for (const g of groups) {
    if (g.rodapeIds.length >= 2) g.rodapeIds.forEach((id) => set.add(id));
  }
  return set;
}
