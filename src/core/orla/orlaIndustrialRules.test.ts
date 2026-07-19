import { describe, it, expect } from "vitest";
import {
  buildPieceOrlaConfigForTipo,
  formatOrlaRefForPdf,
  isCostaPieceTipo,
  resolveOrlaSidesForPieceTipo,
  stripMaterialThicknessLabel,
} from "./orlaIndustrialRules";

describe("orlaIndustrialRules", () => {
  it("costa do modulo nunca recebe orla; gav_costa e so topo", () => {
    expect(isCostaPieceTipo("costa")).toBe(true);
    expect(isCostaPieceTipo("COSTA")).toBe(true);
    expect(resolveOrlaSidesForPieceTipo("costa")).toEqual([]);
    expect(isCostaPieceTipo("gav_costa")).toBe(false);
    expect(resolveOrlaSidesForPieceTipo("gav_costa")).toEqual(["front"]);
  });

  it("gav_frent_int e laterais de gaveta: so topo (front)", () => {
    expect(resolveOrlaSidesForPieceTipo("gav_frent_int")).toEqual(["front"]);
    expect(resolveOrlaSidesForPieceTipo("gav_lat_dir")).toEqual(["front"]);
    expect(resolveOrlaSidesForPieceTipo("gav_lat_esq")).toEqual(["front"]);
  });

  it("laterais/sep/div: frente e tras", () => {
    expect(resolveOrlaSidesForPieceTipo("lateral_esquerda")).toEqual(["front", "back"]);
    expect(resolveOrlaSidesForPieceTipo("separador")).toEqual(["front", "back"]);
    expect(resolveOrlaSidesForPieceTipo("divisoria")).toEqual(["front", "back"]);
  });

  it("porta / prateleira / frente_fixa / remate: 4 lados", () => {
    expect(resolveOrlaSidesForPieceTipo("porta_simples")).toEqual(["front", "back", "left", "right"]);
    expect(resolveOrlaSidesForPieceTipo("prateleira")).toEqual(["front", "back", "left", "right"]);
    expect(resolveOrlaSidesForPieceTipo("frente_fixa")).toEqual(["front", "back", "left", "right"]);
    expect(resolveOrlaSidesForPieceTipo("remate")).toEqual(["front", "back", "left", "right"]);
    expect(resolveOrlaSidesForPieceTipo("rodape")).toEqual(["front", "back", "left", "right"]);
  });

  it("buildPieceOrlaConfigForTipo e helpers PDF", () => {
    expect(buildPieceOrlaConfigForTipo("costa", "p1")).toBeNull();
    const cfg = buildPieceOrlaConfigForTipo("porta_simples", "branco_pvc_08_23mm");
    expect(cfg?.sides.front.enabled).toBe(true);
    expect(stripMaterialThicknessLabel("MDF Branco 19mm")).toBe("MDF Branco");
    expect(formatOrlaRefForPdf("Branco PVC", 0.8, 23)).toBe("Branco PVC 0.8mm 23mm");
  });
});
