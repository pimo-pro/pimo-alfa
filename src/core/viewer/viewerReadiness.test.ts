import { describe, expect, it } from "vitest";
import { getPimoViewerStubApi } from "../../context/pimoViewerStubApi";
import { isViewerApiReady, isViewerCoreReady } from "./viewerReadiness";

describe("viewerReadiness", () => {
  it("isViewerCoreReady exige viewerReady === true no core", () => {
    expect(isViewerCoreReady(null)).toBe(false);
    expect(isViewerCoreReady(undefined)).toBe(false);
    expect(isViewerCoreReady({})).toBe(false);
    expect(isViewerCoreReady({ viewerReady: false })).toBe(false);
    expect(isViewerCoreReady({ viewerReady: true })).toBe(true);
  });

  it("isViewerApiReady aceita null/undefined e stub (viewerReady false)", () => {
    expect(isViewerApiReady(null)).toBe(false);
    expect(isViewerApiReady(undefined)).toBe(false);
    const stub = getPimoViewerStubApi();
    expect(stub.viewerReady).toBe(false);
    expect(isViewerApiReady(stub)).toBe(false);
  });

  it("isViewerApiReady true só com viewerReady explícito", () => {
    const stub = getPimoViewerStubApi();
    expect(isViewerApiReady({ ...stub, viewerReady: true })).toBe(true);
  });
});
