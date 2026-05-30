import type { ProjectRemate } from "./remateTypes";
import { RODAPE_MAX_LENGTH_MM } from "./remateTypes";

export type RemateMergeGroup = {
  id: string;
  remateIds: string[];
  faceKind: ProjectRemate["faceKind"];
  /** Comprimento total aproximado (mm) ao longo do eixo de união. */
  spanMm: number;
};

const TOUCH_TOLERANCE_MM = 8;
const ALIGN_TOLERANCE_MM = 12;

function sameFaceKind(a: ProjectRemate, b: ProjectRemate): boolean {
  return a.faceKind === b.faceKind && a.faceKind !== "L";
}

function axisKey(remate: ProjectRemate): "x" | "y" | "z" {
  if (remate.faceKind === "RODAPE" || remate.position === "rodape") return "x";
  if (remate.position === "dir" || remate.position === "esq") return "y";
  if (remate.position === "cima" || remate.position === "baixo") return "x";
  return "x";
}

function spanOnAxis(remate: ProjectRemate, axis: "x" | "y" | "z"): number {
  const { widthMm: w, heightMm: h, depthMm: d } = remate.dimensions;
  if (axis === "x") return w;
  if (axis === "y") return h;
  return d;
}

/**
 * Agrupa remates colados do mesmo tipo (merge apenas visual no viewer).
 */
export function computeRemateVisualMergeGroups(remates: ProjectRemate[]): RemateMergeGroup[] {
  const groups: RemateMergeGroup[] = [];
  const used = new Set<string>();

  for (let i = 0; i < remates.length; i++) {
    const a = remates[i]!;
    if (used.has(a.id) || a.type === "L") continue;

    const axis = axisKey(a);
    const cluster: ProjectRemate[] = [a];
    used.add(a.id);

    for (let j = i + 1; j < remates.length; j++) {
      const b = remates[j]!;
      if (used.has(b.id)) continue;
      if (!sameFaceKind(a, b)) continue;
      if (axisKey(b) !== axis) continue;
      const touchesCluster = cluster.some((member) => areRematesTouching(member, b));
      if (!touchesCluster) continue;
      cluster.push(b);
      used.add(b.id);
    }

    if (cluster.length < 2) continue;

    const spanMm = cluster.reduce((sum, r) => sum + spanOnAxis(r, axis), 0);
    if (cluster[0]!.faceKind === "RODAPE" && spanMm > RODAPE_MAX_LENGTH_MM) continue;

    const groupId = `merge-${cluster.map((r) => r.id).join("-")}`;
    groups.push({
      id: groupId,
      remateIds: cluster.map((r) => r.id),
      faceKind: cluster[0]!.faceKind,
      spanMm,
    });
  }

  return groups;
}

export function remateIdsInMergeGroup(groups: RemateMergeGroup[]): Set<string> {
  const set = new Set<string>();
  for (const g of groups) {
    if (g.remateIds.length >= 2) {
      g.remateIds.forEach((id) => set.add(id));
    }
  }
  return set;
}

export function areRematesTouching(a: ProjectRemate, b: ProjectRemate): boolean {
  if (!sameFaceKind(a, b)) return false;
  const axis = axisKey(a);
  if (axisKey(b) !== axis) return false;
  const spanA = spanOnAxis(a, axis);
  const spanB = spanOnAxis(b, axis);
  const tx = Math.abs((a.transform?.xMm ?? 0) - (b.transform?.xMm ?? 0));
  const ty = Math.abs((a.transform?.yMm ?? 0) - (b.transform?.yMm ?? 0));
  const tz = Math.abs((a.transform?.zMm ?? 0) - (b.transform?.zMm ?? 0));
  const dist = Math.max(tx, ty, tz);
  return dist <= Math.max(spanA, spanB) + TOUCH_TOLERANCE_MM && dist <= ALIGN_TOLERANCE_MM + spanA + spanB;
}
