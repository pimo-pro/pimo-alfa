/**
 * DrawerMotionService
 *
 * Gerencia o movimento e animação das gavetas.
 * A frente e o corpo se movem juntos como uma unidade rígida.
 */

import { updateDrawerMotion, type Drawer } from "./Drawer";
import type { DrawerGroup } from "./DrawerGroup";
import type { DrawerLayerItem } from "../../models/BoxLayers";
import type { WorkspaceBox } from "../types";
import { canOpenDrawer as canOpenDrawerLayer, type DrawerCollisionSceneContext } from "./DrawerCollisionService";
import {
  resolveDrawerMotionCurve,
  resolveDrawerAnimationDurationMs,
  easeInOutCubic,
} from "./DrawerMotionCurves";

/** Delay entre passos da abertura/fecho sequencial no Viewer (ms). */
export const DRAWER_SEQUENTIAL_STEP_DELAY_MS = 150;

/** Duração da animação no Viewer — alinhada com portas (DoorFactory). */
export const VIEWER_DRAWER_ANIMATION_DURATION_MS = 2000;

export interface DrawerMotionState {
  drawerId: string;
  isOpen: boolean;
  progress: number;
  targetProgress: number;
  isAnimating: boolean;
}

export function setDrawerOpen(drawer: Drawer, isOpen: boolean): Drawer {
  const progress = isOpen ? 1 : 0;
  return updateDrawerMotion(drawer, isOpen, progress);
}

export function setDrawerOpenInGroup(
  group: DrawerGroup,
  drawerId: string,
  isOpen: boolean
): DrawerGroup {
  const updatedDrawers = group.drawers.map((drawer) =>
    drawer.id === drawerId ? setDrawerOpen(drawer, isOpen) : drawer
  );

  return {
    ...group,
    drawers: updatedDrawers,
  };
}

export function updateDrawerProgress(drawer: Drawer, progress: number): Drawer {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const isOpen = clampedProgress > 0.5;
  return updateDrawerMotion(drawer, isOpen, clampedProgress);
}

export function calculateDrawerOffset(drawer: Drawer, progress: number): number {
  return drawer.specs.positioning.pullDistance * progress;
}

export function createDrawerAnimation(
  drawer: Drawer,
  targetIsOpen: boolean,
  durationMs?: number,
  easingFn?: (_t: number) => number
): {
  startProgress: number;
  targetProgress: number;
  duration: number;
  easing: (_t: number) => number;
} {
  const slideType = drawer.slideType;
  const softClose = drawer.softClose;
  return {
    startProgress: drawer.motion.openProgress,
    targetProgress: targetIsOpen ? 1 : 0,
    duration: durationMs ?? resolveDrawerAnimationDurationMs(slideType, softClose),
    easing: easingFn ?? resolveDrawerMotionCurve(slideType, softClose),
  };
}

export function animateDrawer(params: {
  drawer: Drawer;
  targetIsOpen: boolean;
  onProgress: (progress: number, offsetMm: number) => void;
  onComplete?: () => void;
}): () => void {
  const animation = createDrawerAnimation(params.drawer, params.targetIsOpen);
  const pullDistance = params.drawer.specs.positioning.pullDistance;
  const start = performance.now();
  let raf = 0;

  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / animation.duration);
    const eased = animation.easing(t);
    const progress =
      animation.startProgress + (animation.targetProgress - animation.startProgress) * eased;
    params.onProgress(progress, pullDistance * progress);
    if (t < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      params.onComplete?.();
    }
  };

  raf = requestAnimationFrame(tick);
  return () => {
    if (raf) cancelAnimationFrame(raf);
  };
}

export { easeInOutCubic };

/** Curso máximo da corrediça (mm) a partir das dimensões do layer. */
export function resolveDrawerMaxPullMm(
  layer: Pick<DrawerLayerItem, "pullDistanceMm" | "bodyDepth" | "depth" | "frontThickness">
): number {
  const fromBody = Number(layer.bodyDepth);
  if (Number.isFinite(fromBody) && fromBody > 0) return fromBody;
  const depth = Number(layer.depth) || 0;
  const front = Number(layer.frontThickness) || 0;
  const fromDepth = Math.max(0, depth - front);
  if (fromDepth > 0) return fromDepth;
  const stored = Number(layer.pullDistanceMm);
  if (Number.isFinite(stored) && stored > 0) return stored;
  return 0;
}

/** Estado aberto: isOpen + pullDistanceMm = curso máximo. */
export function openDrawer(layer: DrawerLayerItem): DrawerLayerItem {
  const maxPull = resolveDrawerMaxPullMm(layer);
  return {
    ...layer,
    isOpen: true,
    pullDistanceMm: maxPull,
  };
}

/** Estado fechado: isOpen + pullDistanceMm = 0. */
export function closeDrawer(layer: DrawerLayerItem): DrawerLayerItem {
  return {
    ...layer,
    isOpen: false,
    pullDistanceMm: 0,
  };
}

export function closeAllDrawers(group: DrawerGroup): DrawerGroup {
  const updatedDrawers = group.drawers.map((drawer) => setDrawerOpen(drawer, false));
  return {
    ...group,
    drawers: updatedDrawers,
  };
}

export function openAllDrawers(group: DrawerGroup): DrawerGroup {
  const updatedDrawers = group.drawers.map((drawer) => setDrawerOpen(drawer, true));
  return {
    ...group,
    drawers: updatedDrawers,
  };
}

export function canOpenDrawer(
  group: DrawerGroup,
  drawerId: string,
  box?: WorkspaceBox,
  layerItems?: DrawerLayerItem[]
): { canOpen: boolean; reason?: string } {
  const drawer = group.drawers.find((d) => d.id === drawerId);
  if (!drawer) {
    return { canOpen: false, reason: "Gaveta não encontrada" };
  }

  if (drawer.motion.isOpen) {
    return { canOpen: true };
  }

  if (box && layerItems) {
    const layer = layerItems.find((item) => item.id === drawerId);
    if (layer) {
      const drawerIndex = layerItems.findIndex((item) => item.id === drawerId);
      const ctx: DrawerCollisionSceneContext = { drawerIndex };
      return canOpenDrawerLayer(layer, box, ctx);
    }
  }

  return { canOpen: true };
}
