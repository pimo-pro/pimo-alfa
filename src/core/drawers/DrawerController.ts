/**
 * Controlador de abertura/fecho das gavetas no Viewer.
 * Sincroniza estado (drawersLayer) com DrawerMotionService e DrawerCollisionService.
 */

import type { WorkspaceBox } from "../types";
import type { DrawerLayerItem } from "../../models/BoxLayers";
import {
  DRAWER_SEQUENTIAL_STEP_DELAY_MS,
  closeDrawer,
  openDrawer,
  resolveDrawerMaxPullMm,
} from "./DrawerMotionService";
export type DrawerOpenOptions = {
  /** Durante abertura sequencial global — permite várias gavetas abertas. */
  allowMultipleOpen?: boolean;
};

export type DrawerControllerCallbacks = {
  getBox: () => WorkspaceBox | undefined;
  setDrawerOpen: (drawerId: string, isOpen: boolean, options?: DrawerOpenOptions) => void;
};

const sequentialCancelByBox = new Map<string, () => void>();

function sortDrawersBottomToTop(drawers: DrawerLayerItem[]): DrawerLayerItem[] {
  return [...drawers].sort((a, b) => (a.posY ?? 0) - (b.posY ?? 0));
}

function beginSequentialRun(boxId: string): {
  schedule: (index: number, fn: () => void) => void;
  cancelIfEmpty: (stepCount: number) => void;
} {
  sequentialCancelByBox.get(boxId)?.();
  sequentialCancelByBox.delete(boxId);

  const timeoutIds: ReturnType<typeof setTimeout>[] = [];
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
    for (const id of timeoutIds) clearTimeout(id);
    sequentialCancelByBox.delete(boxId);
  };

  sequentialCancelByBox.set(boxId, cancel);

  return {
    schedule: (index, fn) => {
      const id = setTimeout(() => {
        if (cancelled) return;
        fn();
      }, index * DRAWER_SEQUENTIAL_STEP_DELAY_MS);
      timeoutIds.push(id);
    },
    cancelIfEmpty: (stepCount) => {
      if (stepCount === 0) cancel();
    },
  };
}

/**
 * Toggle individual: abre ou fecha a gaveta clicada (sem afectar as outras).
 */
export function toggleDrawer(
  box: WorkspaceBox,
  drawerId: string,
  callbacks: DrawerControllerCallbacks
): void {
  sequentialCancelByBox.get(box.id)?.();
  sequentialCancelByBox.delete(box.id);

  const drawers = box.drawersLayer ?? [];
  const drawer = drawers.find((item) => item.id === drawerId);
  if (!drawer) return;

  if (drawer.isOpen) {
    callbacks.setDrawerOpen(drawerId, false);
    return;
  }

  callbacks.setDrawerOpen(drawerId, true);
}

/**
 * Abre gavetas em sequência (baixo → cima) com delay entre passos.
 */
export function openAllSequential(
  box: WorkspaceBox,
  callbacks: DrawerControllerCallbacks
): void {
  const drawers = sortDrawersBottomToTop(box.drawersLayer ?? []);
  if (drawers.length === 0) return;

  const { schedule, cancelIfEmpty } = beginSequentialRun(box.id);
  let step = 0;

  drawers.forEach((drawer) => {
    if (drawer.isOpen) return;
    const currentStep = step;
    step += 1;
    schedule(currentStep, () => {
      const liveBox = callbacks.getBox();
      const liveDrawer = (liveBox?.drawersLayer ?? []).find((item) => item.id === drawer.id);
      if (!liveDrawer || liveDrawer.isOpen) return;
      callbacks.setDrawerOpen(drawer.id, true, { allowMultipleOpen: true });
    });
  });

  cancelIfEmpty(step);
}

/**
 * Fecha gavetas em sequência (cima → baixo) com delay entre passos.
 */
export function closeAllSequential(
  box: WorkspaceBox,
  callbacks: DrawerControllerCallbacks
): void {
  const drawers = sortDrawersBottomToTop(box.drawersLayer ?? []);
  if (drawers.length === 0) return;

  const { schedule, cancelIfEmpty } = beginSequentialRun(box.id);
  let step = 0;

  for (const drawer of [...drawers].reverse()) {
    if (!drawer.isOpen) continue;
    const currentStep = step;
    step += 1;
    schedule(currentStep, () => callbacks.setDrawerOpen(drawer.id, false));
  }

  cancelIfEmpty(step);
}

/**
 * Toggle global sequencial (duplo clique no módulo):
 * - Nenhuma aberta → abre 1 → 2 → 3
 * - Alguma aberta → fecha 3 → 2 → 1
 */
export function toggleAllDrawersSequential(
  box: WorkspaceBox,
  callbacks: DrawerControllerCallbacks
): void {
  const drawers = box.drawersLayer ?? [];
  if (drawers.length === 0) return;

  const anyOpen = drawers.some((drawer) => drawer.isOpen);
  if (anyOpen) {
    closeAllSequential(box, callbacks);
    return;
  }
  openAllSequential(box, callbacks);
}

export { openDrawer, closeDrawer, resolveDrawerMaxPullMm };
