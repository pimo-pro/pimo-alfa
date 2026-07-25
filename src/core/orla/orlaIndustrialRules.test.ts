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
  it("costa do modulo nunca recebe orla; gavetas tambem sem orla", () => {
    expect(isCostaPieceTipo("costa")).toBe(true);
    expect(isCostaPieceTipo("COSTA")).toBe(true);
    expect(resolveOrlaSidesForPieceTipo("costa")).toEqual([]);
    expect(isCostaPieceTipo("gav_costa")).toBe(false);
    expect(isCostaPieceTipo("gaveta_traseira")).toBe(false);
    expect(resolveOrlaSidesForPieceTipo("gav_costa")).toEqual([]);
    expect(resolveOrlaSidesForPieceTipo("gaveta_traseira")).toEqual([]);
  });

  it("estrutura / gavetas / remates: sem orla (so portas)", () => {
    expect(resolveOrlaSidesForPieceTipo("gav_frent_int")).toEqual([]);
    expect(resolveOrlaSidesForPieceTipo("gav_lat_dir")).toEqual([]);
    expect(resolveOrlaSidesForPieceTipo("lateral_esquerda")).toEqual([]);
    expect(resolveOrlaSidesForPieceTipo("separador")).toEqual([]);
    expect(resolveOrlaSidesForPieceTipo("div")).toEqual([]);
    expect(resolveOrlaSidesForPieceTipo("cima")).toEqual([]);
    expect(resolveOrlaSidesForPieceTipo("fundo")).toEqual([]);
    expect(resolveOrlaSidesForPieceTipo("remate")).toEqual([]);
    expect(resolveOrlaSidesForPieceTipo("rodape")).toEqual([]);
    expect(resolveOrlaSidesForPieceTipo("frente_fixa")).toEqual([]);
    expect(resolveOrlaSidesForPieceTipo("gaveta_frente")).toEqual([]);
    expect(resolveOrlaSidesForPieceTipo("prateleira")).toEqual([]);
  });

  it("porta simples: 4 lados", () => {
    expect(resolveOrlaSidesForPieceTipo("porta_simples")).toEqual([
      "front",
      "back",
      "left",
      "right",
    ]);
  });

  it("porta dupla: sem aresta de encontro (ESQ sem right, DIR sem left)", () => {
    expect(resolveOrlaSidesForPieceTipo("porta_dupla", { hingeSide: "left" })).toEqual([
      "front",
      "back",
      "left",
    ]);
    expect(resolveOrlaSidesForPieceTipo("porta_dupla", { hingeSide: "right" })).toEqual([
      "front",
      "back",
      "right",
    ]);
    expect(resolveOrlaSidesForPieceTipo("porta_dupla", { doorsLayerIndex: 0 })).toEqual([
      "front",
      "back",
      "left",
    ]);
    expect(resolveOrlaSidesForPieceTipo("porta", { nome: "PORT_ESQ" })).toEqual([
      "front",
      "back",
      "left",
    ]);
    expect(resolveOrlaSidesForPieceTipo("porta", { nome: "PORT_DIR" })).toEqual([
      "front",
      "back",
      "right",
    ]);
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
