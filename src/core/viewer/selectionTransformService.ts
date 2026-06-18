import type { ProjectState } from "../../context/projectTypes";
import type { WorkspaceBox } from "../types";
import type { RematePiece } from "../remate/rematePieceTypes";
import type { ProjectRodape } from "../rodape/rodapeTypes";
import { decodeSelectionId } from "./selectionIds";
import { maxLengthAcross, scaleDimensionValues, type ScalingMode } from "./scalingModes";
import { regenerateLayersForBox } from "../../services/boxLayersService";

export type ScalableTarget =
  | { kind: "box"; boxId: string; dimensions: [number, number, number] }
  | { kind: "door"; boxId: string; doorLayerId: string; dimensions: [number, number] }
  | { kind: "drawer"; boxId: string; drawerLayerId: string; dimensions: [number, number, number] }
  | { kind: "remate"; remateId: string; dimensions: [number, number, number] }
  | { kind: "rodape"; rodapeId: string; dimensions: [number, number, number] };

export function resolveScalableTargets(
  project: ProjectState,
  selectedObjectIds: string[]
): ScalableTarget[] {
  const targets: ScalableTarget[] = [];
  for (const encoded of selectedObjectIds) {
    const decoded = decodeSelectionId(encoded);
    if (!decoded) continue;
    const { kind, id, secondaryId } = decoded;

    if (kind === "box") {
      const box = project.workspaceBoxes.find((b) => b.id === id);
      if (!box?.dimensoes) continue;
      targets.push({
        kind: "box",
        boxId: id,
        dimensions: [box.dimensoes.largura, box.dimensoes.altura, box.dimensoes.profundidade],
      });
      continue;
    }

    if (kind === "door") {
      const doorId = secondaryId ?? id;
      const box = project.workspaceBoxes.find((b) => (b.doorsLayer ?? []).some((d) => d.id === doorId));
      const door = box?.doorsLayer?.find((d) => d.id === doorId);
      if (!box || !door) continue;
      targets.push({
        kind: "door",
        boxId: box.id,
        doorLayerId: door.id,
        dimensions: [door.width, door.height],
      });
      continue;
    }

    if (kind === "drawer") {
      const drawerId = secondaryId ?? id;
      const box = project.workspaceBoxes.find((b) => (b.drawersLayer ?? []).some((d) => d.id === drawerId));
      const drawer = box?.drawersLayer?.find((d) => d.id === drawerId);
      if (!box || !drawer) continue;
      targets.push({
        kind: "drawer",
        boxId: box.id,
        drawerLayerId: drawer.id,
        dimensions: [drawer.width, drawer.height, drawer.depth],
      });
      continue;
    }

    if (kind === "remate") {
      const remate = (project.remates ?? []).find((r) => r.id === id);
      if (!remate) continue;
      targets.push({
        kind: "remate",
        remateId: remate.id,
        dimensions: [remate.width, remate.height, remate.depth],
      });
      continue;
    }

    if (kind === "rodape") {
      const rodape = (project.rodapes ?? []).find((r) => r.id === id);
      if (!rodape) continue;
      const dims = rodape.dimensions;
      targets.push({
        kind: "rodape",
        rodapeId: rodape.id,
        dimensions: [dims.widthMm, dims.heightMm, dims.depthMm],
      });
    }
  }
  return targets;
}

export function computeScalingForTargets(
  targets: ScalableTarget[],
  newMaxLength: number,
  mode: ScalingMode
): Map<string, number[]> {
  const allDims = targets.map((t) => t.dimensions);
  maxLengthAcross(...allDims);
  const result = new Map<string, number[]>();
  for (const target of targets) {
    const key = targetKey(target);
    result.set(key, scaleDimensionValues(target.dimensions, newMaxLength, mode));
  }
  return result;
}

function targetKey(target: ScalableTarget): string {
  switch (target.kind) {
    case "box":
      return `box:${target.boxId}`;
    case "door":
      return `door:${target.doorLayerId}`;
    case "drawer":
      return `drawer:${target.drawerLayerId}`;
    case "remate":
      return `remate:${target.remateId}`;
    case "rodape":
      return `rodape:${target.rodapeId}`;
  }
}

export function applyScalingToProject(
  project: ProjectState,
  selectedObjectIds: string[],
  newMaxLength: number,
  mode: ScalingMode
): Pick<ProjectState, "workspaceBoxes" | "remates" | "rodapes"> {
  const targets = resolveScalableTargets(project, selectedObjectIds);
  const scaled = computeScalingForTargets(targets, newMaxLength, mode);

  let workspaceBoxes = project.workspaceBoxes;
  let remates = project.remates ?? [];
  let rodapes = project.rodapes ?? [];

  for (const target of targets) {
    const key = targetKey(target);
    const nextDims = scaled.get(key);
    if (!nextDims) continue;

    if (target.kind === "box") {
      workspaceBoxes = workspaceBoxes.map((box) => {
        if (box.id !== target.boxId) return box;
        const updatedBox: WorkspaceBox = {
          ...box,
          dimensoes: {
            largura: Math.round(nextDims[0] ?? box.dimensoes.largura),
            altura: Math.round(nextDims[1] ?? box.dimensoes.altura),
            profundidade: Math.round(nextDims[2] ?? box.dimensoes.profundidade),
          },
          profundidadeExterna: Math.round(nextDims[2] ?? box.dimensoes.profundidade),
        };
        const layers = regenerateLayersForBox(updatedBox, { preserveMaterials: true });
        return { ...updatedBox, ...layers };
      });
    }

    if (target.kind === "door") {
      workspaceBoxes = workspaceBoxes.map((box) => {
        if (box.id !== target.boxId) return box;
        return {
          ...box,
          doorsLayer: (box.doorsLayer ?? []).map((door) =>
            door.id === target.doorLayerId
              ? {
                  ...door,
                  width: Math.round(nextDims[0] ?? door.width),
                  height: Math.round(nextDims[1] ?? door.height),
                }
              : door
          ),
        };
      });
    }

    if (target.kind === "drawer") {
      workspaceBoxes = workspaceBoxes.map((box) => {
        if (box.id !== target.boxId) return box;
        return {
          ...box,
          drawersLayer: (box.drawersLayer ?? []).map((drawer) =>
            drawer.id === target.drawerLayerId
              ? {
                  ...drawer,
                  width: Math.round(nextDims[0] ?? drawer.width),
                  height: Math.round(nextDims[1] ?? drawer.height),
                  depth: Math.round(nextDims[2] ?? drawer.depth),
                }
              : drawer
          ),
        };
      });
    }

    if (target.kind === "remate") {
      remates = remates.map((remate: RematePiece) =>
        remate.id === target.remateId
          ? {
              ...remate,
              width: Math.round(nextDims[0] ?? remate.width),
              height: Math.round(nextDims[1] ?? remate.height),
              depth: Math.round(nextDims[2] ?? remate.depth),
            }
          : remate
      );
    }

    if (target.kind === "rodape") {
      rodapes = rodapes.map((rodape: ProjectRodape) => {
        if (rodape.id !== target.rodapeId) return rodape;
        const current = rodape.dimensions;
        const next = {
          widthMm: Math.round(nextDims[0] ?? current.widthMm),
          heightMm: Math.round(nextDims[1] ?? current.heightMm),
          depthMm: Math.round(nextDims[2] ?? current.depthMm),
        };
        return {
          ...rodape,
          dimensions: next,
          heightMm: next.heightMm,
        };
      });
    }
  }

  return { workspaceBoxes, remates, rodapes };
}
