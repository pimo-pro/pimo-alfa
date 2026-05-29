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
export type { DrawerDimensions, DrawerPieceSpec, DrawerCalculatedSpecs, DrawerParametricSettings } from "./DrawerParametrics";
export type { DrawerPiece, Drawer } from "./Drawer";
export type { DrawerGroup } from "./DrawerGroup";
export type { DrawerGenerationConfig } from "./DrawerGenerationService";
export type { DrawerMotionState } from "./DrawerMotionService";

// BOM types
export type {
  DrawerPieceForBom,
  DrawerHardwareForBom,
} from "./DrawerBomService";

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
  easeInOutCubic,
  closeAllDrawers,
  openAllDrawers,
  canOpenDrawer,
} from "./DrawerMotionService";

// Adapters
export {
  drawerGroupToLayerItems,
  drawerToLayerItem,
  layerItemToDrawer,
  updateDrawerGroupFromLayerItems,
} from "./adapters/drawerGroupToLayerItems";
