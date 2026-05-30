import type { WorkspaceBox } from "../types";
import {
  RODAPE_MAX_LENGTH_MM,
  type FinishDimensions,
} from "./finishTypes";
import {
  type KitchenFinishRoomContext,
  workspaceBoxToWorldMm,
  type WorkspaceBoxWorldMm,
} from "./roomContext";

const GAP_MM = 4;

export type AutoExtendAxis = "x" | "z";

export function computeAutoExtendSpanMm(params: {
  parentBox: WorkspaceBox;
  allBoxes: WorkspaceBox[];
  room: KitchenFinishRoomContext;
  axis: AutoExtendAxis;
  /** Sentido positivo ao longo do eixo (ex.: +X à direita do módulo). */
  positiveDirection: boolean;
  maxMm?: number;
}): number {
  const { parentBox, allBoxes, room, axis, positiveDirection } = params;
  const maxMm = params.maxMm ?? RODAPE_MAX_LENGTH_MM;
  const self = workspaceBoxToWorldMm(parentBox);
  const start = positiveDirection
    ? axis === "x"
      ? self.maxX
      : self.maxZ
    : axis === "x"
      ? self.minX
      : self.minZ;

  const obstacles: number[] = [];
  for (const other of allBoxes) {
    if (other.id === parentBox.id) continue;
    const ob = workspaceBoxToWorldMm(other);
    if (!overlapsPerpendicular(self, ob, axis)) continue;
    obstacles.push(
      positiveDirection
        ? axis === "x"
          ? ob.minX
          : ob.minZ
        : axis === "x"
          ? ob.maxX
          : ob.maxZ
    );
  }

  if (room.boundsM) {
    const b = room.boundsM;
    const boundMm = (v: number) => v * 1000;
    obstacles.push(
      positiveDirection
        ? axis === "x"
          ? boundMm(b.maxX)
          : boundMm(b.maxZ)
        : axis === "x"
          ? boundMm(b.minX)
          : boundMm(b.minZ)
    );
  }

  let end = positiveDirection ? start + maxMm : start - maxMm;
  for (const ob of obstacles) {
    if (positiveDirection && ob > start + GAP_MM && ob < end) end = ob - GAP_MM;
    if (!positiveDirection && ob < start - GAP_MM && ob > end) end = ob + GAP_MM;
  }

  const span = Math.abs(end - start);
  return Math.max(50, Math.min(maxMm, span));
}

function overlapsPerpendicular(a: WorkspaceBoxWorldMm, b: WorkspaceBoxWorldMm, axis: AutoExtendAxis): boolean {
  if (axis === "x") {
    return !(a.maxZ < b.minZ || a.minZ > b.maxZ);
  }
  return !(a.maxX < b.minX || a.minX > b.maxX);
}

export function applyAutoWidth(
  dimensions: FinishDimensions,
  spanMm: number,
  axis: "width" | "depth" = "width"
): FinishDimensions {
  if (axis === "width") return { ...dimensions, widthMm: spanMm };
  return { ...dimensions, depthMm: spanMm };
}
