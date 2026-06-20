/**
 * Colisões / avisos de abertura de gavetas.
 * O Viewer NUNCA bloqueia movimento — canOpenDrawer devolve sempre true (excepto gaveta inexistente).
 * Avisos industriais vivem em drawerUiValidation (warnings no painel).
 */

import type { WorkspaceBox } from "../types";
import type { DrawerLayerItem } from "../../models/BoxLayers";

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

/**
 * O Viewer e DrawerController não devem bloquear abertura por validações industriais.
 * Mantido para compatibilidade de API — devolve true sempre que a gaveta existe.
 */
export function canOpenDrawer(
  drawer: DrawerLayerItem | null | undefined,
  _box?: Pick<
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
  _sceneContext?: DrawerCollisionSceneContext
): DrawerCollisionResult {
  if (!drawer) {
    return { canOpen: false, reason: "Gaveta não encontrada." };
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
