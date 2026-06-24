import { describe, expect, it, vi } from "vitest";
import { createSmartAlignOverlayFacade } from "./smartAlignOverlayFacade";

describe("smartAlignOverlayFacade", () => {
  it("delegates overlay lifecycle methods", () => {
    const overlay = {
      setState: vi.fn(),
      clear: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
    };

    const facade = createSmartAlignOverlayFacade(overlay as never);
    facade.setState({ visible: true, mode: "predictive", guides: [] });
    facade.clear();
    facade.resize();
    facade.dispose();

    expect(overlay.setState).toHaveBeenCalledWith({ visible: true, mode: "predictive", guides: [] });
    expect(overlay.clear).toHaveBeenCalledTimes(1);
    expect(overlay.resize).toHaveBeenCalledTimes(1);
    expect(overlay.dispose).toHaveBeenCalledTimes(1);
  });
});
