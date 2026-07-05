import * as THREE from "three";
import { deltaForFlushAlign } from "./smartAlignSnapRules";
import type { ExplicitAlignMode } from "./smartAlignSnapTypes";
import type { SmartSnapEntity, SmartSnapEntityKind, UnifiedSnapCandidate } from "./smartAlignSnapTypes";
import type { BoxAabb } from "./smartSnappingTypes";
import { boxesOverlapOnAxis } from "./smartSnappingTypes";
import { getEntityWorldBoxAabb } from "./smartAlignSnapAabb";

export type DynamicAlignKind =
  | "align_left"
  | "align_right"
  | "align_front"
  | "align_back"
  | "align_top"
  | "align_bottom"
  | "adjacent_left"
  | "adjacent_right"
  | "adjacent_front"
  | "adjacent_back";

type SameEdgeRule = { mode: ExplicitAlignMode; kind: DynamicAlignKind; axis: "x" | "y" | "z" };

const ALL_SAME_EDGE: SameEdgeRule[] = [
  { mode: "left", kind: "align_left", axis: "x" },
  { mode: "right", kind: "align_right", axis: "x" },
  { mode: "front", kind: "align_front", axis: "z" },
  { mode: "back", kind: "align_back", axis: "z" },
  { mode: "top", kind: "align_top", axis: "y" },
  { mode: "bottom", kind: "align_bottom", axis: "y" },
];

const REMATE_SAME_EDGE: SameEdgeRule[] = [
  { mode: "left", kind: "align_left", axis: "x" },
  { mode: "right", kind: "align_right", axis: "x" },
  { mode: "front", kind: "align_front", axis: "z" },
  { mode: "bottom", kind: "align_bottom", axis: "y" },
];

type AdjacencyRule = {
  movingVal: (b: BoxAabb) => number;
  otherVal: (b: BoxAabb) => number;
  axis: "x" | "y" | "z";
  kind: DynamicAlignKind;
  perp: "x" | "z";
};

const BOX_ADJACENCY: AdjacencyRule[] = [
  {
    movingVal: (b) => b.min.x,
    otherVal: (b) => b.max.x,
    axis: "x",
    kind: "adjacent_right",
    perp: "z",
  },
  {
    movingVal: (b) => b.max.x,
    otherVal: (b) => b.min.x,
    axis: "x",
    kind: "adjacent_left",
    perp: "z",
  },
  {
    movingVal: (b) => b.min.z,
    otherVal: (b) => b.max.z,
    axis: "z",
    kind: "adjacent_back",
    perp: "x",
  },
  {
    movingVal: (b) => b.max.z,
    otherVal: (b) => b.min.z,
    axis: "z",
    kind: "adjacent_front",
    perp: "x",
  },
];

const REMATE_ADJACENCY: AdjacencyRule[] = [
  {
    movingVal: (b) => b.min.x,
    otherVal: (b) => b.max.x,
    axis: "x",
    kind: "adjacent_right",
    perp: "z",
  },
  {
    movingVal: (b) => b.max.x,
    otherVal: (b) => b.min.x,
    axis: "x",
    kind: "adjacent_left",
    perp: "z",
  },
  {
    movingVal: (b) => b.max.z,
    otherVal: (b) => b.min.z,
    axis: "z",
    kind: "adjacent_front",
    perp: "x",
  },
  {
    movingVal: (b) => b.max.y,
    otherVal: (b) => b.min.y,
    axis: "y",
    kind: "align_bottom",
    perp: "x",
  },
];

function sameEdgeRules(movingKind: SmartSnapEntityKind): SameEdgeRule[] {
  if (movingKind === "remate") return REMATE_SAME_EDGE;
  return ALL_SAME_EDGE;
}

function adjacencyRules(movingKind: SmartSnapEntityKind): AdjacencyRule[] {
  if (movingKind === "remate") return REMATE_ADJACENCY;
  return BOX_ADJACENCY;
}

function axisDistance(delta: THREE.Vector3, axis: "x" | "y" | "z"): number {
  return Math.abs(delta[axis]);
}

function pushCandidate(
  out: UnifiedSnapCandidate[],
  params: {
    delta: THREE.Vector3;
    kind: DynamicAlignKind;
    target: SmartSnapEntity;
    priority: number;
    axis: "x" | "y" | "z";
  }
): void {
  const distanceM = axisDistance(params.delta, params.axis);
  if (distanceM <= 0) return;
  out.push({
    delta: params.delta,
    distanceM,
    priority: params.priority,
    kind: params.kind,
    targetId: params.target.id,
    targetKind: params.target.kind,
  });
}

function requiresOverlapOnXZ(mode: ExplicitAlignMode): boolean {
  return mode === "top" || mode === "bottom";
}

/**
 * Candidatos de alinhamento dinâmico durante drag.
 * Caixas: todas as faces. Remates: esquerda, direita, frente, base.
 */
export function collectDynamicAlignCandidates(params: {
  movingMesh: THREE.Object3D;
  movingKind: SmartSnapEntityKind;
  movingId: string;
  entities: SmartSnapEntity[];
  captureM: number;
}): UnifiedSnapCandidate[] {
  const { movingMesh, movingKind, movingId, entities, captureM } = params;
  const moving = getEntityWorldBoxAabb(movingMesh, movingKind);
  const out: UnifiedSnapCandidate[] = [];
  const sameEdges = sameEdgeRules(movingKind);
  const adjacency = adjacencyRules(movingKind);

  for (const target of entities) {
    if (target.id === movingId && target.kind === movingKind) continue;
    if (target.kind === "room") continue;

    const other = getEntityWorldBoxAabb(target.mesh, target.kind);

    for (const edge of sameEdges) {
      const delta = deltaForFlushAlign(moving, other, edge.mode);
      if (!delta) continue;
      const distanceM = axisDistance(delta, edge.axis);
      if (distanceM > captureM) continue;

      if (requiresOverlapOnXZ(edge.mode)) {
        if (!boxesOverlapOnAxis(moving, other, "x") || !boxesOverlapOnAxis(moving, other, "z")) {
          continue;
        }
      }

      pushCandidate(out, {
        delta,
        kind: edge.kind,
        target,
        priority: 2,
        axis: edge.axis,
      });
    }

    for (const adj of adjacency) {
      if (adj.kind === "align_bottom" && sameEdges.some((e) => e.kind === "align_bottom")) {
        continue;
      }
      const gap = adj.otherVal(other) - adj.movingVal(moving);
      const distanceM = Math.abs(gap);
      if (distanceM > captureM) continue;

      if (adj.axis === "y") {
        if (!boxesOverlapOnAxis(moving, other, "x") || !boxesOverlapOnAxis(moving, other, "z")) continue;
      } else {
        if (!boxesOverlapOnAxis(moving, other, adj.perp)) continue;
      }

      const delta = new THREE.Vector3();
      delta[adj.axis] = gap;
      pushCandidate(out, {
        delta,
        kind: adj.kind,
        target,
        priority: 3,
        axis: adj.axis,
      });
    }
  }

  return out;
}
