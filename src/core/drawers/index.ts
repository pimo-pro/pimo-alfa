/**
 * Drawers Domain
 * 
 * Sistema completo de gerenciamento de gavetas:
 * - Cálculos paramétricos (DrawerParametrics)
 * - Modelo de gavetas (Drawer)
 * - Agrupamento (DrawerGroup)
 * - Geração automática (DrawerGenerationService)
 * - Movimento e animação (DrawerMotionService)
 * - Adaptadores para layers (adapters/)
 */

// Core types
export type { DrawerDimensions, DrawerPieceSpec, DrawerCalculatedSpecs, DrawerParametricSettings, DrawerParametricOverrides } from "./DrawerParametrics";
export type { DrawerPiece, Drawer } from "./Drawer";
export type { DrawerGroup } from "./DrawerGroup";
export type { DrawerGenerationConfig } from "./DrawerGenerationService";
export type { DrawerMotionState } from "./DrawerMotionService";

// BOM types
export type {
  DrawerPieceForBom,
  DrawerHardwareForBom,
} from "./DrawerBomService";

export {
  buildDrawerParametricOverridesList,
  drawerParametricOverridesFromLayerItem,
} from "./drawerParametricOverrides";

// Parametrics
export {
  calculateDrawerSpecs,
  validateDrawerSpecs,
  getDrawerBoundingBox,
} from "./DrawerParametrics";

// Drawer
export {
  createDrawer,
  updateDrawerMotion,
  getFrontAbsolutePosition,
  getBodyAbsolutePosition,
} from "./Drawer";

// DrawerGroup
export {
  calculateDrawerHeights,
  calculateDrawerPositions,
  recalculateDrawerGroupLayout,
  addDrawerToGroup,
  removeDrawerFromGroup,
  updateHeightMode,
} from "./DrawerGroup";
export {
  DRAWER_VERTICAL_BASE_OFFSET_MM,
  getDrawerUsableInternalHeightMm,
  resolveDrawerVerticalPosition,
  resolveDrawerVerticalPositions,
} from "./drawerVerticalPosition";

// Generation Service
export {
  generateDrawerGroup,
  regenerateDrawerGroup,
  canBoxHaveDrawers,
} from "./DrawerGenerationService";

  // BOM Service
  export {
    extractDrawerPiecesForBom,
    extractDrawerHardwareForBom,
    extractDrawerGroupPiecesForBom,
    extractDrawerGroupHardwareForBom,
    summarizeDrawerPieces,
    summarizeDrawerHardware,
  } from "./DrawerBomService";

// Motion Service
export {
  setDrawerOpen,
  setDrawerOpenInGroup,
  updateDrawerProgress,
  calculateDrawerOffset,
  createDrawerAnimation,
  animateDrawer,
  easeInOutCubic,
  closeAllDrawers,
  openAllDrawers,
  canOpenDrawer,
  openDrawer,
  closeDrawer,
  resolveDrawerMaxPullMm,
  DRAWER_SEQUENTIAL_STEP_DELAY_MS,
  VIEWER_DRAWER_ANIMATION_DURATION_MS,
} from "./DrawerMotionService";
export {
  tandemCurve,
  moventoCurve,
  genericSlideCurve,
  resolveDrawerMotionCurve,
  resolveDrawerAnimationDurationMs,
} from "./DrawerMotionCurves";
export {
  canOpenDrawer as canOpenDrawerLayer,
  canToggleDrawer,
  type DrawerCollisionSceneContext,
} from "./DrawerCollisionService";

export {
  toggleDrawer,
  toggleAllDrawersSequential,
  type DrawerControllerCallbacks,
  type DrawerOpenOptions,
} from "./DrawerController";

// Adapters
export {
  drawerGroupToLayerItems,
  drawerToLayerItem,
  layerItemToDrawer,
  updateDrawerGroupFromLayerItems,
} from "./adapters/drawerGroupToLayerItems";
