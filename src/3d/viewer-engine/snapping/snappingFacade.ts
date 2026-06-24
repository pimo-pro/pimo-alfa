import type { ActiveAlignmentType, SmartSnapMode } from "./SmartSnapping";
import type { SmartSnapping } from "./SmartSnapping";

export type SnappingFacade = {
  enable: () => void;
  disable: () => void;
  isEnabled: () => boolean;
  setGridSize: (_mm: number) => void;
  setCaptureRadius: (_mm: number) => void;
  setMagnetStrength: (_value: number) => void;
  setMode: (_mode: SmartSnapMode) => void;
  getMode: () => SmartSnapMode;
  setRoomSnappingEnabled: (_enabled: boolean) => void;
  isRoomSnappingEnabled: () => boolean;
  setAutoAlignmentEnabled: (_enabled: boolean) => void;
  isAutoAlignmentEnabled: () => boolean;
  setAutoSpacingEnabled: (_enabled: boolean) => void;
  isAutoSpacingEnabled: () => boolean;
  setWallOffset: (_mm: number) => void;
  getWallOffset: () => number;
  getActiveAlignmentType: () => ActiveAlignmentType;
};

export function createSnappingFacade(engine: SmartSnapping): SnappingFacade {
  return {
    enable: () => engine.enable(),
    disable: () => engine.disable(),
    isEnabled: () => engine.isEnabled(),
    setGridSize: (mm) => engine.setGridSize(mm),
    setCaptureRadius: (mm) => engine.setCaptureRadius(mm),
    setMagnetStrength: (value) => engine.setMagnetStrength(value),
    setMode: (mode) => engine.setMode(mode),
    getMode: () => engine.getMode(),
    setRoomSnappingEnabled: (enabled) => engine.setRoomSnappingEnabled(enabled),
    isRoomSnappingEnabled: () => engine.isRoomSnappingEnabled(),
    setAutoAlignmentEnabled: (enabled) => engine.setAutoAlignmentEnabled(enabled),
    isAutoAlignmentEnabled: () => engine.isAutoAlignmentEnabled(),
    setAutoSpacingEnabled: (enabled) => engine.setAutoSpacingEnabled(enabled),
    isAutoSpacingEnabled: () => engine.isAutoSpacingEnabled(),
    setWallOffset: (mm) => engine.setWallOffset(mm),
    getWallOffset: () => engine.getWallOffset(),
    getActiveAlignmentType: () => engine.getActiveAlignmentType(),
  };
}
