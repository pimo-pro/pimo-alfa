import { describe, expect, it } from "vitest";
import type { TechnicalDrillHole } from "../../core/types";
import { getHole2DLocalPosition } from "./DrillGeometryBuilder";

describe("getHole2DLocalPosition — laterais DIV/SEP", () => {
  const panelWidth = 0.536;
  const panelHeight = 0.682;
  const centerYMm = 360;

  function lateralHole(tipo: "cavilha" | "parafuso"): TechnicalDrillHole {
    return {
      x: 60,
      y: centerYMm,
      diametro: tipo === "cavilha" ? 10 : 5,
      profundidade: tipo === "cavilha" ? 13 : 19,
      tipo,
      face: "direita",
    };
  }

  it("cavilha e parafuso na lateral esquerda partilham o mesmo Y local", () => {
    const cav = getHole2DLocalPosition("left", panelWidth, panelHeight, lateralHole("cavilha"));
    const par = getHole2DLocalPosition("left", panelWidth, panelHeight, lateralHole("parafuso"));
    expect(par.b).toBeCloseTo(cav.b, 6);
  });

  it("cavilha e parafuso na lateral direita partilham o mesmo Y local", () => {
    const cav = getHole2DLocalPosition("right", panelWidth, panelHeight, lateralHole("cavilha"));
    const par = getHole2DLocalPosition("right", panelWidth, panelHeight, lateralHole("parafuso"));
    expect(par.b).toBeCloseTo(cav.b, 6);
  });
});
