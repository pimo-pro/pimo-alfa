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
import { canOpenDrawer } from "./DrawerCollisionService";

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

/**
 * Toggle individual: abre ou fecha a gaveta clicada (respeita colisões).
 */
export function toggleDrawer(
  box: WorkspaceBox,
  drawerId: string,
  callbacks: DrawerControllerCallbacks
): void {
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
 * Toggle global sequencial (duplo clique no módulo):
 * - Nenhuma aberta → abre 1 → 2 → 3 (delay 120–180 ms)
 * - Alguma aberta → fecha 3 → 2 → 1
 */
export function toggleAllDrawersSequential(
  box: WorkspaceBox,
  callbacks: DrawerControllerCallbacks,
  stepDelayMs: number = DRAWER_SEQUENTIAL_STEP_DELAY_MS
): void {
  const drawers = sortDrawersBottomToTop(box.drawersLayer ?? []);
  if (drawers.length === 0) return;

  sequentialCancelByBox.get(box.id)?.();
  sequentialCancelByBox.delete(box.id);

  const anyOpen = drawers.some((drawer) => drawer.isOpen);
  const timeoutIds: ReturnType<typeof setTimeout>[] = [];
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
    for (const id of timeoutIds) clearTimeout(id);
    sequentialCancelByBox.delete(box.id);
  };

  sequentialCancelByBox.set(box.id, cancel);

  const schedule = (index: number, fn: () => void) => {
    const id = setTimeout(() => {
      if (cancelled) return;
      fn();
    }, index * stepDelayMs);
    timeoutIds.push(id);
  };

  if (anyOpen) {
    const reversed = [...drawers].reverse();
    let step = 0;
    for (const drawer of reversed) {
      if (!drawer.isOpen) continue;
      const currentStep = step;
      schedule(currentStep, () => callbacks.setDrawerOpen(drawer.id, false));
      step += 1;
    }
    if (step === 0) cancel();
    return;
  }

  drawers.forEach((drawer, index) => {
    schedule(index, () => {
      const liveBox = callbacks.getBox();
      const liveDrawer = (liveBox?.drawersLayer ?? []).find((item) => item.id === drawer.id);
      if (!liveDrawer || liveDrawer.isOpen) return;
      const drawerIndex = (liveBox?.drawersLayer ?? []).findIndex((item) => item.id === drawer.id);
      const collision = canOpenDrawer(liveDrawer, liveBox ?? box, {
        drawerIndex,
        allowMultipleOpen: true,
      });
      if (!collision.canOpen) return;
      callbacks.setDrawerOpen(drawer.id, true, { allowMultipleOpen: true });
    });
  });
}

export { openDrawer, closeDrawer, resolveDrawerMaxPullMm };
