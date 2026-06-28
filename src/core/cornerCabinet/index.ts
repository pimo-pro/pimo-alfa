export {
  isCornerFixedFrontModel,
  isCornerDireitaInferiorModel,
  CORNER_FF_COZINHA_INFERIOR_ID,
  getCornerCabinetConfig,
  inferCornerSideFromBox,
  computeCornerLayoutMm,
  computeCornerLayoutForBox,
  resolveCornerDoorGapSettings,
  type CornerStyle,
  type CornerSide,
  type CornerLayoutMode,
  type CornerCabinetConfig,
  type CornerLayoutMm,
  type CornerDoorGapSettings,
} from "./cornerCabinetRules";
export { gerarPaineisCorner, getCornerFixedFrontHingeSide } from "./cornerCabinetManufacturing";
export { computeCornerVisualLayout, cornerLayoutMmToVisual } from "./cornerCabinetVisual";
export {
  buildCornerFixedFrontDowelHoles,
  stripCornerFixedFrontHingeHoles,
  dedupePanelDrillHoles,
  resolveFrenteFixaLateralHoleYFromTop,
  countCornerFixedFrontFaceDowelConnections,
  CORNER_FF_EDGE_DOWEL_DEPTH_MM,
  CORNER_FF_FACE_DOWEL_DEPTH_MM,
  type CornerFixedFrontDowelLayout,
  type CornerFixedFrontDowelHolesByPanel,
} from "./cornerFixedFrontDowels";
