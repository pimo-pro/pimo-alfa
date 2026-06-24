import { describe, expect, it, vi } from "vitest";
import { registerAdminSnappingRules } from "./adminSnappingRules";

describe("adminSnappingRules", () => {
  it("aplica regras iniciais e limpa subscriptions no dispose", () => {
    const listeners: Array<() => void> = [];
    const unsubSnap = vi.fn();
    const unsubRoom = vi.fn();
    const store = {
      snapRules: {
        subscribe: vi.fn((listener: () => void) => {
          listeners.push(listener);
          return unsubSnap;
        }),
      },
      roomRules: {
        subscribe: vi.fn((listener: () => void) => {
          listeners.push(listener);
          return unsubRoom;
        }),
      },
    };
    const engine = {
      setCaptureRadius: vi.fn(),
      setMagnetStrength: vi.fn(),
      setGridSize: vi.fn(),
      setWallOffset: vi.fn(),
    };

    const unregister = registerAdminSnappingRules(engine as never, store);

    expect(engine.setCaptureRadius).toHaveBeenCalledTimes(1);
    expect(engine.setMagnetStrength).toHaveBeenCalledTimes(1);
    expect(engine.setGridSize).toHaveBeenCalledTimes(1);
    expect(engine.setWallOffset).toHaveBeenCalledTimes(1);

    listeners.forEach((listener) => listener());
    expect(engine.setCaptureRadius).toHaveBeenCalledTimes(3);

    unregister();
    expect(unsubSnap).toHaveBeenCalledTimes(1);
    expect(unsubRoom).toHaveBeenCalledTimes(1);
  });
});
