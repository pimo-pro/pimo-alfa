/**
 * Helpers de projeto: geometria, spawn, identificação de caixas.
 * Usado por ProjectProvider e useProjectActions.
 */

import type { WorkspaceBox } from "../core/types";
import type { ProjectState } from "./projectTypes";
import { wallStore } from "../stores/wallStore";

export const UPPER_FLOOR_DEFAULT_MM = 1500;
export const UPPER_STANDARD_GAP_MM = 680;
export const UPPER_COUNTERTOP_MM = 0;

export function getSpawnFromSelectedWall(
  dimensoes: { largura: number; profundidade: number; altura: number }
): { posicaoX_mm: number; posicaoZ_mm: number; rotacaoY: number } | null {
  const state = wallStore.getState();
  const walls = state.walls ?? [];
  if (!walls.length) return null;

  const selectedIndex = state.selectedWallId
    ? walls.findIndex((wall) => wall.id === state.selectedWallId)
    : -1;
  const wallIndex =
    selectedIndex >= 0 ? selectedIndex : Math.max(0, Math.min(3, state.mainWallIndex ?? 0));
  const wall = walls[wallIndex];
  if (!wall?.position) return null;

  const offsetMm = Math.max(20, (dimensoes.profundidade ?? 0) / 2 + 20);
  const rotacaoByWall: Record<number, number> = {
    0: 0,
    1: -Math.PI / 2,
    2: Math.PI,
    3: Math.PI / 2,
  };
  const normalByWall: Record<number, { x: number; z: number }> = {
    0: { x: 0, z: 1 },
    1: { x: -1, z: 0 },
    2: { x: 0, z: -1 },
    3: { x: 1, z: 0 },
  };

  const normal = normalByWall[wallIndex] ?? { x: 0, z: 1 };
  const wallX_mm = (wall.position.x ?? 0) * 10;
  const wallZ_mm = (wall.position.z ?? 0) * 10;

  return {
    posicaoX_mm: wallX_mm + normal.x * offsetMm,
    posicaoZ_mm: wallZ_mm + normal.z * offsetMm,
    rotacaoY: rotacaoByWall[wallIndex] ?? 0,
  };
}

export function isLowerCabinet(box: WorkspaceBox): boolean {
  return box.cabinetType === "lower" || (box.cabinetType == null && box.feetEnabled !== false);
}

export function isUpperCabinet(box: WorkspaceBox): boolean {
  return box.cabinetType === "upper";
}

export function getBoxLeftMm(box: WorkspaceBox): number {
  return (box.posicaoX_mm ?? 0) - (box.dimensoes?.largura ?? 0) / 2;
}

export function getBoxRightMm(box: WorkspaceBox): number {
  return (box.posicaoX_mm ?? 0) + (box.dimensoes?.largura ?? 0) / 2;
}

export function getBoxTopMm(box: WorkspaceBox): number {
  return (box.posicaoY_mm ?? 0) + (box.dimensoes?.altura ?? 0) / 2;
}

export function getNextWorkspaceBoxId(
  workspaceBoxes: WorkspaceBox[],
  preferredIndex?: number
): { id: string; index: number } {
  const nextIndex =
    preferredIndex !== undefined && Number.isFinite(preferredIndex)
      ? preferredIndex
      : workspaceBoxes.length + 1;
  const id = `box-${nextIndex}-${Date.now()}`;
  return { id, index: nextIndex };
}

const NEW_BOX_GAP_MM = 0;

export function getAdjacentPlacementMm(
  referenceBox: WorkspaceBox,
  targetDimensions: { largura: number },
  gapMm = NEW_BOX_GAP_MM
): { x_mm: number; z_mm: number } {
  const referenceWidthMm = Math.max(0, referenceBox.dimensoes?.largura ?? 0);
  const targetWidthMm = Math.max(0, targetDimensions.largura ?? 0);
  const distanceMm = referenceWidthMm / 2 + targetWidthMm / 2 + Math.max(0, gapMm);
  const rotationY = Number.isFinite(referenceBox.rotacaoY) ? (referenceBox.rotacaoY ?? 0) : 0;
  const dirX = Math.cos(rotationY);
  const dirZ = Math.sin(rotationY);
  return {
    x_mm: (referenceBox.posicaoX_mm ?? 0) + dirX * distanceMm,
    z_mm: (referenceBox.posicaoZ_mm ?? 0) + dirZ * distanceMm,
  };
}

export function getSelectedOrFirstWorkspaceBox(prev: ProjectState): WorkspaceBox | null {
  const list = prev.workspaceBoxes ?? [];
  const selected = list.find((b) => b.id === prev.selectedWorkspaceBoxId);
  return selected ?? list[0] ?? null;
}
