import type {
  SmartAlignSnapOverlay,
  SmartAlignSnapOverlayState,
} from "./smartAlignSnapOverlay";

export type SmartAlignOverlayFacade = {
  setState: (_state: Partial<SmartAlignSnapOverlayState>) => void;
  clear: () => void;
  resize: () => void;
  dispose: () => void;
};

export function createSmartAlignOverlayFacade(
  overlay: SmartAlignSnapOverlay
): SmartAlignOverlayFacade {
  return {
    setState: (state) => overlay.setState(state),
    clear: () => overlay.clear(),
    resize: () => overlay.resize(),
    dispose: () => overlay.dispose(),
  };
}
