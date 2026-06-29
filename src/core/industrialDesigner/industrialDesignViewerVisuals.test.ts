import { describe, expect, it } from "vitest";
import {
  createIndustrialDesignBox,
  insertDesignHoleWithCavilhaPairing,
  isLeftLateral,
} from "./index";
import {
  collectPairedHoleLineSegments,
  pairedSegmentsToFloat32Array,
  type DesignPanelMeshRef,
} from "./industrialDesignPairingLines";
import { holeMmToLocalMeters, localMetersToHoleMm } from "./panelHoleCoords";

const IDENTITY_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

describe("panelHoleCoords", () => {
  it("roundtrip mm ↔ local metros (top)", () => {
    const local = holeMmToLocalMeters("top", 0.562, 0.481, 120, 80);
    const back = localMetersToHoleMm("top", 0.562, 0.481, local);
    expect(back.xMm).toBeCloseTo(120, 0);
    expect(back.yMm).toBeCloseTo(80, 0);
  });
});

describe("industrialDesignPairingLines", () => {
  it("gera uma linha por par cavilha (sem duplicar)", () => {
    const box = createIndustrialDesignBox({
      outerWidthMm: 600,
      outerHeightMm: 720,
      outerDepthMm: 500,
    });
    const lateralLe = box.panels.find((p) => isLeftLateral(p))!;
    const fundo = box.panels.find((p) => p.tipo === "fundo")!;

    const result = insertDesignHoleWithCavilhaPairing(
      box,
      lateralLe.id,
      "cavilha_10x30",
      90,
      50,
      "espessura"
    );

    const meshByPanelId = new Map<string, DesignPanelMeshRef>([
      [
        lateralLe.id,
        { panelId: lateralLe.id, panelType: "left", widthM: 0.481, heightM: 0.682, matrix: IDENTITY_MATRIX },
      ],
      [
        fundo.id,
        { panelId: fundo.id, panelType: "bottom", widthM: 0.562, heightM: 0.481, matrix: IDENTITY_MATRIX },
      ],
    ]);

    const segments = collectPairedHoleLineSegments(result.box, meshByPanelId);
    expect(segments).toHaveLength(1);
    expect(segments[0].from.x).not.toBe(segments[0].to.x);

    const floats = pairedSegmentsToFloat32Array(segments);
    expect(floats.length).toBe(6);
  });
});
