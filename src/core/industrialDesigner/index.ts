export type {
  DesignDrillHole,
  DesignPanel,
  DesignPanelCutout,
  DesignPanelCutoutKind,
  DesignPanelTipo,
  IndustrialDesignBox,
  IndustrialDesignWorkspaceState,
  PanelConstraint,
  PanelConstraintTipo,
} from "./types";

export {
  addDesignDrillHole,
  addDesignPanel,
  applyAutoAdjustPanelToInnerSpace,
  createIndustrialDesignBox,
  findDesignPanel,
  getInnerDimensions,
  insertDesignHoleWithCavilhaPairing,
  nextDesignId,
  removeDesignDrillHole,
  setActiveHoleOnPanel,
  updateDesignPanelDimensions,
  updateDesignPanelPosition,
} from "./designModel";
export type { CreateDesignBoxInput, InsertDesignHoleResult } from "./designModel";

export {
  assertDesignOperationAllowed,
  autoAdjustPanelToInnerSpace,
  aabbHasVolumeOverlap,
  collectIssuePanelIds,
  computeInnerCavityAabb,
  computePanelAabb,
  DesignValidationError,
  getBlockingIssues,
  isInternalDesignPanel,
  validateHoleInsertion,
  validateHolePlacement,
  validateIndustrialDesignBox,
  validateInternalPanelDimensions,
  validatePanelState,
} from "./geometryValidation";
export type {
  DesignValidationCode,
  DesignValidationIssue,
  DesignValidationSeverity,
  PanelAabb,
  Vec3Mm,
} from "./geometryValidation";

export {
  isLeftLateral,
  isRightLateral,
  listCavilhaConstraintsForPanel,
  projectCavilhaHoleToTargetPanel,
  resolveCavilhaConstraintTarget,
} from "./cavilhaPairing";

export {
  buildViewerDrillMarkersFromDesign,
  designDrillHoleToTechnical,
  mergeViewerDrillMarkers,
} from "./designToViewer";

export {
  buildCutListComPrecoFromDesignBox,
  buildCutListFromDesignBox,
  buildDrillFilesFromDesignBox,
  designDrillHoleToPanelDrillHole,
  designDrillHolesToPanelDrillHoles,
  designPanelToCutListItem,
  resolveDesignPanelCutListTipo,
  resolveDesignPanelPieceType,
} from "./designToCutlist";
export type { DesignDrillExportProjectContext } from "./designToCutlist";

export {
  __resetCustomIndustrialModelsForTests,
  __setCustomIndustrialModelIdFactory,
  createCustomIndustrialModelFromDesignBox,
  customIndustrialModelToBaseCabinet,
  ensureBuiltinIndustrialModelsRegistered,
  getCustomIndustrialModel,
  getIndustrialCatalogModel,
  instantiateCustomIndustrialModelForWorkspaceBox,
  isBuiltinIndustrialModelId,
  isCustomIndustrialModelId,
  isIndustrialCatalogModelId,
  listCustomIndustrialModels,
  listCustomIndustrialModelsAsBaseCabinet,
  listIndustrialCatalogModelsAsBaseCabinet,
  registerCustomIndustrialModel,
  remapDesignBoxForWorkspaceBox,
  resolveCustomIndustrialCutlistForBox,
} from "./customIndustrialModel";
export type {
  CreateCustomIndustrialModelInput,
  CreateCustomIndustrialModelResult,
  CustomIndustrialModelMetadata,
  CustomIndustrialModelRecord,
} from "./customIndustrialModel";

export {
  __resetBuiltinIndustrialModelsForTests,
  BUILTIN_INDUSTRIAL_MODEL_IDS,
  listBuiltinIndustrialModels,
  listBuiltinIndustrialModelsAsBaseCabinet,
  registerBuiltinIndustrialModel,
} from "./staticIndustrialRegistry";

export { __resetBuiltinIndustrialBootstrapForTests } from "./builtinIndustrialBootstrap";

export {
  INDUSTRIAL_BASE_600_MODULE_ID,
  INDUSTRIAL_BASE_600_MODULE_NOME,
} from "./modules/industrialBaseConstants";

export {
  INDUSTRIAL_UPPER_600_MODULE_ID,
  INDUSTRIAL_UPPER_600_MODULE_NOME,
  INDUSTRIAL_UPPER_SHELF_TECHNICAL_MARGINS,
} from "./modules/industrialUpperConstants";

export {
  buildIndustrialBase600x720x500DesignBox,
  buildIndustrialBase600ModelRecord,
  registerIndustrialBase600x720x500Module,
} from "./modules/industrialBase600x720x500v1";
export type {
  BuildIndustrialBase600Options,
  IndustrialBaseCutoutOptions,
} from "./modules/industrialBase600x720x500v1";

export {
  buildIndustrialUpper600x350x300DesignBox,
  buildIndustrialUpper600ModelRecord,
  registerIndustrialUpper600x350x300Module,
} from "./modules/industrialUpper600x350x300v1";
export type {
  BuildIndustrialUpper600Options,
  IndustrialUpperCutoutOptions,
} from "./modules/industrialUpper600x350x300v1";

export {
  applyAllIndustrialBaseDrillingRules,
  applyBackStructuralFixation,
  applyDoorAndLateralTechnicalHoles,
  applyLateralStructuralDowels,
  applyShelfDowelHoles,
} from "./modules/industrialBaseDrilling";
export type {
  BuildIndustrialCornerRight900Options,
  IndustrialCornerCutoutOptions,
} from "./modules/industrialCornerRight900x720x600v1";

export {
  buildIndustrialCornerRight900x720x600DesignBox,
  buildIndustrialCornerRight900ModelRecord,
  registerIndustrialCornerRight900x720x600Module,
} from "./modules/industrialCornerRight900x720x600v1";

export {
  INDUSTRIAL_CORNER_RIGHT_900_MODULE_ID,
  INDUSTRIAL_CORNER_RIGHT_900_MODULE_NOME,
  INDUSTRIAL_CORNER_SHELF_TECHNICAL_MARGINS,
} from "./modules/industrialCornerRightConstants";

export type { BuildIndustrialCornerLeft900Options } from "./modules/industrialCornerLeft900x720x600v1";

export {
  buildIndustrialCornerLeft900x720x600DesignBox,
  buildIndustrialCornerLeft900ModelRecord,
  registerIndustrialCornerLeft900x720x600Module,
} from "./modules/industrialCornerLeft900x720x600v1";

export {
  INDUSTRIAL_CORNER_LEFT_900_MODULE_ID,
  INDUSTRIAL_CORNER_LEFT_900_MODULE_NOME,
  INDUSTRIAL_CORNER_LEFT_SHELF_TECHNICAL_MARGINS,
} from "./modules/industrialCornerLeftConstants";

export {
  applyAllIndustrialCornerDrillingRules,
  applyCornerFixedFrontDowelHoles,
  applyCornerLBackFixation,
} from "./modules/industrialCornerDrilling";

export type { IndustrialCabinetDrillingOptions, ShelfTechnicalMarginOverride } from "./modules/industrialBaseDrilling";

export {
  buildCornerLeftIndustrialPanels,
  buildCornerRightIndustrialPanels,
  computeCornerIndustrialLayout,
} from "./modules/industrialCornerGeometry";

export type { BuildIndustrialDrawerSingle600Options } from "./modules/industrialDrawerSingle600x720x500v1";

export {
  buildIndustrialDrawerSingle600x720x500DesignBox,
  buildIndustrialDrawerSingle600ModelRecord,
  registerIndustrialDrawerSingle600x720x500Module,
} from "./modules/industrialDrawerSingle600x720x500v1";

export {
  INDUSTRIAL_DRAWER_SINGLE_600_MODULE_ID,
  INDUSTRIAL_DRAWER_SINGLE_600_MODULE_NOME,
} from "./modules/industrialDrawerSingleConstants";

export {
  applyAllIndustrialDrawerSingleDrillingRules,
  applyCabinetSlideHoles,
  applyDrawerBoxDrilling,
} from "./modules/industrialDrawerDrilling";

export {
  buildIndustrialDrawerSingleDesignBox,
  computeIndustrialDrawerSingleLayout,
} from "./modules/industrialDrawerGeometry";

export {
  meshLocalPointToHoleMm,
  resolveHoleFaceFromHit,
} from "./panelHitCoords";
export type { PanelHitCoords, PanelMeshMeta } from "./panelHitCoords";

export {
  DRILL_HOLE_VIEWER_COLORS,
  INDUSTRIAL_DESIGN_PAIRING_LINE_COLOR,
  INDUSTRIAL_DESIGN_PANEL_ERROR_COLOR,
  INDUSTRIAL_DESIGN_PANEL_SELECTION_COLOR,
  resolveDrillHoleViewerColorHex,
  resolvePanelOutlineColorHex,
  resolvePanelOutlineHighlight,
} from "./drillHoleViewerColors";

export {
  collectPairedHoleLineSegments,
  pairedSegmentsToFloat32Array,
} from "./industrialDesignPairingLines";
export type { DesignPanelMeshRef, PairedHoleLineSegment } from "./industrialDesignPairingLines";

export { holeMmToLocalMeters, localMetersToHoleMm } from "./panelHoleCoords";
export type { HoleLocalMeters } from "./panelHoleCoords";

export {
  HOLE_CATALOG,
  getHoleTypeById,
  getPairedHoleTypeId,
  holeTypeToDrillType,
  listHoleTypesByUsage,
  tryGetHoleTypeById,
} from "../drill/holeCatalog";
export type { HoleFaceKind, HoleType, HoleTypeId, HoleUsageKind } from "../drill/holeCatalog";
