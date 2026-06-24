import { describe, expect, it, vi } from "vitest";
import { createSnappingFacade } from "./snappingFacade";

describe("snappingFacade", () => {
  it("delegates public snapping API to the engine", () => {
    const engine = {
      enable: vi.fn(),
      disable: vi.fn(),
      isEnabled: vi.fn(() => true),
      setGridSize: vi.fn(),
      setCaptureRadius: vi.fn(),
      setMagnetStrength: vi.fn(),
      setMode: vi.fn(),
      getMode: vi.fn(() => "advanced"),
      setRoomSnappingEnabled: vi.fn(),
      isRoomSnappingEnabled: vi.fn(() => true),
      setAutoAlignmentEnabled: vi.fn(),
      isAutoAlignmentEnabled: vi.fn(() => false),
      setAutoSpacingEnabled: vi.fn(),
      isAutoSpacingEnabled: vi.fn(() => true),
      setWallOffset: vi.fn(),
      getWallOffset: vi.fn(() => 18),
      getActiveAlignmentType: vi.fn(() => "flush"),
    };

    const facade = createSnappingFacade(engine as never);

    facade.enable();
    facade.disable();
    facade.setGridSize(32);
    facade.setCaptureRadius(12);
    facade.setMagnetStrength(0.8);
    facade.setMode("advanced");
    facade.setRoomSnappingEnabled(true);
    facade.setAutoAlignmentEnabled(false);
    facade.setAutoSpacingEnabled(true);
    facade.setWallOffset(18);

    expect(facade.isEnabled()).toBe(true);
    expect(facade.getMode()).toBe("advanced");
    expect(facade.isRoomSnappingEnabled()).toBe(true);
    expect(facade.isAutoAlignmentEnabled()).toBe(false);
    expect(facade.isAutoSpacingEnabled()).toBe(true);
    expect(facade.getWallOffset()).toBe(18);
    expect(facade.getActiveAlignmentType()).toBe("flush");
    expect(engine.setGridSize).toHaveBeenCalledWith(32);
    expect(engine.setCaptureRadius).toHaveBeenCalledWith(12);
    expect(engine.setMagnetStrength).toHaveBeenCalledWith(0.8);
    expect(engine.setMode).toHaveBeenCalledWith("advanced");
  });
});
