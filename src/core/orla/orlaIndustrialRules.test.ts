import { describe, it, expect } from "vitest";
import {
  buildPieceOrlaConfigForTipo,
  formatOrlaRefForPdf,
  isCostaPieceTipo,
  MIN_ORLA_PANEL_THICKNESS_MM,
  pieceAllowsOrlaByThickness,
  resolveOrlaSidesForPieceTipo,
  stripMaterialThicknessLabel,
} from "./orlaIndustrialRules";

describe("orlaIndustrialRules", () => {
  it("costa do modulo nunca recebe orla; gav_costa / gaveta_traseira e so topo", () => {
    expect(isCostaPieceTipo("costa")).toBe(true);
    expect(isCostaPieceTipo("COSTA")).toBe(true);
    expect(resolveOrlaSidesForPieceTipo("costa")).toEqual([]);
    expect(isCostaPieceTipo("gav_costa")).toBe(false);
    expect(isCostaPieceTipo("gaveta_traseira")).toBe(false);
    expect(resolveOrlaSidesForPieceTipo("gav_costa")).toEqual(["front"]);
    expect(resolveOrlaSidesForPieceTipo("gaveta_traseira")).toEqual(["front"]);
  });

  it("gav_frent_int e laterais de gaveta: so topo (front)", () => {
    expect(resolveOrlaSidesForPieceTipo("gav_frent_int")).toEqual(["front"]);
    expect(resolveOrlaSidesForPieceTipo("gaveta_frente_int")).toEqual(["front"]);
    expect(resolveOrlaSidesForPieceTipo("gav_lat_dir")).toEqual(["front"]);
    expect(resolveOrlaSidesForPieceTipo("gav_lat_esq")).toEqual(["front"]);
    expect(resolveOrlaSidesForPieceTipo("gaveta_lat_dir")).toEqual(["front"]);
    expect(resolveOrlaSidesForPieceTipo("gaveta_lat_esq")).toEqual(["front"]);
  });

  it("laterais/sep/div: frente e tras", () => {
    expect(resolveOrlaSidesForPieceTipo("lateral_esquerda")).toEqual(["front", "back"]);
    expect(resolveOrlaSidesForPieceTipo("separador")).toEqual(["front", "back"]);
    expect(resolveOrlaSidesForPieceTipo("divisoria")).toEqual(["front", "back"]);
    expect(resolveOrlaSidesForPieceTipo("div")).toEqual(["front", "back"]);
  });

  it("porta / prateleira / frente_fixa / remate / cima / fundo / frente gaveta: 4 lados", () => {
    expect(resolveOrlaSidesForPieceTipo("porta_simples")).toEqual(["front", "back", "left", "right"]);
    expect(resolveOrlaSidesForPieceTipo("prateleira")).toEqual(["front", "back", "left", "right"]);
    expect(resolveOrlaSidesForPieceTipo("frente_fixa")).toEqual(["front", "back", "left", "right"]);
    expect(resolveOrlaSidesForPieceTipo("remate")).toEqual(["front", "back", "left", "right"]);
    expect(resolveOrlaSidesForPieceTipo("remate_l")).toEqual(["front", "back", "left", "right"]);
    expect(resolveOrlaSidesForPieceTipo("rodape")).toEqual(["front", "back", "left", "right"]);
    expect(resolveOrlaSidesForPieceTipo("cima")).toEqual(["front", "back", "left", "right"]);
    expect(resolveOrlaSidesForPieceTipo("fundo")).toEqual(["front", "back", "left", "right"]);
    expect(resolveOrlaSidesForPieceTipo("gaveta_frente")).toEqual(["front", "back", "left", "right"]);
  });

  it("espessura < 16 mm nao permite orla; costa sempre bloqueada", () => {
    expect(MIN_ORLA_PANEL_THICKNESS_MM).toBe(16);
    expect(pieceAllowsOrlaByThickness(10)).toBe(false);
    expect(pieceAllowsOrlaByThickness(16)).toBe(true);
    expect(buildPieceOrlaConfigForTipo("porta_simples", "p1", undefined, 10)).toBeNull();
    expect(buildPieceOrlaConfigForTipo("costa", "p1", undefined, 19)).toBeNull();
  });

  it("buildPieceOrlaConfigForTipo e helpers PDF", () => {
    expect(buildPieceOrlaConfigForTipo("costa", "p1")).toBeNull();
    const cfg = buildPieceOrlaConfigForTipo("porta_simples", "branco_pvc_08_23mm", undefined, 19);
    expect(cfg?.sides.front.enabled).toBe(true);
    expect(stripMaterialThicknessLabel("MDF Branco 19mm")).toBe("MDF Branco");
    expect(stripMaterialThicknessLabel("MDF Branco 19")).toBe("MDF Branco");
    expect(formatOrlaRefForPdf("Branco PVC", 0.8, 23)).toBe("Branco PVC 0.8mm");
    expect(formatOrlaRefForPdf("Branco PVC 0.8\u00d723 mm", 0.8, 23)).toBe("Branco PVC 0.8mm");
  });
});
