import * as THREE from "three";
import type { ViewerBoxEntry } from "../types";
import type { BoxAabb, SnapCandidate } from "./smartSnappingTypes";
import { boxesOverlapOnAxis, pushCandidate } from "./smartSnappingTypes";

type RowBox = { id: string; aabb: BoxAabb; minAlong: number; maxAlong: number };

/** Distribuição suave com gaps iguais entre caixas alinhadas no mesmo eixo. */
export function collectAutoSpacingCandidates(
  moving: BoxAabb,
  movingBoxId: string,
  boxes: Map<string, ViewerBoxEntry>,
  captureM: number,
  getAabb: (mesh: THREE.Object3D) => BoxAabb,
  out: SnapCandidate[]
): void {
  collectSpacingOnAxis("x", moving, movingBoxId, boxes, captureM, getAabb, out);
  collectSpacingOnAxis("z", moving, movingBoxId, boxes, captureM, getAabb, out);
}

function collectSpacingOnAxis(
  axis: "x" | "z",
  moving: BoxAabb,
  movingBoxId: string,
  boxes: Map<string, ViewerBoxEntry>,
  captureM: number,
  getAabb: (mesh: THREE.Object3D) => BoxAabb,
  out: SnapCandidate[]
): void {
  const perp: "x" | "z" = axis === "x" ? "z" : "x";
  const row: RowBox[] = [];

  boxes.forEach((entry, id) => {
    const aabb = id === movingBoxId ? moving : getAabb(entry.mesh);
    if (!boxesOverlapOnAxis(moving, aabb, perp)) return;
    const minAlong = axis === "x" ? aabb.min.x : aabb.min.z;
    const maxAlong = axis === "x" ? aabb.max.x : aabb.max.z;
    row.push({ id, aabb, minAlong, maxAlong });
  });

  if (row.length < 2) return;

  row.sort((a, b) => a.minAlong - b.minAlong);
  const movingIdx = row.findIndex((r) => r.id === movingBoxId);
  if (movingIdx < 0) return;

  const totalMin = row[0].minAlong;
  const totalMax = row[row.length - 1].maxAlong;
  const totalSpan = totalMax - totalMin;
  const boxesWidth = row.reduce((sum, r) => sum + (r.maxAlong - r.minAlong), 0);
  const gapCount = row.length - 1;
  if (gapCount <= 0) return;

  const equalGap = (totalSpan - boxesWidth) / gapCount;
  if (!Number.isFinite(equalGap) || equalGap < 0) return;

  let cursor = totalMin;
  const targetMin: number[] = [];
  for (let i = 0; i < row.length; i += 1) {
    targetMin.push(cursor);
    cursor += row[i].maxAlong - row[i].minAlong + equalGap;
  }

  const targetStart = targetMin[movingIdx];
  const currentStart = row[movingIdx].minAlong;
  const deltaVal = targetStart - currentStart;
  const distanceM = Math.abs(deltaVal);
  if (distanceM > captureM * 3) return;

  const delta = new THREE.Vector3();
  delta[axis] = deltaVal;
  const snapPoint = moving.center.clone();
  snapPoint[axis] = moving.center[axis] + deltaVal;

  pushCandidate(out, {
    kind: "autoSpacing",
    delta,
    snapPoint,
    distanceM,
    alignmentType: "spacing",
    distanceLabelMm: equalGap * 1000,
    guides: [
      {
        start: new THREE.Vector3(
          axis === "x" ? currentStart : moving.center.x,
          moving.center.y,
          axis === "z" ? currentStart : moving.center.z
        ),
        end: new THREE.Vector3(
          axis === "x" ? targetStart : moving.center.x,
          moving.center.y,
          axis === "z" ? targetStart : moving.center.z
        ),
      },
    ],
  });
}
