import type { HematiKind, ProjectHemati } from "./hematiTypes";
import { RODAPE_MAX_LENGTH_MM } from "../kitchenFinish/finishTypes";

export type HematiMergeGroup = {
  id: string;
  hematiIds: string[];
  kind: HematiKind;
  spanMm: number;
};

function sameKind(a: ProjectHemati, b: ProjectHemati): boolean {
  return a.kind === b.kind && a.kind !== "L" && a.kind !== "U";
}

function axisForKind(kind: HematiKind): "x" | "y" | "z" {
  if (kind === "DIR" || kind === "ESQ") return "z";
  if (kind === "CIMA" || kind === "BAIXO" || kind === "FULL") return "x";
  return "x";
}

function spanOnAxis(h: ProjectHemati, axis: "x" | "y" | "z"): number {
  const { widthMm: w, heightMm: ht, depthMm: d } = h.dimensions;
  if (axis === "x") return w;
  if (axis === "y") return ht;
  return d;
}

export function areHematisTouching(a: ProjectHemati, b: ProjectHemati): boolean {
  if (!sameKind(a, b)) return false;
  const tx = Math.abs((a.transform?.xMm ?? 0) - (b.transform?.xMm ?? 0));
  const ty = Math.abs((a.transform?.yMm ?? 0) - (b.transform?.yMm ?? 0));
  const tz = Math.abs((a.transform?.zMm ?? 0) - (b.transform?.zMm ?? 0));
  const axis = axisForKind(a.kind);
  const spanA = spanOnAxis(a, axis);
  const spanB = spanOnAxis(b, axis);
  const dist = Math.max(tx, ty, tz);
  return dist <= Math.max(spanA, spanB) + 8;
}

export function computeHematiVisualMergeGroups(hematis: ProjectHemati[]): HematiMergeGroup[] {
  const groups: HematiMergeGroup[] = [];
  const used = new Set<string>();

  for (let i = 0; i < hematis.length; i++) {
    const a = hematis[i]!;
    if (used.has(a.id) || a.kind === "L" || a.kind === "U") continue;
    const axis = axisForKind(a.kind);
    const cluster: ProjectHemati[] = [a];
    used.add(a.id);

    for (let j = i + 1; j < hematis.length; j++) {
      const b = hematis[j]!;
      if (used.has(b.id) || !sameKind(a, b)) continue;
      if (!cluster.some((m) => areHematisTouching(m, b))) continue;
      cluster.push(b);
      used.add(b.id);
    }

    if (cluster.length < 2) continue;
    const spanMm = cluster.reduce((sum, h) => sum + spanOnAxis(h, axis), 0);
    if (spanMm > RODAPE_MAX_LENGTH_MM) continue;

    groups.push({
      id: `hemati-merge-${cluster.map((h) => h.id).join("-")}`,
      hematiIds: cluster.map((h) => h.id),
      kind: cluster[0]!.kind,
      spanMm,
    });
  }

  return groups;
}

export function hematiIdsInMergeGroup(groups: HematiMergeGroup[]): Set<string> {
  const set = new Set<string>();
  for (const g of groups) {
    if (g.hematiIds.length >= 2) g.hematiIds.forEach((id) => set.add(id));
  }
  return set;
}
