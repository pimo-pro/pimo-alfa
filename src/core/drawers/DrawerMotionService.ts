/**
 * DrawerMotionService
 * 
 * Gerencia o movimento e animação das gavetas.
 * A frente e o corpo se movem juntos como uma unidade rígida.
 */

import { updateDrawerMotion, type Drawer } from "./Drawer";
import type { DrawerGroup } from "./DrawerGroup";

export interface DrawerMotionState {
  drawerId: string;
  isOpen: boolean;
  progress: number;        // 0 = fechada, 1 = totalmente aberta
  targetProgress: number;  // Progress desejado
  isAnimating: boolean;
}

/**
 * Define o estado de abertura de uma gaveta (sem animação)
 */
export function setDrawerOpen(drawer: Drawer, isOpen: boolean): Drawer {
  const progress = isOpen ? 1 : 0;
  return updateDrawerMotion(drawer, isOpen, progress);
}

/**
 * Define o estado de abertura de uma gaveta no grupo
 */
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

/**
 * Atualiza o progresso de abertura de uma gaveta (usado para animação)
 */
export function updateDrawerProgress(
  drawer: Drawer,
  progress: number
): Drawer {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const isOpen = clampedProgress > 0.5;
  return updateDrawerMotion(drawer, isOpen, clampedProgress);
}

/**
 * Calcula o deslocamento em mm baseado no progresso
 */
export function calculateDrawerOffset(drawer: Drawer, progress: number): number {
  return drawer.specs.positioning.pullDistance * progress;
}

/**
 * Anima suavemente uma gaveta de um estado para outro
 * Esta função retorna os parâmetros para usar com requestAnimationFrame
 */
export function createDrawerAnimation(
  drawer: Drawer,
  targetIsOpen: boolean,
  durationMs: number = 1500,
  easingFn: (_t: number) => number = easeInOutCubic
): {
  startProgress: number;
  targetProgress: number;
  duration: number;
  easing: (_t: number) => number;
} {
  const startProgress = drawer.motion.openProgress;
  const targetProgress = targetIsOpen ? 1 : 0;

  return {
    startProgress,
    targetProgress,
    duration: durationMs,
    easing: easingFn,
  };
}

/**
 * Função de easing cúbica (mesma das portas)
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Fecha todas as gavetas do grupo
 */
export function closeAllDrawers(group: DrawerGroup): DrawerGroup {
  const updatedDrawers = group.drawers.map((drawer) => setDrawerOpen(drawer, false));
  return {
    ...group,
    drawers: updatedDrawers,
  };
}

/**
 * Abre todas as gavetas do grupo
 */
export function openAllDrawers(group: DrawerGroup): DrawerGroup {
  const updatedDrawers = group.drawers.map((drawer) => setDrawerOpen(drawer, true));
  return {
    ...group,
    drawers: updatedDrawers,
  };
}

/**
 * Valida se uma gaveta pode ser aberta sem colidir com outras
 */
export function canOpenDrawer(
  group: DrawerGroup,
  drawerId: string
): { canOpen: boolean; reason?: string } {
  const drawer = group.drawers.find((d) => d.id === drawerId);
  if (!drawer) {
    return { canOpen: false, reason: "Gaveta não encontrada" };
  }

  // Por enquanto, sempre pode abrir
  // Futuramente pode adicionar lógica de colisão
  return { canOpen: true };
}
