import { describe, expect, it } from "vitest";
import { getPimoViewerStubApi } from "./pimoViewerStubApi";

describe("PimoViewer context contract", () => {
  it("stub API é sempre objeto válido com viewerReady false", () => {
    const a = getPimoViewerStubApi();
    const b = getPimoViewerStubApi();
    expect(a).toBe(b);
    expect(a.viewerReady).toBe(false);
    expect(typeof a.addBox).toBe("function");
    expect(typeof a.setIndustrialDesignWorkspaceEnabled).toBe("function");
    expect(a.addBox("x")).toBe(false);
  });
});
