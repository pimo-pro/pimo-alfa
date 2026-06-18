/**
 * Colisões de abertura de gavetas (FASE 5).
 * Valida bloqueios físicos sem alterar geometria industrial.
 */

import type { WorkspaceBox } from "../types";
import type { DrawerLayerItem, DoorLayerItem } from "../../models/BoxLayers";

export type DrawerCollisionSceneContext = {
  /** Índice da gaveta no array drawersLayer. */
  drawerIndex: number;
  /** Gaveta já aberta bloqueia abertura de outra na mesma coluna. */
  singleOpenDrawer?: boolean;
  /** Abertura sequencial global — permite várias gavetas abertas em simultâneo. */
  allowMultipleOpen?: boolean;
};

export type DrawerCollisionResult = {
  canOpen: boolean;
  reason?: string;
};

function hasClosedDoors(doors: DoorLayerItem[]): boolean {
  return doors.some((door) => !door.isOpen);
}

function hasOtherOpenDrawer(drawers: DrawerLayerItem[], drawerId: string): DrawerLayerItem | undefined {
  return drawers.find((d) => d.id !== drawerId && d.isOpen);
}

function isBottomDrawer(drawerIndex: number): boolean {
  return drawerIndex === 0;
}

export function canOpenDrawer(
  drawer: DrawerLayerItem,
  box: Pick<
    WorkspaceBox,
    | "dimensoes"
    | "doorsLayer"
    | "drawersLayer"
    | "portaTipo"
    | "prateleiras"
    | "feetEnabled"
    | "feetHeight"
    | "pe_cm"
    | "gavetas"
  >,
  sceneContext?: DrawerCollisionSceneContext
): DrawerCollisionResult {
  if (!drawer) {
    return { canOpen: false, reason: "Gaveta não encontrada." };
  }

  if (drawer.isOpen) {
    return { canOpen: true };
  }

  const drawers = box.drawersLayer ?? [];
  const doors = box.doorsLayer ?? [];
  const drawerIndex =
    sceneContext?.drawerIndex ?? drawers.findIndex((d) => d.id === drawer.id);

  const otherOpen = hasOtherOpenDrawer(drawers, drawer.id);
  if (otherOpen && !sceneContext?.allowMultipleOpen) {
    return {
      canOpen: false,
      reason: "Feche a outra gaveta aberta antes de abrir esta.",
    };
  }

  if (box.portaTipo !== "sem_porta" && doors.length > 0 && hasClosedDoors(doors)) {
    return {
      canOpen: false,
      reason: "Porta fechada bloqueia a abertura da gaveta.",
    };
  }

  if ((box.prateleiras ?? 0) > 0 && drawers.length > 0) {
    return {
      canOpen: false,
      reason: "Prateleiras fixas no módulo impedem abertura de gavetas.",
    };
  }

  const feetHeightMm = box.feetHeight ?? (box.pe_cm ?? 10) * 10;
  if (
    box.feetEnabled !== false &&
    isBottomDrawer(drawerIndex) &&
    feetHeightMm > drawer.height * 0.35
  ) {
    return {
      canOpen: false,
      reason: "Rodapé/pés demasiado altos para a gaveta inferior.",
    };
  }

  const pullMm = drawer.pullDistanceMm ?? drawer.bodyDepth ?? drawer.depth ?? 0;
  const maxPull = Math.max(0, box.dimensoes.profundidade - 40);
  if (pullMm > maxPull && maxPull > 0) {
    return {
      canOpen: false,
      reason: "Curso da corrediça excede a profundidade interna do módulo.",
    };
  }

  const boxHalfH = box.dimensoes.altura / 2;
  const drawerTop = (drawer.posY ?? 0) + drawer.height / 2;
  const drawerBottom = (drawer.posY ?? 0) - drawer.height / 2;
  if (drawerTop > boxHalfH - 5 || drawerBottom < -boxHalfH + 5) {
    return {
      canOpen: false,
      reason: "Gaveta colide com as paredes internas do módulo.",
    };
  }

  return { canOpen: true };
}

export function canCloseDrawer(): DrawerCollisionResult {
  return { canOpen: true };
}

export function canToggleDrawer(
  drawer: DrawerLayerItem,
  box: WorkspaceBox,
  sceneContext?: DrawerCollisionSceneContext
): DrawerCollisionResult {
  if (drawer.isOpen) return canCloseDrawer();
  return canOpenDrawer(drawer, box, sceneContext);
}
