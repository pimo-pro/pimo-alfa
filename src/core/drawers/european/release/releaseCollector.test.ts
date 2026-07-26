import { describe, expect, it, vi } from "vitest";
import * as flags from "../../drawerSystemFlags";
import { generateEuropeanDrawer } from "../index";
import {
  collectEuropeanReleaseEvents,
  EUROPEAN_RELEASE_PHASE_CATALOG,
} from "./releaseCollector";

describe("release/releaseCollector", () => {
  it("recolhe catalogo + eventos runtime docs/dxf/overlay/safety", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    const result = generateEuropeanDrawer(
      "hettich-innotech-atira",
      {
        id: "cx",
        dimensoes: { largura: 538, altura: 720, profundidade: 560 },
        espessura: 19,
        material: "mdf_branco",
        profundidadeInternaUtilMm: 500,
      },
      {
        systemId: "hettich-innotech-atira",
        heightMm: 144,
        depthMm: 450,
        softClose: true,
        pushOpen: false,
        count: 1,
      }
    );
    const events = collectEuropeanReleaseEvents(result);
    expect(events.length).toBeGreaterThan(EUROPEAN_RELEASE_PHASE_CATALOG.length);
    expect(events.some((e) => e.component === "docs")).toBe(true);
    expect(events.some((e) => e.component === "dxf")).toBe(true);
    expect(events.some((e) => e.component === "overlay")).toBe(true);
    expect(events.some((e) => e.component === "safety")).toBe(true);
    expect(events.some((e) => e.kind === "feature")).toBe(true);
    vi.restoreAllMocks();
  });
});
