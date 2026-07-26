import { describe, expect, it, vi } from "vitest";
import * as flags from "../../drawerSystemFlags";
import { generateEuropeanDrawer } from "../index";
import {
  buildFrontView,
  buildSideView,
  buildTopView,
  buildExplodedView,
} from "./technicalViews";
import { buildTechnicalDrawingMode } from "./technicalDrawingMode";

describe("dxf/technicalViews", () => {
  it("vistas tecnicas correspondem as medidas reais da geometry", () => {
    vi.spyOn(flags, "isDrawerModeloAActive").mockReturnValue(false);
    const result = generateEuropeanDrawer(
      "hettich-innotech-atira",
      {
        id: "cx",
        nome: "CX",
        dimensoes: { largura: 538, altura: 720, profundidade: 560 },
        espessura: 19,
        gavetas: 1,
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
    const front = buildFrontView(result);
    expect(front.widthMm).toBe(result.geometry.front.widthMm);
    expect(front.heightMm).toBe(result.geometry.front.heightMm);
    expect(front.industrialCodes).toContain("gav_fren");

    const right = buildSideView(result, "right");
    expect(right.widthMm).toBe(result.geometry.rightSide.depthMm);
    expect(right.heightMm).toBe(result.geometry.rightSide.heightMm);

    const left = buildSideView(result, "left");
    expect(left.widthMm).toBe(result.geometry.leftSide.depthMm);

    const top = buildTopView(result);
    expect(top.widthMm).toBe(result.geometry.externalWidthMm);
    expect(top.heightMm).toBe(result.geometry.bodyDepthMm);

    const exploded = buildExplodedView(result);
    expect(exploded.entities.length).toBeGreaterThan(0);

    const mode = buildTechnicalDrawingMode(result);
    expect(mode.viewIds).toEqual(["front", "side_right", "side_left", "top", "exploded"]);
    expect(result.technical?.viewIds).toEqual(mode.viewIds);
    vi.restoreAllMocks();
  });
});
