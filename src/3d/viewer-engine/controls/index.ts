/**
 * Módulo de controles do Viewer Engine (OrbitControls).
 * TransformControls permanecem no ViewerCore por acoplamento à cena e seleção.
 */
export { Controls } from "./Controls";
export type { ControlsOptions } from "./Controls";
export {
  getMouseInputMapping,
  normalizeMouseInputPreset,
  applyMouseInputMappingToOrbitControls,
  getPointerActionForButton,
  shouldBlockPointerDownForSelection,
} from "./MouseInputMapper";
export type {
  MouseButtonAction,
  MouseInputMapping,
  MouseInputPreset,
} from "./MouseInputMapper";
